import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

type PillId = "PI" | "PII" | "PIII" | "PIV" | "PV" | "PVI";
const ALL_PILLS: PillId[] = ["PI", "PII", "PIII", "PIV", "PV", "PVI"];
const PILL_TENSAO: Record<PillId, string> = {
  PI: "I ↔ Belonging",
  PII: "I ↔ Role",
  PIII: "Presence ↔ Distance",
  PIV: "Clarity ↔ Action",
  PV: "Inside ↔ Outside",
  PVI: "Movement ↔ Pause",
};

export default function Home() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | null>(null);
  const [pillsDone, setPillsDone] = useState<PillId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load() }, []);

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const query = (supabase.from('ipe_cycles') as any)
        .select('status, pills_completed')
        .in('status', ['pills', 'questionnaire', 'complete'])
        .order('cycle_number', { ascending: false })
        .limit(1);
      if (session?.user?.id) query.eq('user_id', session.user.id);
      const { data: cycle } = await query.maybeSingle();
      if (cycle) {
        setStatus(cycle.status);
        setPillsDone(cycle.pills_completed ?? []);
      }
    } catch {}
    setLoading(false);
  }

  const allPillsDone = ALL_PILLS.every(p => pillsDone.includes(p));

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
        {loading ? null : (
          <>
            {ALL_PILLS.map((p) => {
              const done = pillsDone.includes(p);
              return (
                <div
                  key={p}
                  className="r-list-item"
                  onClick={() => !done && navigate(`/pill/${p}`)}
                  style={{ marginBottom: 12, cursor: done ? "default" : "pointer", opacity: done ? 0.4 : 1 }}
                >
                  <div className={`r-list-bar${done ? " done" : ""}`} />
                  <span className="r-list-label">{PILL_TENSAO[p]}</span>
                </div>
              );
            })}
            {allPillsDone && (
              <div
                className="r-list-item"
                onClick={() => navigate("/questionnaire")}
                style={{ marginTop: 24, cursor: "pointer" }}
              >
                <div className="r-list-bar done" />
                <span className="r-list-label" style={{ color: "var(--r-accent)", fontWeight: 400 }}>
                  begin reading
                </span>
              </div>
            )}
          </>
        )}
      </div>
      <div className="r-line" />
      <div className="r-nav">
        {(["pills", "context", "reed"] as const).map((tab) => (
          <span
            key={tab}
            className={`r-nav-item${tab === "pills" ? " active" : ""}`}
            onClick={() => {
              if (tab === "context") navigate("/context");
              if (tab === "reed") navigate("/reed");
            }}
          >{tab}</span>
        ))}
        <div className="r-nav-dot" onClick={() => navigate("/settings")} />
      </div>
    </div>
  );
}
