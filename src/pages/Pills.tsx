// src/pages/Pills.tsx
// Wave 10: Pills completed agora são clicáveis (modo "revisitar")
// - Pill done: cor terracota sutil + sufixo "revisitar" (sem line-through)
// - Click leva pra /pill/{id} — PillFlow detecta eco_text e entra em reviewMode
//
// Refactor B-S5.D.5: empty message no topo (já estava), copy atualizada
// pra "escolha uma pill para começar." (mais natural quando user já está em Pills).
// Lista de pills agora flui do topo (não mais centralizada) — voz sistema
// e conteúdo sempre no topo da tela (regra ONB-7 §1.7 estendida).

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useShell } from "@/hooks/useShell";
import EmptyStateMessage from "@/components/EmptyStateMessage";
import { track } from "@/lib/analytics";

type PillId = "PI" | "PII" | "PIII" | "PIV" | "PV" | "PVI";

const PILL_ORDER: PillId[] = ["PI", "PII", "PIII", "PIV", "PV", "PVI"];

const PILL_TENSAO: Record<PillId, string> = {
  PI:   "Eu ↔ Pertencimento",
  PII:  "Eu ↔ Papel",
  PIII: "Presença ↔ Distância",
  PIV:  "Clareza ↔ Ação",
  PV:   "Dentro ↔ Fora",
  PVI:  "Movimento ↔ Pausa",
};

export default function Pills() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromFlow = !!(location.state as { fromFlow?: boolean } | null)?.fromFlow;
  const [pillsDone, setPillsDone] = useState<Set<PillId>>(new Set());
  const [loading, setLoading] = useState(true);

  useShell({ section: "pills", active: "pills" });

  // Cascade: lista entra com fade após voz sistema digitar.
  // Sem flow: 2700ms (espera voz própria da página).
  // Com flow: 2000ms (entra durante o "hold" do hint, coexiste, depois hint some).
  const [listVisible, setListVisible] = useState(false);
  useEffect(() => {
    const delay = fromFlow ? 2000 : 2700;
    const t = window.setTimeout(() => setListVisible(true), delay);
    return () => window.clearTimeout(t);
  }, [fromFlow]);

  useEffect(() => { loadCycle(); }, []);

  async function loadCycle() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: cycle } = await supabase
        .from("ipe_cycles")
        .select("id, pills_completed, status")
        .eq("user_id", session.user.id)
        .in("status", ["pills", "questionnaire", "complete"])
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cycle) { setLoading(false); return; }

      // Wave 10: detecta Pills completed via eco_text != NULL (mais confiável que pills_completed array)
      const { data: responses } = await supabase
        .from("pill_responses")
        .select("pill_id, eco_text")
        .eq("ipe_cycle_id", cycle.id)
        .not("eco_text", "is", null);

      // Single source of truth: Pill done = eco_text presente.
      // Não usa pills_completed array (pode estar desatualizado se ipe-eco falhou).
      const doneSet = new Set<PillId>(
        (responses ?? [])
          .filter(r => r.eco_text && r.eco_text.length > 0)
          .map(r => r.pill_id as PillId)
      );
      setPillsDone(doneSet);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const allDone = PILL_ORDER.every(p => pillsDone.has(p));

  return (
    <>
      {/* Empty canvas message — topo. Se veio do flow, o hint já foi dito no FlowVoice. */}
      {!fromFlow && !loading && pillsDone.size === 0 && (
        <EmptyStateMessage
          text="escolha uma pill para começar."
          contextKey="pills_first_visit"
          onAction={() => navigate("/pill/PI")}
        />
      )}

      {/* Pill list — cascade após voz sistema (~2700ms) */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "16px 24px 0",
        opacity: listVisible ? 1 : 0,
        transition: "opacity 500ms ease-in",
      }}>
        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {PILL_ORDER.map(pill => {
              const done = pillsDone.has(pill);
              return (
                <div
                  key={pill}
                  onClick={() => {
                    track("pill_clicked_from_list", { pill_id: pill, is_review: done });
                    navigate(`/pill/${pill}`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                >
                  <div style={{
                    width: 1,
                    height: 12,
                    background: done ? "var(--r-telha)" : "var(--r-muted)",
                    opacity: done ? 0.5 : 1,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "var(--r-font-sys)",
                    fontWeight: 300,
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: done ? "var(--r-telha)" : "var(--r-sub)",
                    opacity: done ? 0.7 : 1,
                  }}>
                    {PILL_TENSAO[pill]}
                    {done && (
                      <span style={{
                        fontWeight: 300,
                        fontStyle: "italic",
                        marginLeft: 6,
                        opacity: 0.6,
                      }}>· revisitar</span>
                    )}
                  </span>
                </div>
              );
            })}

            {allDone && (
              <div
                onClick={() => {
                  track("pills_continue_to_questionnaire");
                  navigate("/questionnaire");
                }}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 12 }}
              >
                <div style={{ width: 1, height: 14, background: "var(--r-telha)", flexShrink: 0 }} />
                <span style={{
                  fontFamily: "var(--r-font-sys)",
                  fontWeight: 300,
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--r-text)",
                }}>
                  continuar para o questionário
                </span>
              </div>
            )}
          </div>
        )}
      </div>

    </>
  );
}
