// src/pages/Pills.tsx
// Lista de pills com estado de ciclo
// Pills feitas → line-through + opacidade reduzida + não clicáveis
// Após as 6 feitas:
//   - status=questionnaire → "begin questionnaire" → /questionnaire
//   - status=complete      → "begin reading" → /reed

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

type PillId = "PI" | "PII" | "PIII" | "PIV" | "PV" | "PVI";
type CycleStatus = "pills" | "questionnaire" | "complete" | "abandoned";

const PILL_ORDER: PillId[] = ["PI", "PII", "PIII", "PIV", "PV", "PVI"];

const PILL_TENSAO: Record<PillId, string> = {
  PI:   "I ↔ Belonging",
  PII:  "I ↔ Role",
  PIII: "Presence ↔ Distance",
  PIV:  "Clarity ↔ Action",
  PV:   "Inside ↔ Outside",
  PVI:  "Movement ↔ Pause",
};

export default function Pills() {
  const navigate = useNavigate();
  const [pillsDone, setPillsDone] = useState<PillId[]>([]);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>("pills");
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
      if (cycle) {
        setPillsDone((cycle.pills_completed as PillId[]) ?? []);
        setCycleStatus(cycle.status as CycleStatus);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const allDone = PILL_ORDER.every(p => pillsDone.includes(p));

  // FIX: distinguir destino após pills concluídas
  // - questionnaire: pills prontas mas questionário pendente → /questionnaire
  // - complete: ciclo inteiro encerrado → /reed
  const allDoneLabel = cycleStatus === "complete" ? "begin reading" : "begin questionnaire";
  const allDonePath  = cycleStatus === "complete" ? "/reed" : "/questionnaire";

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label">_rdwth · pills</span>
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
                onClick={() => navigate(allDonePath)}
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
                  {allDoneLabel}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav bottom */}
      <div className="r-line" />
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 24px", gap: 28, flexShrink: 0 }}>
        {[
          { label: "pills",   path: "/pills",   active: true },
          { label: "context", path: "/context", active: false },
          { label: "reed",    path: "/reed",    active: false },
        ].map(({ label, path, active }) => (
          <span
            key={label}
            onClick={() => navigate(path)}
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: active ? 400 : 300,
              fontSize: 11,
              color: active ? "var(--r-accent)" : "var(--r-muted)",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            {label}
          </span>
        ))}
        <div
          onClick={() => navigate("/settings")}
          style={{
            marginLeft: "auto",
            width: 6,
            height: 6,
            borderRadius: "50%",
            border: "1px solid var(--r-ghost)",
            background: "transparent",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
      </div>

    </div>
  );
}
