// src/hooks/useHomeGuide.ts
// Modo guiado marco-driven na Home (B-S5.G3 + B-S5.H1 light)
//
// Detecta marco atual baseado em user_onboarding_state + ipe_cycles.
// Compara com último marco visto (localStorage). Se há marco novo (não visto), retorna
// frase + destino do pulse. Marca como visto após 3s de exibição.
//
// Catálogo provisório (B-S5.H1 light, sem Bruno) — 4 marcos × 1 frase. Refinar em
// sessão conjunta com Bruno depois (variações sorteadas, mais marcos, etc).

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SEQUENCE = ["onboarding", "first_pill", "all_pills", "questionnaire"] as const;
type Marco = typeof SEQUENCE[number];

interface CatalogEntry {
  frase: string;
  target?: string;
  targets?: string[];
  perTargetMs?: number;
}

const CATALOG: Record<Marco, CatalogEntry> = {
  onboarding: {
    frase: "comece por onde pisca.",
    targets: ["nav-reed", "nav-pills", "nav-questionnaire"],
    perTargetMs: 2200,
  },
  first_pill: {
    frase: "converse com reed.",
    target: "nav-reed",
  },
  all_pills: {
    frase: "abra o ciclo.",
    target: "nav-questionnaire",
  },
  questionnaire: {
    frase: "veja sua leitura.",
    target: "nav-context",
  },
};

const STORAGE_KEY = "rdwth_home_marco_seen";
const SEEN_DEBOUNCE_MS = 3000; // tempo até marcar como visto

export interface HomeGuide {
  marco: Marco;
  frase: string;
  target?: string;
  targets?: string[];
  perTargetMs?: number;
}

export default function useHomeGuide(): { guide: HomeGuide | null } {
  const [guide, setGuide] = useState<HomeGuide | null>(null);
  const seenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function detectMarco() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Onboarding state
        const { data: ob } = await (supabase
          .from("user_onboarding_state") as any)
          .select("warmup_completed_at")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // Sem warmup completo, não mostra modo guiado (warmup é o gate)
        if (!ob?.warmup_completed_at) {
          if (!cancelled) setGuide(null);
          return;
        }

        // Ciclo IPE atual
        const { data: cycle } = await supabase
          .from("ipe_cycles")
          .select("id, status, pills_completed")
          .eq("user_id", session.user.id)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let currentMarco: Marco | null = null;

        if (!cycle) {
          // Warmup feito mas sem ciclo ainda — onboarding completo
          currentMarco = "onboarding";
        } else {
          const pillsCount = ((cycle.pills_completed as string[] | null) ?? []).length;

          if (cycle.status === "complete") {
            currentMarco = "questionnaire";
          } else if (pillsCount >= 6) {
            currentMarco = "all_pills";
          } else if (pillsCount >= 1) {
            currentMarco = "first_pill";
          } else {
            currentMarco = "onboarding";
          }
        }

        if (cancelled) return;

        // Compara com último marco visto
        const seenMarco = (typeof window !== "undefined"
          ? (localStorage.getItem(STORAGE_KEY) as Marco | null)
          : null);
        const currentIdx = currentMarco ? SEQUENCE.indexOf(currentMarco) : -1;
        const seenIdx = seenMarco ? SEQUENCE.indexOf(seenMarco) : -1;

        if (currentMarco && currentIdx > seenIdx) {
          // Marco novo — mostra
          const cat = CATALOG[currentMarco];
          setGuide({
            marco: currentMarco,
            frase: cat.frase,
            target: cat.target,
            targets: cat.targets,
            perTargetMs: cat.perTargetMs,
          });
        } else {
          setGuide(null);
        }
      } catch (err) {
        console.warn("[useHomeGuide] error:", err);
        if (!cancelled) setGuide(null);
      }
    }

    detectMarco();

    return () => {
      cancelled = true;
    };
  }, []);

  // Marca como visto após N segundos de exibição (debounce)
  useEffect(() => {
    if (!guide) return;
    if (seenTimerRef.current) clearTimeout(seenTimerRef.current);
    seenTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, guide.marco);
      } catch {
        // storage indisponível — silencioso
      }
    }, SEEN_DEBOUNCE_MS);
    return () => {
      if (seenTimerRef.current) clearTimeout(seenTimerRef.current);
    };
  }, [guide]);

  return { guide };
}
