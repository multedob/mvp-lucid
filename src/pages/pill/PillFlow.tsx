// src/pages/pill/PillFlow.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction, getToday } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────
type PillId = "PI" | "PII" | "PIII" | "PIV" | "PV" | "PVI";
type Moment = "M1" | "M2" | "M3_1" | "M3_2" | "M3_3" | "M4" | "M5";

interface State {
  pillId: PillId;
  moment: Moment;
  ipeCycleId: string;
  cycleDisplay: string;
  pillResponseId: string | null;
  m1TimerStart: number;
  m2Input: string;
  m3_1_posicao: number | null;
  m3_1_duasPalavras: string;
  m3_1_situacaoOposta: string;
  m3_2_opcao: "A" | "B" | "C" | "D" | null;
  m3_2_abreMao: string;
  m3_2_followupC: string;
  m3_2_followupD: string;
  m3_3_narrativa: string;
  m3_3_condicao: string;
  m4Input: string;
  ecoText: string;
  loading: boolean;
}

const PILLS: Record<PillId, { tensao: string; frase: string }> = {
  PI:   { tensao: "I ↔ Belonging",       frase: "I moved. Not everything moved with me." },
  PII:  { tensao: "I ↔ Role",            frase: "Still doing what I've always done. But something inside isn't with it anymore." },
  PIII: { tensao: "Presence ↔ Distance", frase: "It's over. And now I can see what I couldn't while it was happening." },
  PIV:  { tensao: "Clarity ↔ Action",    frase: "I know what's right. And I'm carrying the weight of acting on it." },
  PV:   { tensao: "Inside ↔ Outside",    frase: "No crisis. Just an openness with nowhere to go yet." },
  PVI:  { tensao: "Movement ↔ Pause",    frase: "Building something that matters. The vertigo is part of the work." },
};

const HEADER_LABEL: Record<Moment, string> = {
  M1: "1/6", M2: "1/6", M3_1: "2/6", M3_2: "3/6", M3_3: "4/6", M4: "5/6", M5: "",
};

const M2_TEXT: Record<PillId, string> = {
  PI: `Marina is 34. Her mother is getting older and over the past few months it has become clear she needs more care. Her siblings don't live in the same city. Marina does.

Everyone agrees they "need to do something" — but no one has taken the first step.

Last night, after visiting her mother, Marina sat in her car outside the house for twenty minutes before driving away. She didn't call any of her siblings. She just sat there, looking at the light in her mother's bedroom window.

What do you think is happening with Marina right now?`,
  PII:  "Describe a concrete situation where I ↔ Role became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
  PIII: "Describe a concrete situation where Presence ↔ Distance became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
  PIV:  "Describe a concrete situation where Clarity ↔ Action became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
  PV:   "Describe a concrete situation where Inside ↔ Outside became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
  PVI:  "Describe a concrete situation where Movement ↔ Pause became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
};

const M3_2_SITUACAO: Record<PillId, string> = {
  PI: `Someone close to you is doing something you consider wrong. It's not illegal. But it goes against what you believe.

This person doesn't know that you know. And there's a real cost in any direction you choose.`,
  PII:  "You've been offered a role that others think fits you perfectly. But something in you hesitates.\n\nThe offer is real. The deadline is tomorrow.",
  PIII: "Someone you were close to is back in your life. The distance between you has changed both of you.\n\nYou don't know yet if that's good or bad.",
  PIV:  "You know what needs to be done. You've known for a while.\n\nThe cost of acting is clear. So is the cost of waiting.",
  PV:   "You feel something shifting, but there's no clear name for it yet.\n\nPeople around you don't seem to notice. Or maybe they do.",
  PVI:  "You've been building something for months. It's working — but the pace is taking something from you.\n\nYou can't tell yet if that's a problem or just the cost.",
};

const M3_2_OPCOES: Record<PillId, Array<{ id: "A"|"B"|"C"|"D"; text: string }>> = {
  PI: [
    { id: "A", text: "I don't get involved. Everyone is responsible for their own choices." },
    { id: "B", text: "I speak directly with the person. I accept whatever happens after." },
    { id: "C", text: "I find a way to act without direct confrontation — a third path." },
    { id: "D", text: "I need more context before I can decide anything." },
  ],
  PII: [
    { id: "A", text: "I accept. Alignment with others' expectations is enough for now." },
    { id: "B", text: "I decline. I trust my hesitation more than their certainty." },
    { id: "C", text: "I ask for time and try to understand what's driving my hesitation." },
    { id: "D", text: "I accept, but I hold the discomfort — and watch what happens." },
  ],
  PIII: [
    { id: "A", text: "I meet the distance with distance. I wait to see who they are now." },
    { id: "B", text: "I bring who I am now. Whatever happens next is information." },
    { id: "C", text: "I acknowledge the change directly. It feels dishonest not to." },
    { id: "D", text: "I need more time before I can know how to be with them." },
  ],
  PIV: [
    { id: "A", text: "I act. The cost of waiting is higher than the cost of moving." },
    { id: "B", text: "I wait. I'm not ready — and forcing it would make it worse." },
    { id: "C", text: "I take a smaller step. Not the full thing, but something." },
    { id: "D", text: "I name the conflict out loud — to myself, or to someone else." },
  ],
  PV: [
    { id: "A", text: "I stay quiet. It's too early to name it." },
    { id: "B", text: "I speak it anyway. Naming it might help me understand it." },
    { id: "C", text: "I act as if I understand it, even if I don't — and see what I learn." },
    { id: "D", text: "I look for the thing I might be avoiding by not naming it." },
  ],
  PVI: [
    { id: "A", text: "I continue. The cost is acceptable. The work is worth it." },
    { id: "B", text: "I slow down. The pace is telling me something I need to hear." },
    { id: "C", text: "I finish this phase, then reassess. I can't decide in the middle." },
    { id: "D", text: "I try to name what's being taken — before I decide what to do." },
  ],
};

// ─── Subcomponents ─────────────────────────────────────────────────

function Header({ moment }: { moment: Moment }) {
  const counter = HEADER_LABEL[moment];
  return (
    <>
      <div className="r-header">
        <span className="r-header-label">
          {counter ? `_rdwth · pills · ${counter}` : "_rdwth · pills"}
        </span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
    </>
  );
}

function Footer({
  onBack, onContinue, continueLabel = "continue",
  showEthics = true, onEthics, disabled = false,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  showEthics?: boolean;
  onEthics?: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="r-line" />
      <div className="r-footer">
        {onBack && <span className="r-footer-back" onClick={onBack}>‹</span>}
        {onBack && <span className="r-footer-sep">|</span>}
        {onContinue && (
          <span
            className="r-footer-action"
            onClick={disabled ? undefined : onContinue}
            style={{ opacity: disabled ? 0.3 : 1, cursor: disabled ? "default" : "pointer" }}
          >
            {continueLabel}
          </span>
        )}
        {showEthics && onEthics && (
          <span className="r-footer-ethics" onClick={onEthics}>i'd rather not</span>
        )}
      </div>
    </>
  );
}

function InvisibleTextarea({
  value, onChange, placeholder = "type here",
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <div className="r-input-wrap">
      <textarea
        ref={ref} className="r-textarea" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={1}
      />
      <div className={`r-send-dot${value.trim() ? " active" : ""}`} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────

export default function PillFlow() {
  const navigate = useNavigate();
  const { pillId: rawPillId } = useParams<{ pillId: string }>();
  const pillId = (rawPillId as PillId) || "PI";

  const [state, setState] = useState<State>({
    pillId, moment: "M1", ipeCycleId: "", cycleDisplay: "",
    pillResponseId: null, m1TimerStart: Date.now(),
    m2Input: "", m3_1_posicao: null, m3_1_duasPalavras: "",
    m3_1_situacaoOposta: "", m3_2_opcao: null, m3_2_abreMao: "",
    m3_2_followupC: "", m3_2_followupD: "", m3_3_narrativa: "",
    m3_3_condicao: "", m4Input: "", ecoText: "", loading: false,
  });

  useEffect(() => { initCycle(); }, []);

  const initCycle = async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");

      let { data: cycle } = await supabase
        .from("ipe_cycles").select("*")
        .eq("user_id", session.user.id).eq("status", "pills").maybeSingle();

      if (!cycle) {
        const { data: last } = await supabase
          .from("ipe_cycles").select("cycle_number")
          .eq("user_id", session.user.id)
          .order("cycle_number", { ascending: false }).limit(1).maybeSingle();

        const nextNum = (last?.cycle_number ?? 0) + 1;
        const { data: newCycle } = await supabase
          .from("ipe_cycles")
          .insert({ user_id: session.user.id, status: "pills", cycle_number: nextNum, prompt_version: null, pills_completed: [] })
          .select().single();
        cycle = newCycle;
      }

      if (!cycle) return;
      const d = new Date(cycle.started_at || new Date());
      const code = String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
      const display = String(cycle.cycle_number).padStart(2, "0") + " · " + code;
      setState(s => ({ ...s, ipeCycleId: cycle.id, cycleDisplay: display, loading: false, m1TimerStart: Date.now() }));
    } catch (err) {
      console.error(err);
      setState(s => ({ ...s, loading: false }));
    }
  };

  const advance = (to?: Moment) => setState(s => {
    if (to) return { ...s, moment: to };
    const order: Moment[] = ["M1","M2","M3_1","M3_2","M3_3","M4","M5"];
    const idx = order.indexOf(s.moment);
    return { ...s, moment: order[Math.min(idx + 1, order.length - 1)] };
  });

  const handleEthics = async (apiMoment: "M1"|"M2"|"M3"|"M4") => {
    try {
      await callEdgeFunction("ipe-pill-session", {
        ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId,
        moment: apiMoment, payload: {}, protecao_etica: true,
      });
    } catch (_) {}
    advance();
  };

  const submitM1 = async () => {
    if (!state.ipeCycleId || state.loading) return;
    setState(s => ({ ...s, loading: true }));
    const secs = Math.round((Date.now() - state.m1TimerStart) / 1000);
    try {
      const r = await callEdgeFunction<{ pill_response_id: string }>("ipe-pill-session", {
        ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId, moment: "M1",
        payload: { tempo_segundos: secs },
      });
      setState(s => ({ ...s, pillResponseId: r.pill_response_id, moment: "M2", loading: false }));
    } catch { setState(s => ({ ...s, moment: "M2", loading: false })); }
  };

  const submitM2 = async () => {
    if (state.loading) return;
    setState(s => ({ ...s, loading: true }));
    try {
      await callEdgeFunction("ipe-pill-session", {
        ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId, moment: "M2",
        payload: { resposta: state.m2Input, cal_signals: { localizacao: null, custo: null, foco: null, horizonte: null } },
      });
    } catch (_) {}
    setState(s => ({ ...s, moment: "M3_1", loading: false }));
  };

  const submitM3 = async () => {
    if (state.loading) return;
    setState(s => ({ ...s, loading: true }));
    try {
      await callEdgeFunction("ipe-pill-session", {
        ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId, moment: "M3",
        payload: {
          M3_1_regua: { posicao: String(state.m3_1_posicao ?? 3), duas_palavras: state.m3_1_duasPalavras || "—", situacao_oposta: state.m3_1_situacaoOposta || "—" },
          M3_2_escolha: { opcao: state.m3_2_opcao ?? "A", abre_mao: state.m3_2_abreMao || "—", followup_C: state.m3_2_followupC || null, followup_D: state.m3_2_followupD || null },
          M3_3_inventario: { narrativa: state.m3_3_narrativa, condicao: state.m3_3_condicao, cobertura_L1_3: state.m3_3_narrativa },
        },
      });
    } catch (_) {}
    setState(s => ({ ...s, moment: "M4", loading: false }));
  };

  const submitM4 = async () => {
    if (state.loading) return;
    setState(s => ({ ...s, loading: true }));
    try {
      await callEdgeFunction("ipe-pill-session", {
        ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId, moment: "M4",
        payload: { m4: { percepcao: state.m4Input, presenca_deslocamento: state.m4Input } },
      });
      const eco = await callEdgeFunction<{ eco_text: string }>("ipe-eco", {
        ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId,
      });
      setState(s => ({ ...s, ecoText: eco.eco_text || "", moment: "M5", loading: false }));
    } catch { setState(s => ({ ...s, moment: "M5", loading: false })); }
  };

  const pill = PILLS[pillId];
  const { moment } = state;

  if (moment === "M1") return (
    <div className="r-screen">
      <Header moment="M1" />
      <div style={{ padding: "32px 24px 0", flexShrink: 0 }}>
        <div className="r-impact">{pill.frase}</div>
        <div className="r-tension" style={{ marginTop: 14 }}>{pill.tensao}</div>
      </div>
      <div style={{ flex: 1 }} />
      <Footer onBack={() => navigate("/home")} onContinue={submitM1}
        continueLabel={state.loading ? "..." : "begin"}
        showEthics onEthics={() => handleEthics("M1")}
        disabled={state.loading || !state.ipeCycleId} />
    </div>
  );

  if (moment === "M2") return (
    <div className="r-screen">
      <Header moment="M2" />
      <div className="r-scroll" style={{ padding: "24px 24px 0" }}>
        <div className="r-narrative" style={{ whiteSpace: "pre-line" }}>{M2_TEXT[pillId]}</div>
        <div style={{ height: 24 }} />
      </div>
      <div className="r-line" />
      <div style={{ padding: "12px 24px 10px", flexShrink: 0 }}>
        <InvisibleTextarea value={state.m2Input} onChange={v => setState(s => ({ ...s, m2Input: v }))} />
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M1" }))} onContinue={submitM2}
        continueLabel={state.loading ? "..." : "continue"}
        showEthics onEthics={() => handleEthics("M2")} disabled={state.loading} />
    </div>
  );

  if (moment === "M3_1") return (
    <div className="r-screen">
      <Header moment="M3_1" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 16px" }}>
        <div className="r-question" style={{ marginBottom: 20 }}>
          When you face a decision with real cost, where do you naturally go first?
        </div>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-dim)", textAlign: "center", marginBottom: 14 }}>outward</div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: 16 }}>
            <div style={{ position: "absolute", top: 6, bottom: 6, left: "50%", width: "0.5px", background: "var(--r-ghost)", transform: "translateX(-50%)" }} />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", position: "relative", zIndex: 1 }}>
              {[0,1,2,3,4,5,6].map(i => (
                <div key={i} className={`r-scale-dot${state.m3_1_posicao === i ? " selected" : ""}`}
                  onClick={() => setState(s => ({ ...s, m3_1_posicao: i }))} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-dim)", textAlign: "center", marginTop: 14 }}>inward</div>
        {state.m3_1_posicao !== null && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <InvisibleTextarea value={state.m3_1_duasPalavras} onChange={v => setState(s => ({ ...s, m3_1_duasPalavras: v }))} placeholder="two words for this position" />
            <InvisibleTextarea value={state.m3_1_situacaoOposta} onChange={v => setState(s => ({ ...s, m3_1_situacaoOposta: v }))} placeholder="what would the opposite look like?" />
          </div>
        )}
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M2" }))}
        onContinue={() => advance("M3_2")} showEthics onEthics={() => advance("M3_2")}
        disabled={state.m3_1_posicao === null || !state.m3_1_duasPalavras.trim() || !state.m3_1_situacaoOposta.trim()} />
    </div>
  );

  if (moment === "M3_2") {
    const opcoes = M3_2_OPCOES[pillId];
    return (
      <div className="r-screen">
        <Header moment="M3_2" />
        <div className="r-scroll" style={{ padding: "20px 24px 0" }}>
          <div className="r-narrative" style={{ whiteSpace: "pre-line", marginBottom: 24 }}>{M3_2_SITUACAO[pillId]}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            {opcoes.map(o => (
              <div key={o.id} className="r-choice" onClick={() => setState(s => ({ ...s, m3_2_opcao: o.id }))}>
                <div className={`r-choice-dot${state.m3_2_opcao === o.id ? " selected" : ""}`} style={{ marginTop: 5 }} />
                <div className={`r-choice-text${state.m3_2_opcao === o.id ? " selected" : ""}`}>{o.text}</div>
              </div>
            ))}
          </div>
          {state.m3_2_opcao === "C" && (
            <div style={{ marginBottom: 20 }}>
              <div className="r-question" style={{ marginBottom: 12, fontSize: 14 }}>What would that third path look like in practice?</div>
              <InvisibleTextarea value={state.m3_2_followupC} onChange={v => setState(s => ({ ...s, m3_2_followupC: v }))} />
            </div>
          )}
          {state.m3_2_opcao === "D" && (
            <div style={{ marginBottom: 20 }}>
              <div className="r-question" style={{ marginBottom: 12, fontSize: 14 }}>What specifically would you need to understand before deciding?</div>
              <InvisibleTextarea value={state.m3_2_followupD} onChange={v => setState(s => ({ ...s, m3_2_followupD: v }))} />
            </div>
          )}
          {state.m3_2_opcao && (
            <div style={{ marginBottom: 24 }}>
              <div className="r-question" style={{ marginBottom: 12, fontSize: 14 }}>What do you give up when you choose this?</div>
              <InvisibleTextarea value={state.m3_2_abreMao} onChange={v => setState(s => ({ ...s, m3_2_abreMao: v }))} />
            </div>
          )}
          <div style={{ height: 16 }} />
        </div>
        <Footer onBack={() => setState(s => ({ ...s, moment: "M3_1" }))}
          onContinue={() => advance("M3_3")} showEthics onEthics={() => advance("M3_3")}
          disabled={!state.m3_2_opcao || !state.m3_2_abreMao.trim()} />
      </div>
    );
  }

  if (moment === "M3_3") return (
    <div className="r-screen">
      <Header moment="M3_3" />
      <div className="r-scroll" style={{ padding: "20px 24px 0" }}>
        <div className="r-question" style={{ marginBottom: 14 }}>Think of a moment — recent or not — when you knew clearly what you needed to do and did it, even though it was hard.</div>
        <InvisibleTextarea value={state.m3_3_narrativa} onChange={v => setState(s => ({ ...s, m3_3_narrativa: v }))} />
        <div style={{ height: 32 }} />
        <div className="r-question" style={{ marginBottom: 14 }}>What made it possible to act in that moment?</div>
        <InvisibleTextarea value={state.m3_3_condicao} onChange={v => setState(s => ({ ...s, m3_3_condicao: v }))} />
        <div style={{ height: 24 }} />
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M3_2" }))} onContinue={submitM3}
        continueLabel={state.loading ? "..." : "continue"}
        showEthics onEthics={() => handleEthics("M3")}
        disabled={state.loading || !state.m3_3_narrativa.trim() || !state.m3_3_condicao.trim()} />
    </div>
  );

  if (moment === "M4") return (
    <div className="r-screen">
      <Header moment="M4" />
      <div style={{ flex: 1, padding: "28px 24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="r-question">What did you notice about yourself answering this?</div>
        <div className="r-sub">can be a word. can be a paragraph. what stayed.</div>
        <div style={{ marginTop: 10 }}>
          <InvisibleTextarea value={state.m4Input} onChange={v => setState(s => ({ ...s, m4Input: v }))} />
        </div>
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M3_3" }))} onContinue={submitM4}
        continueLabel={state.loading ? "..." : "continue"}
        showEthics onEthics={() => handleEthics("M4")} disabled={state.loading} />
    </div>
  );

  // M5
  return (
    <div className="r-screen">
      <Header moment="M5" />
      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="r-reed-sig">REED · {state.cycleDisplay}</div>
        {state.ecoText ? (
          state.ecoText.split("\n\n").map((p, i) => (
            <div key={i} className="r-narrative">{p}</div>
          ))
        ) : (
          <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-ghost)", letterSpacing: "0.06em" }}>···</div>
        )}
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M4" }))}
        onContinue={() => navigate("/reed")} continueLabel="talk to reed" showEthics={false} />
    </div>
  );
}
