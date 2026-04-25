// src/pages/Pills.tsx
// Lista de pills com estado de ciclo
// Pills feitas → line-through + opacidade reduzida + não clicáveis
// Após as 6 feitas → "begin questionnaire" com barra accent → /questionnaire

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";
import NavBottom from "@/components/NavBottom";

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
  const [pillsDone, setPillsDone] = useState<PillId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCycle(); }, []);

  async function loadCycle() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: cycle } = await supabase
        .from("ipe_cycles")
        .select("pills_completed, status")
        .eq("user_id", session.user.id)
        .in("status", ["pills", "questionnaire", "complete"])
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cycle) setPillsDone((cycle.pills_completed as PillId[]) ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const allDone = PILL_ORDER.every(p => pillsDone.includes(p));

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>_rdwth</span> · pills</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Pill list */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {PILL_ORDER.map(pill => {
              const done = pillsDone.includes(pill);
              return (
                <div
                  key={pill}
                  onClick={() => !done && navigate(`/pill/${pill}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: done ? "default" : "pointer",
                    opacity: done ? 0.35 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <div style={{
                    width: 1,
                    height: 12,
                    background: done ? "var(--r-ghost)" : "var(--r-muted)",
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "var(--r-font-sys)",
                    fontWeight: 300,
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: done ? "var(--r-ghost)" : "var(--r-sub)",
                    textDecoration: done ? "line-through" : "none",
                  }}>
                    {PILL_TENSAO[pill]}
                  </span>
                </div>
              );
            })}

            {allDone && (
              <div
                onClick={() => navigate("/questionnaire")}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 12 }}
              >
                <div style={{ width: 1, height: 14, background: "var(--r-accent)", flexShrink: 0 }} />
                <span style={{
                  fontFamily: "var(--r-font-sys)",
                  fontWeight: 300,
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--r-text)",
                }}>
                  begin questionnaire
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <NavBottom active="pills" />

    </div>
  );
}
