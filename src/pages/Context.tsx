// src/pages/Context.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

type PillId = "PI" | "PII" | "PIII" | "PIV" | "PV" | "PVI";

interface Cycle {
  id: string;
  cycle_number: number;
  status: string;
  started_at: string;
  pills_completed: PillId[];
}

interface PillEco {
  pill_id: PillId;
  eco_text: string | null;
  completed_at: string | null;
}

const PILL_TENSAO: Record<PillId, string> = {
  PI:   "I ↔ Belonging",
  PII:  "I ↔ Role",
  PIII: "Presence ↔ Distance",
  PIV:  "Clarity ↔ Action",
  PV:   "Inside ↔ Outside",
  PVI:  "Movement ↔ Pause",
};

const ALL_PILLS: PillId[] = ["PI", "PII", "PIII", "PIV", "PV", "PVI"];

export default function Context() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [ecos, setEcos] = useState<PillEco[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      setUserName((session.user.email || "").split("@")[0]);

      const { data: cycleData } = await supabase
        .from("ipe_cycles")
        .select("id, cycle_number, status, started_at, pills_completed")
        .eq("user_id", session.user.id)
        .order("cycle_number", { ascending: false });

      if (cycleData && cycleData.length > 0) {
        setCycles(cycleData as Cycle[]);
        setSelectedCycle(cycleData[0] as Cycle);
        await loadEcos(cycleData[0].id);
      }
    } catch (err) {
      console.error("Context loadData:", err);
    }
    setLoading(false);
  };

  const loadEcos = async (cycleId: string) => {
    try {
      const { data } = await supabase
        .from("pill_responses")
        .select("pill_id, eco_text, completed_at")
        .eq("ipe_cycle_id", cycleId)
        .not("eco_text", "is", null)
        .order("completed_at", { ascending: true });
      setEcos((data || []) as PillEco[]);
    } catch (err) {
      console.error("loadEcos:", err);
    }
  };

  const selectCycle = async (cycle: Cycle) => {
    setSelectedCycle(cycle);
    setEcos([]);
    await loadEcos(cycle.id);
  };

  const pillsDone = selectedCycle?.pills_completed || [];

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth · context</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "24px 24px 0" }}>
        {loading ? (
          <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-ghost)", letterSpacing: "0.06em" }}>···</div>
        ) : cycles.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-muted)", letterSpacing: "0.06em", lineHeight: 1.8 }}>
              complete your first pill<br />to see your reading here.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 8 }} onClick={() => navigate("/home")}>
              <div style={{ width: 1, height: 12, background: "var(--r-accent)" }} />
              <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-text)", letterSpacing: "0.06em" }}>start a pill</span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* nome + ciclos */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 400, fontSize: 11, color: "var(--r-text)", letterSpacing: "0.06em" }}>{userName}</div>
              <div style={{ display: "flex", gap: 16 }}>
                {cycles.map(c => (
                  <span key={c.id} onClick={() => selectCycle(c)} style={{
                    fontFamily: "var(--r-font-sys)",
                    fontWeight: selectedCycle?.id === c.id ? 400 : 300,
                    fontSize: 11,
                    color: selectedCycle?.id === c.id ? "var(--r-accent)" : "var(--r-muted)",
                    letterSpacing: "0.06em",
                    borderBottom: selectedCycle?.id === c.id ? "1px solid var(--r-accent)" : "1px solid transparent",
                    paddingBottom: 2, cursor: "pointer",
                  }}>
                    {"C" + String(c.cycle_number)}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ height: "0.5px", background: "var(--r-ghost)", opacity: 0.3 }} />

            {/* pills */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-ghost)", letterSpacing: "0.12em", marginBottom: 4 }}>pills</div>
              {ALL_PILLS.map(pid => {
                const done = pillsDone.includes(pid);
                const eco = ecos.find(e => e.pill_id === pid);
                return (
                  <div key={pid} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="r-list-item" onClick={() => !done && navigate(`/pill/${pid}`)} style={{ cursor: done ? "default" : "pointer" }}>
                      <div className={`r-list-bar${done ? " done" : ""}`} />
                      <span className={`r-list-label${done ? " active" : ""}`}>{PILL_TENSAO[pid]}</span>
                    </div>
                    {eco?.eco_text && (
                      <div style={{ paddingLeft: 22 }}>
                        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.14em", opacity: 0.6, marginBottom: 4 }}>REED ·</div>
                        <div style={{
                          fontFamily: "var(--r-font-ed)", fontWeight: 300, fontSize: 12,
                          color: "var(--r-dim)", lineHeight: 1.7,
                          display: "-webkit-box", WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}>{eco.eco_text}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {ecos.length > 0 && (
              <>
                <div style={{ height: "0.5px", background: "var(--r-ghost)", opacity: 0.3 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingBottom: 8 }} onClick={() => navigate("/reed")}>
                  <div style={{ width: 1, height: 12, background: "var(--r-accent)" }} />
                  <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-text)", letterSpacing: "0.06em" }}>talk to reed</span>
                </div>
              </>
            )}
            <div style={{ height: 16 }} />
          </div>
        )}
      </div>

      <div className="r-line" />
      <div className="r-nav">
        {(["pills", "context", "reed"] as const).map(tab => (
          <span key={tab} className={`r-nav-item${tab === "context" ? " active" : ""}`}
            onClick={() => { if (tab === "pills") navigate("/home"); if (tab === "reed") navigate("/reed"); }}>
            {tab}
          </span>
        ))}
        <div className="r-nav-dot" />
      </div>
    </div>
  );
}
