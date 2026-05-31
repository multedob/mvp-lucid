// src/hooks/useHomeNotices.ts
// Avisos contextuais empilháveis na Home (Fix 2A + 2B da carta #6b).
//
// Voz do sistema, mesmo padrão do useHomeGuide. Diferença: notices são frases
// completas com CTA, não markers de pulse. Múltiplos podem aparecer ao mesmo
// tempo, empilhados em ordem.
//
// Aviso 1 (questionário pendente):
//   - completou ≥1 pílula no ciclo atual
//   - tem perguntas pendentes no questionário (remaining > 0)
//   - questionário não está marcado como completo
//   Copy dinâmico:
//     n == 1: "falta 1 pergunta pra fechar seu ciclo."
//     n >  1: "faltam {n} perguntas pra fechar seu ciclo."
//
// Aviso 2 (terceiros pendentes — 2º ciclo+):
//   - cycle_number >= 2
//   - < 2 third_party_invites submitted no ciclo atual
//   Copy: "a partir desse ciclo, você precisa da resposta de ao menos duas pessoas externas sobre você. ela te mostra o que você não vê sozinho."

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchQuestionnaireProgress } from "@/lib/questionnaireProgress";

export interface HomeNotice {
  id: "questionnaire_pending" | "third_party_pending";
  frase: string;
  ctaLabel: string;
  ctaPath: string;
}

export default function useHomeNotices(): { notices: HomeNotice[] } {
  const [notices, setNotices] = useState<HomeNotice[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: cycle } = await supabase
          .from("ipe_cycles")
          .select("id, status, cycle_number, pills_completed")
          .eq("user_id", session.user.id)
          .order("cycle_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cycle) {
          if (!cancelled) setNotices([]);
          return;
        }

        const next: HomeNotice[] = [];
        const pillsCount = ((cycle.pills_completed as string[] | null) ?? []).length;
        const questionnaireComplete = cycle.status === "complete";

        // ── Aviso 1 — questionário pendente ───────────────────────
        if (pillsCount >= 1 && !questionnaireComplete) {
          try {
            const progress = await fetchQuestionnaireProgress(cycle.id);
            const n = progress.remaining;
            if (n > 0) {
              const frase = n === 1
                ? "falta 1 pergunta pra fechar seu ciclo."
                : `faltam ${n} perguntas pra fechar seu ciclo.`;
              next.push({
                id: "questionnaire_pending",
                frase,
                ctaLabel: "ir pro questionário",
                ctaPath: "/questionnaire",
              });
            }
          } catch (err) {
            console.warn("[useHomeNotices] progress error:", err);
          }
        }

        // ── Aviso 2 — terceiros pendentes (2º ciclo+) ─────────────
        if ((cycle.cycle_number ?? 1) >= 2) {
          const { count } = await (supabase
            .from("third_party_invites") as any)
            .select("id", { count: "exact", head: true })
            .eq("ipe_cycle_id", cycle.id)
            .eq("status", "submitted");

          if ((count ?? 0) < 2) {
            next.push({
              id: "third_party_pending",
              frase:
                "a partir desse ciclo, você precisa da resposta de ao menos duas pessoas externas sobre você. ela te mostra o que você não vê sozinho.",
              ctaLabel: "convidar pessoa",
              ctaPath: "/terceiros",
            });
          }
        }

        if (!cancelled) setNotices(next);
      } catch (err) {
        console.warn("[useHomeNotices] error:", err);
        if (!cancelled) setNotices([]);
      }
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  return { notices };
}
