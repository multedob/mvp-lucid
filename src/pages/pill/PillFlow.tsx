// src/pages/pill/PillFlow.tsx
import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction, getToday } from "@/lib/api";
import { RevealText } from "@/components/RevealText";
import { AudioRecorder } from "@/components/AudioRecorder";

// ─── Types ────────────────────────────────────────────────────────
type PillId = "PI" | "PII" | "PIII" | "PIV" | "PV" | "PVI";
type Moment = "M1" | "M2" | "M3_1" | "M3_2" | "M3_3" | "M4" | "M5";

// Variation content loaded from DB
interface PillVariationContent {
  m1: { phrase: string; tension_label: string };
  m2: { scene: string; question: string };
  m3_1: { question: string; pole_left: string; pole_right: string; context: string };
  m3_2: {
    scenario: string;
    framing: string;
    options: Array<{
      key: "A" | "B" | "C" | "D";
      text: string;
      followup: string;
      followup_type: "cost" | "question";
    }>;
  };
  m3_3: { q1: string; q2: string; q_transversal: string; scoring_note: string };
  m4: { question: string; instruction: string };
}

interface State {
  pillId: PillId;
  moment: Moment;
  ipeCycleId: string;
  cycleDisplay: string;
  pillResponseId: string | null;
  variationKey: string | null;
  variationContent: PillVariationContent | null;
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
  m3_3_transversal: string;
  m4Input: string;
  ecoText: string;
  loading: boolean;
  // ─── Audio (M2 & M4) ────────────────────────────────
  userId: string | null;               // filled in initCycle, used for storage path
  audioLocale: string;                 // BCP-47, e.g. 'en-US', 'pt-BR'
  m2AudioPath: string | null;
  m2AudioDurationMs: number | null;
  m2TranscriptionLive: string;
  m2TranscriptionFinal: string | null;
  m4AudioPath: string | null;
  m4AudioDurationMs: number | null;
  m4TranscriptionLive: string;
  m4TranscriptionFinal: string | null;
}

// ─── Fallback content (V1 hardcoded — used when variation selector fails) ────

const FALLBACK_PILLS: Record<PillId, { tensao: string; frase: string }> = {
  PI:   { tensao: "Eu ↔ Pertencimento",       frase: "I moved. Not everything moved with me." },
  PII:  { tensao: "Eu ↔ Papel",            frase: "Still doing what I've always done. But something inside isn't with it anymore." },
  PIII: { tensao: "Presença ↔ Distância", frase: "It's over. And now I can see what I couldn't while it was happening." },
  PIV:  { tensao: "Clareza ↔ Ação",    frase: "I know what's right. And I'm carrying the weight of acting on it." },
  PV:   { tensao: "Dentro ↔ Fora",    frase: "No crisis. Just an openness with nowhere to go yet." },
  PVI:  { tensao: "Movimento ↔ Pausa",    frase: "Building something that matters. The vertigo is part of the work." },
};

const FALLBACK_M2: Record<PillId, string> = {
  PI: `Marina is 34. Her mother is getting older and over the past few months it has become clear she needs more care. Her siblings don't live in the same city. Marina does.\n\nEveryone agrees they "need to do something" — but no one has taken the first step.\n\nLast night, after visiting her mother, Marina sat in her car outside the house for twenty minutes before driving away. She didn't call any of her siblings. She just sat there, looking at the light in her mother's bedroom window.\n\nWhat do you think is happening with Marina right now?`,
  PII:  "Describe a concrete situation where I ↔ Role became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
  PIII: "Describe a concrete situation where Presence ↔ Distance became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
  PIV:  "Describe a concrete situation where Clarity ↔ Action became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
  PV:   "Describe a concrete situation where Inside ↔ Outside became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
  PVI:  "Describe a concrete situation where Movement ↔ Pause became visible in your daily life.\n\nWhat were you doing when you first noticed it?",
};

const FALLBACK_M3_2_SITUACAO: Record<PillId, string> = {
  PI: `Someone close to you is doing something you consider wrong. It's not illegal. But it goes against what you believe.\n\nThis person doesn't know that you know. And there's a real cost in any direction you choose.`,
  PII:  "You've been offered a role that others think fits you perfectly. But something in you hesitates.\n\nThe offer is real. The deadline is tomorrow.",
  PIII: "Someone you were close to is back in your life. The distance between you has changed both of you.\n\nYou don't know yet if that's good or bad.",
  PIV:  "You know what needs to be done. You've known for a while.\n\nThe cost of acting is clear. So is the cost of waiting.",
  PV:   "You feel something shifting, but there's no clear name for it yet.\n\nPeople around you don't seem to notice. Or maybe they do.",
  PVI:  "You've been building something for months. It's working — but the pace is taking something from you.\n\nYou can't tell yet if that's a problem or just the cost.",
};

const FALLBACK_M3_2_OPCOES: Record<PillId, Array<{ id: "A"|"B"|"C"|"D"; text: string }>> = {
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

// ─── Content accessors (variation → fallback) ─────────────────────

function getM1(pillId: PillId, vc: PillVariationContent | null) {
  if (vc) return { frase: vc.m1.phrase, tensao: vc.m1.tension_label };
  return FALLBACK_PILLS[pillId];
}

function getM2Text(pillId: PillId, vc: PillVariationContent | null): string {
  if (vc) return vc.m2.scene + "\n\n" + vc.m2.question;
  return FALLBACK_M2[pillId];
}

function getM3_1(pillId: PillId, vc: PillVariationContent | null) {
  if (vc) return { question: vc.m3_1.question, poleLeft: vc.m3_1.pole_left, poleRight: vc.m3_1.pole_right };
  return { question: "When you face a decision with real cost, where do you naturally go first?", poleLeft: "outward", poleRight: "inward" };
}

function getM3_2(pillId: PillId, vc: PillVariationContent | null) {
  if (vc) {
    return {
      scenario: vc.m3_2.scenario,
      options: vc.m3_2.options.map(o => ({ id: o.key, text: o.text, followup: o.followup, followupType: o.followup_type })),
    };
  }
  return {
    scenario: FALLBACK_M3_2_SITUACAO[pillId],
    options: FALLBACK_M3_2_OPCOES[pillId].map(o => ({
      id: o.id, text: o.text,
      followup: o.id === "C" ? "What would that third path look like in practice?" : o.id === "D" ? "What specifically would you need to understand before deciding?" : "O que você abre mão ao escolher isso?",
      followupType: (o.id === "C" || o.id === "D") ? "question" as const : "cost" as const,
    })),
  };
}

function getM3_3(pillId: PillId, vc: PillVariationContent | null) {
  if (vc) return { q1: vc.m3_3.q1, q2: vc.m3_3.q2, qTransversal: vc.m3_3.q_transversal };
  return {
    q1: "Think of a moment — recent or not — when you knew clearly what you needed to do and did it, even though it was hard.",
    q2: "What made it possible to act in that moment?",
    qTransversal: null as string | null,
  };
}

function getM4(pillId: PillId, vc: PillVariationContent | null) {
  if (vc) return { question: vc.m4.question, instruction: vc.m4.instruction };
  return { question: "What did you notice about yourself answering this?", instruction: "can be a word. can be a paragraph. what stayed." };
}

const HEADER_LABEL: Record<Moment, string> = {
  M1: "1/6", M2: "1/6", M3_1: "2/6", M3_2: "3/6", M3_3: "4/6", M4: "5/6", M5: "",
};

// ─── Subcomponents ─────────────────────────────────────────────────

const Header = forwardRef<HTMLDivElement, { moment: Moment }>(({ moment }, ref) => {
  const counter = HEADER_LABEL[moment];
  return (
    <>
      <div ref={ref} className="r-header">
        <span className="r-header-label">
          {counter ? `_rdwth · pills · ${counter}` : "_rdwth · pills"}
        </span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
    </>
  );
});
Header.displayName = "Header";

interface FooterProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  showEthics?: boolean;
  onEthics?: () => void;
  disabled?: boolean;
}
const Footer = forwardRef<HTMLDivElement, FooterProps>(({
  onBack, onContinue, continueLabel = "continuar",
  showEthics = true, onEthics, disabled = false,
}, ref) => {
  return (
    <>
      <div className="r-line" />
      <div ref={ref} className="r-footer">
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
          <span className="r-footer-ethics" onClick={onEthics}>prefiro não responder</span>
        )}
      </div>
    </>
  );
});
Footer.displayName = "Footer";

const InvisibleTextarea = forwardRef<HTMLDivElement, {
  value: string; onChange: (v: string) => void; placeholder?: string;
}>(({ value, onChange, placeholder = "escreva aqui" }, fwdRef) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <div ref={fwdRef} className="r-input-wrap">
      <textarea
        ref={ref} className="r-textarea" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={1}
      />
      <div className={`r-send-dot${value.trim() ? " active" : ""}`} />
    </div>
  );
});
InvisibleTextarea.displayName = "InvisibleTextarea";

// ─── Main ─────────────────────────────────────────────────────────

export default function PillFlow() {
  const navigate = useNavigate();
  const { pillId: rawPillId } = useParams<{ pillId: string }>();
  const pillId: PillId = (rawPillId && rawPillId in FALLBACK_PILLS) ? rawPillId as PillId : "PI";
  const [state, setState] = useState<State>({
    pillId, moment: "M1", ipeCycleId: "", cycleDisplay: "",
    pillResponseId: null, variationKey: null, variationContent: null,
    m1TimerStart: Date.now(),
    m2Input: "", m3_1_posicao: null, m3_1_duasPalavras: "",
    m3_1_situacaoOposta: "", m3_2_opcao: null, m3_2_abreMao: "",
    m3_2_followupC: "", m3_2_followupD: "", m3_3_narrativa: "",
    m3_3_condicao: "", m3_3_transversal: "", m4Input: "", ecoText: "", loading: false,
    userId: null,
    // Prefer browser's language; fall back to en-US. User can effectively
    // override by typing in any language — Web Speech adapts loosely and
    // Whisper auto-detects anyway (locale here is just a hint).
    audioLocale: "pt-BR",
    m2AudioPath: null, m2AudioDurationMs: null, m2TranscriptionLive: "", m2TranscriptionFinal: null,
    m4AudioPath: null, m4AudioDurationMs: null, m4TranscriptionLive: "", m4TranscriptionFinal: null,
  });

  const initRef = useRef(false);

  const initCycle = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    setState(s => ({ ...s, loading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { initRef.current = false; return navigate("/auth"); }

      let { data: cycle } = await supabase
        .from("ipe_cycles").select("*")
        .eq("user_id", session.user.id)
        .in("status", ["pills", "questionnaire"])
        .order("cycle_number", { ascending: false })
        .limit(1).maybeSingle();

      if (cycle && cycle.status === "questionnaire") {
        const completed = (cycle.pills_completed as string[]) ?? [];
        const allSix = ["PI","PII","PIII","PIV","PV","PVI"].every(p => completed.includes(p));
        if (!allSix) {
          await supabase.from("ipe_cycles").update({ status: "pills" }).eq("id", cycle.id);
          cycle = { ...cycle, status: "pills" };
        }
      }

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

      if (!cycle) { initRef.current = false; return; }
      const d = new Date(cycle.started_at || new Date());
      const code = String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
      const display = String(cycle.cycle_number).padStart(2, "0") + " · " + code;

      // Load variation content from ipe-variation-selector
      let variationKey: string | null = null;
      let variationContent: PillVariationContent | null = null;
      try {
        const vr = await callEdgeFunction<{ variation_key: string; content: PillVariationContent }>(
          "ipe-variation-selector",
          {
            action: "select_pill_variation",
            user_id: session.user.id,
            ipe_cycle_id: cycle.id,
            pill_id: pillId,
            ipe_level: 1.0,
          }
        );
        variationKey = vr.variation_key;
        variationContent = vr.content;
      } catch (err) {
        console.warn("[PillFlow] Variation selector failed, using fallback content:", err);
        // Fallback: use hardcoded V1 content (null variationContent triggers fallbacks)
      }

      setState(s => ({
        ...s, ipeCycleId: cycle.id, cycleDisplay: display,
        variationKey, variationContent,
        loading: false, m1TimerStart: Date.now(),
        userId: session.user.id,
      }));
    } catch (err) {
      console.error("[PillFlow] initCycle error:", err);
      initRef.current = false;
      setState(s => ({ ...s, loading: false }));
    }
  }, [navigate, pillId]);

  useEffect(() => { initCycle(); }, [initCycle]);

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
        variation_key: state.variationKey, // persisted in pill_responses
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
        payload: {
          resposta: state.m2Input,
          cal_signals: { localizacao: null, custo: null, foco: null, horizonte: null },
          // Audio metadata — nullable. Server-side fields also nullable.
          audio_url:            state.m2AudioPath,
          audio_duration_ms:    state.m2AudioDurationMs,
          transcription_live:   state.m2TranscriptionLive || null,
          transcription_final:  state.m2TranscriptionFinal,
        },
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
          M3_3_inventario: (() => {
            const base: Record<string, unknown> = {
              narrativa: state.m3_3_narrativa,
              condicao: state.m3_3_condicao,
              transversal_l13: state.m3_3_transversal || null, // new: L1.3 coverage
            };
            const pid = state.pillId;
            if (pid === "PI")   return { ...base, cobertura_L1_3: state.m3_3_transversal || state.m3_3_narrativa };
            if (pid === "PII")  return { ...base, cobertura_L1_3: state.m3_3_transversal || state.m3_3_narrativa, cobertura_L1_4: state.m3_3_condicao };
            if (pid === "PIII") return { ...base, cobertura_L1_3: state.m3_3_transversal || state.m3_3_narrativa, cobertura_L2_2: state.m3_3_condicao };
            if (pid === "PIV")  return { ...base, cobertura_L1_3: state.m3_3_transversal || state.m3_3_narrativa };
            if (pid === "PV")   return { ...base, cobertura_L1_3: state.m3_3_transversal || state.m3_3_narrativa, cobertura_L4_3: state.m3_3_condicao };
            if (pid === "PVI")  return { ...base, cobertura_L1_3: null, cobertura_L1_3_pvi: state.m3_3_transversal || state.m3_3_narrativa, cobertura_L1_4: state.m3_3_condicao };
            return { ...base, cobertura_L1_3: state.m3_3_transversal || state.m3_3_narrativa };
          })(),
        },
      });
    } catch (err) {
      console.error("[PillFlow] submitM3 failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Erro ao salvar M3: " + msg + "\n\nVer console (F12) para detalhes.");
      setState(s => ({ ...s, loading: false }));
      return;  // NÃO avançar para M4 se M3 falhou
    }
    setState(s => ({ ...s, moment: "M4", loading: false }));
  };

  const submitM4 = async () => {
    if (state.loading) return;
    setState(s => ({ ...s, loading: true }));
    try {
      await callEdgeFunction("ipe-pill-session", {
        ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId, moment: "M4",
        payload: {
          m4: (() => {
            const p = state.m4Input;
            if (state.pillId === "PI")  return { percepcao: p, presenca_deslocamento: p };
            if (state.pillId === "PV")  return { percepcao: p, conhecimento_em_campo: p, presenca_para_outros: p };
            return { percepcao: p, presenca_para_outros: p };
          })(),
          // Audio metadata — nullable.
          audio_url:            state.m4AudioPath,
          audio_duration_ms:    state.m4AudioDurationMs,
          transcription_live:   state.m4TranscriptionLive || null,
          transcription_final:  state.m4TranscriptionFinal,
        },
      });

      let ecoText = "";
      try {
        const userName = localStorage.getItem("rdwth_user_name") || undefined;
        const eco = await callEdgeFunction<{ eco_text: string }>("ipe-eco", {
          ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId, ...(userName && { user_name: userName }),
        });
        ecoText = eco.eco_text || "";
      } catch (ecoErr) {
        console.error("[PillFlow] ipe-eco failed:", ecoErr);
      }

      setState(s => ({ ...s, ecoText, moment: "M5", loading: false }));
    } catch (err) {
      console.error("[PillFlow] submitM4 failed:", err);
      setState(s => ({ ...s, loading: false }));
    }
  };

  // ─── Content derived from variation (or fallback) ────────────
  const vc = state.variationContent;
  const m1Content = getM1(pillId, vc);
  const m2Text = getM2Text(pillId, vc);
  const m3_1Content = getM3_1(pillId, vc);
  const m3_2Content = getM3_2(pillId, vc);
  const m3_3Content = getM3_3(pillId, vc);
  const m4Content = getM4(pillId, vc);
  const { moment } = state;

  // ─── M1: Impact phrase ────────────────────────────────────────
  if (moment === "M1") return (
    <div className="r-screen">
      <Header moment="M1" />
      <div style={{ padding: "32px 24px 0", flexShrink: 0 }}>
        {state.loading ? (
          // Hold the space blank while the variation loads, so the user never
          // sees the fallback phrase get replaced by the variation phrase.
          <div style={{ minHeight: 120 }} />
        ) : (
          <>
            <RevealText
              as="div"
              text={m1Content.frase}
              duration={1800}
              charFadeMs={340}
              className="r-impact"
            />
            <RevealText
              as="div"
              text={m1Content.tensao}
              duration={1200}
              charFadeMs={280}
              className="r-tension"
              style={{ marginTop: 14 }}
            />
          </>
        )}
      </div>
      <div style={{ flex: 1 }} />
      <Footer onBack={() => navigate("/home")} onContinue={submitM1}
        continueLabel={state.loading ? "..." : "começar"}
        showEthics onEthics={() => handleEthics("M1")}
        disabled={state.loading || !state.ipeCycleId} />
    </div>
  );

  // ─── M2: Narrative scene ──────────────────────────────────────
  if (moment === "M2") return (
    <div className="r-screen">
      <Header moment="M2" />
      <div className="r-scroll" style={{ padding: "24px 24px 0" }}>
        <div className="r-narrative" style={{ whiteSpace: "pre-line" }}>{m2Text}</div>
        <div style={{ height: 24 }} />
      </div>
      <div className="r-line" />
      <div style={{ padding: "12px 24px 10px", flexShrink: 0 }}>
        <InvisibleTextarea value={state.m2Input} onChange={v => setState(s => ({ ...s, m2Input: v }))} />
        {state.userId && state.ipeCycleId && (
          <div style={{ marginTop: 8 }}>
            <AudioRecorder
              userId={state.userId}
              cycleId={state.ipeCycleId}
              pillId={state.pillId}
              moment="m2"
              language={state.audioLocale}
              onLiveTranscript={text => setState(s => ({ ...s, m2Input: text, m2TranscriptionLive: text }))}
              onFinalTranscript={text => setState(s => ({ ...s, m2Input: text, m2TranscriptionFinal: text }))}
              onAudioStored={info => setState(s => ({ ...s, m2AudioPath: info.path, m2AudioDurationMs: info.durationMs }))}
              disabled={state.loading}
            />
          </div>
        )}
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M1" }))} onContinue={submitM2}
        continueLabel={state.loading ? "..." : "continuar"}
        showEthics onEthics={() => handleEthics("M2")} disabled={state.loading} />
    </div>
  );

  // ─── M3_1: Bipolar scale ─────────────────────────────────────
  if (moment === "M3_1") return (
    <div className="r-screen">
      <Header moment="M3_1" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 16px" }}>
        <div className="r-question" style={{ marginBottom: 20 }}>
          {m3_1Content.question}
        </div>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-dim)", textAlign: "center", marginBottom: 14 }}>{m3_1Content.poleLeft}</div>
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
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-dim)", textAlign: "center", marginTop: 14 }}>{m3_1Content.poleRight}</div>
        {state.m3_1_posicao !== null && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <InvisibleTextarea value={state.m3_1_duasPalavras} onChange={v => setState(s => ({ ...s, m3_1_duasPalavras: v }))} placeholder="duas palavras para essa posição" />
            <InvisibleTextarea value={state.m3_1_situacaoOposta} onChange={v => setState(s => ({ ...s, m3_1_situacaoOposta: v }))} placeholder="como seria o oposto?" />
          </div>
        )}
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M2" }))}
        onContinue={() => advance("M3_2")} showEthics onEthics={() => advance("M3_2")}
        disabled={state.m3_1_posicao === null || !state.m3_1_duasPalavras.trim() || !state.m3_1_situacaoOposta.trim()} />
    </div>
  );

  // ─── M3_2: Impossible choice ──────────────────────────────────
  if (moment === "M3_2") {
    const { scenario, options } = m3_2Content;
    const selectedOption = options.find(o => o.id === state.m3_2_opcao);
    return (
      <div className="r-screen">
        <Header moment="M3_2" />
        <div className="r-scroll" style={{ padding: "20px 24px 0" }}>
          <div className="r-narrative" style={{ whiteSpace: "pre-line", marginBottom: 24 }}>{scenario}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            {options.map(o => (
              <div key={o.id} className="r-choice" onClick={() => setState(s => ({ ...s, m3_2_opcao: o.id as "A"|"B"|"C"|"D" }))}>
                <div className={`r-choice-dot${state.m3_2_opcao === o.id ? " selected" : ""}`} style={{ marginTop: 5 }} />
                <div className={`r-choice-text${state.m3_2_opcao === o.id ? " selected" : ""}`}>{o.text}</div>
              </div>
            ))}
          </div>
          {/* Dynamic follow-up based on selected option */}
          {selectedOption && selectedOption.followupType === "question" && (
            <div style={{ marginBottom: 20 }}>
              <div className="r-question" style={{ marginBottom: 12, fontSize: 14 }}>{selectedOption.followup}</div>
              {state.m3_2_opcao === "C" && (
                <InvisibleTextarea value={state.m3_2_followupC} onChange={v => setState(s => ({ ...s, m3_2_followupC: v }))} />
              )}
              {state.m3_2_opcao === "D" && (
                <InvisibleTextarea value={state.m3_2_followupD} onChange={v => setState(s => ({ ...s, m3_2_followupD: v }))} />
              )}
            </div>
          )}
          {state.m3_2_opcao && (
            <div style={{ marginBottom: 24 }}>
              <div className="r-question" style={{ marginBottom: 12, fontSize: 14 }}>
                {selectedOption?.followupType === "cost" ? selectedOption.followup : "O que você abre mão ao escolher isso?"}
              </div>
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

  // ─── M3_3: Inventory ──────────────────────────────────────────
  if (moment === "M3_3") return (
    <div className="r-screen">
      <Header moment="M3_3" />
      <div className="r-scroll" style={{ padding: "20px 24px 0" }}>
        <div className="r-question" style={{ marginBottom: 14 }}>{m3_3Content.q1}</div>
        <InvisibleTextarea value={state.m3_3_narrativa} onChange={v => setState(s => ({ ...s, m3_3_narrativa: v }))} />
        <div style={{ height: 32 }} />
        <div className="r-question" style={{ marginBottom: 14 }}>{m3_3Content.q2}</div>
        <InvisibleTextarea value={state.m3_3_condicao} onChange={v => setState(s => ({ ...s, m3_3_condicao: v }))} />
        {m3_3Content.qTransversal && (
          <>
            <div style={{ height: 32 }} />
            <div className="r-question" style={{ marginBottom: 14 }}>{m3_3Content.qTransversal}</div>
            <InvisibleTextarea value={state.m3_3_transversal} onChange={v => setState(s => ({ ...s, m3_3_transversal: v }))} />
          </>
        )}
        <div style={{ height: 24 }} />
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M3_2" }))} onContinue={submitM3}
        continueLabel={state.loading ? "..." : "continuar"}
        showEthics onEthics={() => handleEthics("M3")}
        disabled={state.loading || !state.m3_3_narrativa.trim() || !state.m3_3_condicao.trim()} />
    </div>
  );

  // ─── M4: Self-observation ─────────────────────────────────────
  if (moment === "M4") return (
    <div className="r-screen">
      <Header moment="M4" />
      <div style={{ flex: 1, padding: "28px 24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="r-question">{m4Content.question}</div>
        <div className="r-sub">{m4Content.instruction}</div>
        <div style={{ marginTop: 10 }}>
          <InvisibleTextarea value={state.m4Input} onChange={v => setState(s => ({ ...s, m4Input: v }))} />
          {state.userId && state.ipeCycleId && (
            <div style={{ marginTop: 8 }}>
              <AudioRecorder
                userId={state.userId}
                cycleId={state.ipeCycleId}
                pillId={state.pillId}
                moment="m4"
                language={state.audioLocale}
                onLiveTranscript={text => setState(s => ({ ...s, m4Input: text, m4TranscriptionLive: text }))}
                onFinalTranscript={text => setState(s => ({ ...s, m4Input: text, m4TranscriptionFinal: text }))}
                onAudioStored={info => setState(s => ({ ...s, m4AudioPath: info.path, m4AudioDurationMs: info.durationMs }))}
                disabled={state.loading}
              />
            </div>
          )}
        </div>
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M3_3" }))} onContinue={submitM4}
        continueLabel={state.loading ? "..." : "continuar"}
        showEthics onEthics={() => handleEthics("M4")} disabled={state.loading} />
    </div>
  );

  // ─── M5: Echo ─────────────────────────────────────────────────
  return (
    <div className="r-screen">
      <Header moment="M5" />
      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="r-reed-sig">REED · {state.cycleDisplay}</div>
        {state.ecoText ? (
          state.ecoText.split("\n\n").map((p, i) => (
            <div key={i} className="r-narrative">
              <RevealText text={p} duration={2000} charFadeMs={380} />
            </div>
          ))
        ) : (
          <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)", letterSpacing: "0.08em", textAlign: "center", padding: "12px 0" }}>
            reed está escutando<span className="r-dots">...</span>
          </div>
        )}
      </div>
      <div style={{ padding: "0 24px 12px", flexShrink: 0 }}>
        <div
          onClick={() => navigate("/reed")}
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 400,
            fontSize: 12,
            color: "var(--r-accent)",
            letterSpacing: "0.06em",
            cursor: "pointer",
            textAlign: "center",
            padding: "14px 0",
            borderTop: "0.5px solid var(--r-ghost)",
          }}
        >
          talk to reed
        </div>
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M4" }))}
        onContinue={() => navigate("/pills")} continueLabel="continuar" showEthics={false} />
    </div>
  );
}
