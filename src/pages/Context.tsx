// src/pages/Context.tsx
// Subviews inline (sem rotas separadas):
//   → ContextCycle  — leitura salva de ciclo individual
//   → ContextDeep   — deep reading do ciclo
//   → ContextSystem — "How _rdwth works"

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

// ─── Nav bottom compartilhado ─────────────────────────────────────
function NavBottom({ active }: { active: "pills" | "context" | "reed" }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="r-line" />
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 24px", gap: 28, flexShrink: 0 }}>
        {[
          { label: "pills",   path: "/pills" },
          { label: "context", path: "/context" },
          { label: "reed",    path: "/reed" },
        ].map(({ label, path }) => (
          <span
            key={label}
            onClick={() => navigate(path)}
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: label === active ? 400 : 300,
              fontSize: 11,
              color: label === active ? "var(--r-accent)" : "var(--r-muted)",
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
            marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
            border: "1px solid var(--r-ghost)", background: "transparent",
            cursor: "pointer", flexShrink: 0,
          }}
        />
      </div>
    </>
  );
}

// ─── ContextSystem — "How _rdwth works" ──────────────────────────
function ContextSystem({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const ITEMS = [
    {
      label: "What this is",
      text: ["_rdwth maps structural patterns in how you organize experience. Not who you are — how you currently organize."],
    },
    {
      label: "Reading",
      text: ["Each cycle produces a structural reading based on your responses. The reading describes predominant patterns — not identity, not diagnosis, not direction."],
    },
    {
      label: "Cycles",
      text: ["A cycle is a complete set of responses. Each cycle is independent. Over time, recurring patterns become visible. Recurrence is observed, not prescribed."],
    },
    {
      label: "Provisional nature",
      text: ["A single reading is a hypothesis, not a conclusion. It becomes more legible over time."],
    },
    {
      label: "Why language, not numbers",
      text: ["Numbers don't add clarity here — they add noise. The interface shows language because structural patterns read better as words than as scores."],
    },
    {
      label: "Reed",
      text: [
        "Reed translates structural output into language. He does not improvise — responses are derived from the structural reading of your cycle, not from your raw responses.",
        "He draws on a curated library of works in psychology, philosophy, and organizational theory. He does not access the internet. He does not generate opinion.",
      ],
    },
    {
      label: "No direction",
      text: ["The system does not suggest what to do with what it shows. The reading belongs to you. The interpretation belongs to you."],
    },
  ];

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>_rdwth</span> · system</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.12em" }}>
          How this works
        </div>

        {ITEMS.map(item => (
          <div key={item.label} style={{ borderLeft: "1px solid var(--r-ghost)", paddingLeft: 16 }}>
            <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 400, fontSize: 10, color: "var(--r-sub)", letterSpacing: "0.1em", marginBottom: 8 }}>
              {item.label}
            </div>
            {item.text.map((p, i) => (
              <div key={i} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-dim)", lineHeight: 1.7, letterSpacing: "0.03em", marginBottom: i < item.text.length - 1 ? 10 : 0 }}>
                {p}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
        <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)" }}>|</span>
        <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)", letterSpacing: "0.08em" }}>Context</span>
      </div>
    </div>
  );
}

// ─── ContextCycle — leitura salva ────────────────────────────────
function ContextCycle({ cycle, onBack }: { cycle: CycleData; onBack: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>_rdwth</span> · context · {cycle.id}</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.12em" }}>
          {cycle.id} — saved reading
        </div>
        <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16, lineHeight: 1.7, color: "var(--r-text)" }}>
          {cycle.description}
        </div>
        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.5 }} />
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.7 }}>
          Esta é uma leitura estrutural de um momento. Não define quem você é.
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
        <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)" }}>|</span>
        <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)", letterSpacing: "0.08em" }}>Context</span>
      </div>
    </div>
  );
}

// ─── ContextDeep — deep reading ──────────────────────────────────
function ContextDeep({ cycle, onBack }: { cycle: CycleData; onBack: () => void }) {
  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth · context · {cycle.id}</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.12em" }}>
          {cycle.id} — deep reading
        </div>
        <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16, lineHeight: 1.7, color: "var(--r-text)" }}>
          {cycle.deep}
        </div>
        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.5 }} />
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.7 }}>
          Esta é uma leitura estrutural de um momento. Não define quem você é.
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
        <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)" }}>|</span>
        <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)", letterSpacing: "0.08em" }}>Context</span>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────
interface CycleData {
  id: string;
  cycleNumber: number;
  description: string;
  deep: string;
}

// ─── Context principal ────────────────────────────────────────────
export default function Context() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showDeep, setShowDeep] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [showCycle, setShowCycle] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCycles(); }, []);

  async function loadCycles() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      // Buscar ciclos IPE completos
      const { data: ipeCycles } = await supabase
        .from("ipe_cycles")
        .select("id, cycle_number, status")
        .eq("user_id", session.user.id)
        .in("status", ["pills", "complete", "questionnaire"])
        .order("cycle_number", { ascending: true });

      if (!ipeCycles || ipeCycles.length === 0) { setLoading(false); return; }

      // Para cada ciclo, buscar o llm_response do ciclo HAGO correspondente
      const cycleData: CycleData[] = await Promise.all(
        ipeCycles.map(async (ipe) => {
          const { data: hagoCycle } = await (supabase as any)
            .from("cycles")
            .select("llm_response")
            .eq("ipe_cycle_id", ipe.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const text = hagoCycle?.llm_response ?? "";
          // Dividir em leitura curta (primeiros 2 parágrafos) e deep (resto)
          const paragraphs = text.split("\n\n").filter(Boolean);
          const hasPending = !text;
const description = hasPending
  ? "Leitura disponível após o questionário."
  : paragraphs.slice(0, 2).join("\n\n");
const deep = hasPending
  ? "Complete o questionário para ver a leitura profunda."
  : paragraphs.length > 2
    ? paragraphs.slice(2).join("\n\n")
    : paragraphs.join("\n\n");
          return {
            id: `C${ipe.cycle_number}`,
            cycleNumber: ipe.cycle_number,
            description,
            deep,
          };
        })
      );

      setCycles(cycleData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Subviews
  if (showSystem) return <ContextSystem onBack={() => setShowSystem(false)} />;
  if (showDeep && cycles[selectedIdx]) return <ContextDeep cycle={cycles[selectedIdx]} onBack={() => setShowDeep(false)} />;
  if (showCycle && cycles[selectedIdx]) return <ContextCycle cycle={cycles[selectedIdx]} onBack={() => setShowCycle(false)} />;

  // Empty state
  if (!loading && cycles.length === 0) return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth · context</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px 40px" }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)", letterSpacing: "0.06em", lineHeight: 1.8 }}>
          No readings yet.<br />Complete a questionnaire to begin.
        </div>
      </div>
      <NavBottom active="context" />
    </div>
  );

  const cycle = cycles[selectedIdx];

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span
          onClick={() => navigate("/home")}
          style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-muted)", letterSpacing: "0.08em", cursor: "pointer" }}
        >
          _rdwth · context
        </span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Conteúdo principal */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 16px", overflow: "hidden" }}>

        {/* TOP — leitura atual */}
        {cycle && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.6, marginBottom: 14 }}>
              Esta é uma leitura estrutural de um momento. Não define quem você é.
            </div>
            <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.4, marginBottom: 14 }} />

            {/* Descrição — scroll interno */}
            <div style={{ overflowY: "auto", maxHeight: 120, marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 14, lineHeight: 1.65, color: "var(--r-text)" }}>
                {cycle.description}
              </div>
            </div>

            {/* Deep reading */}
            <div
              onClick={() => setShowDeep(true)}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            >
              <div style={{ width: 1, height: 12, background: "var(--r-accent)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-sub)", letterSpacing: "0.06em" }}>
                Deep reading
              </span>
            </div>
          </div>
        )}

        {/* MIDDLE — respiro */}
        <div style={{ flex: 1 }} />

        {/* BOTTOM */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.4, marginBottom: 16 }} />

          {/* Cycles */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-ghost)", letterSpacing: "0.12em", marginBottom: 10 }}>
              Cycles
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 20 }}>
                {cycles.map((c, i) => (
                  <span
                    key={c.id}
                    onClick={() => { setSelectedIdx(i); setShowCycle(true); }}
                    style={{
                      fontFamily: "var(--r-font-sys)",
                      fontWeight: selectedIdx === i ? 400 : 300,
                      fontSize: 11,
                      color: selectedIdx === i ? "var(--r-accent)" : "var(--r-sub)",
                      letterSpacing: "0.06em",
                      borderBottom: selectedIdx === i ? "1px solid var(--r-accent)" : "1px solid transparent",
                      paddingBottom: 2,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {c.id}
                  </span>
                ))}
              </div>

              {/* Questionnaire */}
              <div
                onClick={() => navigate("/questionnaire")}
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              >
                <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-muted)", letterSpacing: "0.06em" }}>
                  questionnaire
                </span>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.4, marginBottom: 16 }} />

          {/* How _rdwth works */}
          <div
            onClick={() => setShowSystem(true)}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          >
            <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-muted)", letterSpacing: "0.06em" }}>
              How _rdwth works
            </span>
          </div>
        </div>
      </div>

      <NavBottom active="context" />
    </div>
  );
}
