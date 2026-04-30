// src/pages/pill/PillFlow.tsx
import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction, getToday } from "@/lib/api";
import { RevealText } from "@/components/RevealText";
import { AudioRecorder } from "@/components/AudioRecorder";
import { EcoLoadingScreen } from "@/components/EcoLoadingScreen";
import { triggerDeepReadingRefresh } from "@/lib/deepReading";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";

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
  ecoLines: string[];           // v2.c.2 — array de linhas Reed (prosa contínua)
  ecoMirror: string;             // legacy (v2.c.1 backward compat)
  ecoQuestion: string;           // legacy (v2.c.1 backward compat)
  ecoMicrotitle: string;
  ecoOperatorHint: string;
  ecoCtaText: string;            // v2.c.2 — CTA contextual sorteado pelo backend
  reviewMode: boolean;           // Wave 10 — true se Pill já tem eco salvo (revisitar)
  m4Saved: boolean;              // Wave 12 — true se ipe-pill-session/M4 já gravou (retry só do eco)
  ecoFailed: boolean;            // Wave 12 — true se ipe-eco falhou (mostra retry inline em M4)
  ecoErrorMsg: string;           // Wave 12 — mensagem do erro pra debug
  generatingEco: boolean;        // Wave 12.b — true durante chamada do ipe-eco (mostra EcoLoadingScreen)
  loading: boolean;
  // ─── Audio (M2 & M4) ────────────────────────────────
  userId: string | null;
  audioLocale: string;
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
  PI:   { tensao: "Eu ↔ Pertencimento",       frase: "Eu me movi. Nem tudo veio comigo." },
  PII:  { tensao: "Eu ↔ Papel",            frase: "Ainda fazendo o que sempre fiz. Mas algo por dentro já não acompanha." },
  PIII: { tensao: "Presença ↔ Distância", frase: "Acabou. E agora consigo ver o que não via enquanto acontecia." },
  PIV:  { tensao: "Clareza ↔ Ação",    frase: "Eu sei o que é certo. E carrego o peso de agir sobre isso." },
  PV:   { tensao: "Dentro ↔ Fora",    frase: "Sem crise. Só uma abertura sem lugar claro pra ir ainda." },
  PVI:  { tensao: "Movimento ↔ Pausa",    frase: "Construindo algo que importa. A vertigem faz parte do trabalho." },
};

const FALLBACK_M2: Record<PillId, string> = {
  PI: `Marina tem 34 anos. A mãe está envelhecendo e, nos últimos meses, ficou claro que ela precisa de mais cuidado. Os irmãos não moram na mesma cidade. Marina mora.\n\nTodos concordam que "precisam fazer alguma coisa" — mas ninguém deu o primeiro passo.\n\nOntem à noite, depois de visitar a mãe, Marina ficou vinte minutos sentada no carro em frente à casa antes de ir embora. Não ligou para nenhum irmão. Só ficou ali, olhando a luz acesa no quarto da mãe.\n\nO que você acha que está acontecendo com Marina agora?`,
  PII:  "Descreva uma situação concreta em que Eu ↔ Papel ficou visível na sua vida cotidiana.\n\nO que você estava fazendo quando percebeu isso pela primeira vez?",
  PIII: "Descreva uma situação concreta em que Presença ↔ Distância ficou visível na sua vida cotidiana.\n\nO que você estava fazendo quando percebeu isso pela primeira vez?",
  PIV:  "Descreva uma situação concreta em que Clareza ↔ Ação ficou visível na sua vida cotidiana.\n\nO que você estava fazendo quando percebeu isso pela primeira vez?",
  PV:   "Descreva uma situação concreta em que Dentro ↔ Fora ficou visível na sua vida cotidiana.\n\nO que você estava fazendo quando percebeu isso pela primeira vez?",
  PVI:  "Descreva uma situação concreta em que Movimento ↔ Pausa ficou visível na sua vida cotidiana.\n\nO que você estava fazendo quando percebeu isso pela primeira vez?",
};

const FALLBACK_M3_2_SITUACAO: Record<PillId, string> = {
  PI: `Alguém próximo está fazendo algo que você considera errado. Não é ilegal. Mas vai contra o que você acredita.\n\nEssa pessoa não sabe que você sabe. E existe um custo real em qualquer direção que você escolha.`,
  PII:  "Ofereceram a você um papel que, para os outros, parece encaixar perfeitamente. Mas algo em você hesita.\n\nA oferta é real. O prazo é amanhã.",
  PIII: "Alguém de quem você era próximo voltou para sua vida. A distância entre vocês mudou os dois.\n\nVocê ainda não sabe se isso é bom ou ruim.",
  PIV:  "Você sabe o que precisa ser feito. Já sabe há algum tempo.\n\nO custo de agir está claro. O custo de esperar também.",
  PV:   "Você sente algo mudando, mas ainda não existe um nome claro para isso.\n\nAs pessoas ao redor parecem não notar. Ou talvez notem.",
  PVI:  "Você vem construindo algo há meses. Está funcionando — mas o ritmo está tirando algo de você.\n\nVocê ainda não sabe se isso é um problema ou apenas o custo.",
};

const FALLBACK_M3_2_OPCOES: Record<PillId, Array<{ id: "A"|"B"|"C"|"D"; text: string }>> = {
  PI: [
    { id: "A", text: "Não me envolvo. Cada pessoa é responsável pelas próprias escolhas." },
    { id: "B", text: "Falo diretamente com a pessoa. Aceito o que acontecer depois." },
    { id: "C", text: "Encontro um jeito de agir sem confronto direto — uma terceira via." },
    { id: "D", text: "Preciso de mais contexto antes de decidir qualquer coisa." },
  ],
  PII: [
    { id: "A", text: "Aceito. Estar alinhado com a expectativa dos outros basta por enquanto." },
    { id: "B", text: "Recuso. Confio mais na minha hesitação do que na certeza deles." },
    { id: "C", text: "Peço tempo e tento entender o que está movendo minha hesitação." },
    { id: "D", text: "Aceito, mas sustento o desconforto — e observo o que acontece." },
  ],
  PIII: [
    { id: "A", text: "Encontro a distância com distância. Espero para ver quem essa pessoa é agora." },
    { id: "B", text: "Levo quem eu sou agora. O que acontecer depois é informação." },
    { id: "C", text: "Reconheço a mudança diretamente. Parece desonesto não fazer isso." },
    { id: "D", text: "Preciso de mais tempo antes de saber como estar com essa pessoa." },
  ],
  PIV: [
    { id: "A", text: "Eu ajo. O custo de esperar é maior que o custo de me mover." },
    { id: "B", text: "Eu espero. Não estou pronto — e forçar pioraria as coisas." },
    { id: "C", text: "Dou um passo menor. Não tudo, mas alguma coisa." },
    { id: "D", text: "Nomeio o conflito em voz alta — para mim ou para outra pessoa." },
  ],
  PV: [
    { id: "A", text: "Fico em silêncio. Ainda é cedo demais para nomear." },
    { id: "B", text: "Falo mesmo assim. Nomear talvez me ajude a entender." },
    { id: "C", text: "Ajo como se entendesse, mesmo sem entender — e vejo o que aprendo." },
    { id: "D", text: "Procuro aquilo que talvez eu esteja evitando ao não nomear." },
  ],
  PVI: [
    { id: "A", text: "Continuo. O custo é aceitável. O trabalho vale isso." },
    { id: "B", text: "Desacelero. O ritmo está me dizendo algo que preciso ouvir." },
    { id: "C", text: "Termino esta fase e depois reavalio. Não consigo decidir no meio." },
    { id: "D", text: "Tento nomear o que está sendo tirado — antes de decidir o que fazer." },
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
  const navigate = useNavigate();
  const counter = HEADER_LABEL[moment];
  return (
    <>
      <div ref={ref} className="r-header">
        <span className="r-header-label">
          <span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>{counter ? ` · pills · ${counter}` : " · pills"}
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
  disabled?: boolean;
}
const Footer = forwardRef<HTMLDivElement, FooterProps>(({
  onBack, onContinue, continueLabel = "continuar",
  disabled = false,
}, ref) => {
  return (
    <>
      <div className="r-line" />
      <div ref={ref} className="r-footer">
        {onBack && <span className="r-footer-back" onClick={onBack}>‹</span>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          {onContinue && (
            <span
              className="r-footer-action"
              onClick={disabled ? undefined : onContinue}
              style={{ opacity: disabled ? 0.3 : 1, cursor: disabled ? "default" : "pointer" }}
            >
              {continueLabel}
            </span>
          )}
        </div>
      </div>
    </>
  );
});
Footer.displayName = "Footer";

const InvisibleTextarea = forwardRef<HTMLDivElement, {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
  recorder?: React.ReactNode; onSend?: () => void; sendActive?: boolean;
}>(({ value, onChange, placeholder = "escreva aqui", disabled = false, recorder, onSend, sendActive = false }, fwdRef) => {
  return (
    <div ref={fwdRef} className={`r-input-wrap${disabled ? " disabled" : ""}`}>
      <AutoResizeTextarea
        className="r-textarea" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={1}
        maxRows={5}
        disabled={disabled}
        readOnly={disabled}
      />
      {recorder}
      {onSend && (
        <button
          type="button"
          className={`r-send-dot${sendActive ? " active" : ""}`}
          onClick={sendActive ? onSend : undefined}
          disabled={!sendActive}
          aria-label="enviar"
          style={{ cursor: sendActive ? "pointer" : "default" }}
        />
      )}
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
    m3_3_condicao: "", m3_3_transversal: "", m4Input: "",
    ecoText: "", ecoLines: [], ecoMirror: "", ecoQuestion: "",
    ecoMicrotitle: "", ecoOperatorHint: "cost", ecoCtaText: "conversar com reed",
    reviewMode: false,
    m4Saved: false, ecoFailed: false, ecoErrorMsg: "",
    generatingEco: false,
    loading: false,
    userId: null,
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
      }

      // Wave 10 — detecta pill_response existente (mesmo sem eco)
      const { data: existingResp } = await supabase
        .from("pill_responses")
        .select("m2_resposta, m3_respostas, m4_resposta, eco_text, prompt_version_used")
        .eq("ipe_cycle_id", cycle.id)
        .eq("pill_id", pillId)
        .maybeSingle();

      const hasResponses = !!(existingResp?.m2_resposta || existingResp?.m3_respostas || existingResp?.m4_resposta);
      const isReview = !!(existingResp?.eco_text && existingResp.eco_text.length > 0);

      let prefillState: Partial<State> = {};
      if (hasResponses && existingResp) {
        // Wave 12 — pre-fill robusto: cobre formato NOVO (M3_1_regua/M3_2_escolha/M3_3_inventario)
        // e formato ANTIGO (chaves flat tipo "3_1_situacao_oposta") + todos campos faltantes.
        const m3 = (existingResp.m3_respostas as Record<string, unknown>) ?? {};
        const m4 = (existingResp.m4_resposta as Record<string, unknown>) ?? {};

        const m3_1_obj = (m3["M3_1_regua"] as Record<string, unknown>) ?? {};
        const m3_2_obj = (m3["M3_2_escolha"] as Record<string, unknown>) ?? {};
        const m3_3_obj = (m3["M3_3_inventario"] as Record<string, unknown>) ?? {};

        const pickStr = (...vals: unknown[]): string => {
          for (const v of vals) if (typeof v === "string" && v.trim().length > 0) return v;
          return "";
        };
        const pickPos = (...vals: unknown[]): number | null => {
          for (const v of vals) {
            if (typeof v === "number" && Number.isFinite(v)) return v;
            if (typeof v === "string") {
              const n = Number(v);
              if (Number.isFinite(n)) return n;
            }
          }
          return null;
        };

        prefillState = {
          m2Input: existingResp.m2_resposta ?? "",
          // M3.1
          m3_1_situacaoOposta: pickStr(m3_1_obj["situacao_oposta"], m3["3_1_situacao_oposta"]),
          m3_1_duasPalavras: pickStr(m3_1_obj["duas_palavras"], m3["duas_palavras"]) || "—",
          m3_1_posicao: pickPos(m3_1_obj["posicao"], m3["posicao"]) ?? 3,
          // M3.2
          m3_2_opcao: (pickStr(m3_2_obj["opcao"], m3["3_2_opcao"]) || "B") as "A"|"B"|"C"|"D",
          m3_2_abreMao: pickStr(m3_2_obj["abre_mao"], m3["3_2_abre_mao"]),
          m3_2_followupC: pickStr(m3_2_obj["followup_C"], m3["3_2_followup_C"]),
          m3_2_followupD: pickStr(m3_2_obj["followup_D"], m3["3_2_followup_D"]),
          // M3.3
          m3_3_narrativa: pickStr(m3_3_obj["narrativa"], m3["3_3_narrativa"], m3["narrativa"]),
          m3_3_condicao: pickStr(m3_3_obj["condicao"], m3["3_3_condicao"], m3["condicao"]),
          m3_3_transversal: pickStr(
            m3_3_obj["transversal_l13"],
            m3_3_obj["cobertura_L1_3"],
            m3["transversal_l13"],
            m3["3_3_transversal"]
          ),
          // M4 — cobre todas as chaves usadas por PI..PVI (percepcao, narrativa, presenca_*)
          m4Input: pickStr(
            m4["percepcao"],
            m4["narrativa"],
            m4["presenca_para_outros"],
            m4["presenca_deslocamento"],
            m4["conhecimento_em_campo"]
          ),
        };

        // Se ECO TAMBÉM existe → modo review (read-only + vai direto pro M5)
        if (isReview) {
          const ecoLines = existingResp.eco_text!
            .split("\n")
            .map(l => l.trim())
            .filter(l => l && !l.startsWith("—"));

          let ctaText = "conversar com reed";
          let microtitle = "";
          let opHint = "cost";
          try {
            const { data: lastEvt } = await supabase
              .from("pill_eco_events")
              .select("raw_payload")
              .eq("ipe_cycle_id", cycle.id)
              .eq("pill_id", pillId)
              .order("rendered_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastEvt?.raw_payload) {
              const rp = lastEvt.raw_payload as Record<string, unknown>;
              if (typeof rp.cta_text === "string") ctaText = rp.cta_text;
              if (typeof rp.microtitle === "string") microtitle = rp.microtitle;
              const det = rp.detector as Record<string, unknown> | undefined;
              if (det && typeof det.operator_hint === "string") opHint = det.operator_hint;
            }
          } catch (e) { console.warn("[PillFlow] failed to fetch CTA from telemetry:", e); }

          prefillState = {
            ...prefillState,
            ecoText: existingResp.eco_text!,
            ecoLines,
            ecoMicrotitle: microtitle,
            ecoOperatorHint: opHint,
            ecoCtaText: ctaText,
            reviewMode: true,
            moment: "M5" as Moment,
          };
        }
        // Se respostas existem mas eco NÃO → continua flow normal (M1) com state pré-preenchido.
        // Usuário clica continuar a partir do M1, vê seus textos, e o submit M4 final dispara ipe-eco.
      }

      setState(s => ({
        ...s, ipeCycleId: cycle.id, cycleDisplay: display,
        variationKey, variationContent,
        loading: false, m1TimerStart: Date.now(),
        userId: session.user.id,
        ...prefillState,
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

  const submitM1 = async () => {
    if (!state.ipeCycleId || state.loading) return;
    setState(s => ({ ...s, loading: true }));
    const secs = Math.round((Date.now() - state.m1TimerStart) / 1000);
    try {
      const r = await callEdgeFunction<{ pill_response_id: string }>("ipe-pill-session", {
        ipe_cycle_id: state.ipeCycleId, pill_id: state.pillId, moment: "M1",
        payload: { tempo_segundos: secs },
        variation_key: state.variationKey,
      });
      setState(s => ({ ...s, pillResponseId: r.pill_response_id, moment: "M2", loading: false }));
    } catch (err) {
      console.error("[PillFlow] submitM1 failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Erro ao iniciar Pill (M1): " + msg);
      setState(s => ({ ...s, loading: false }));
      return;
    }
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
          audio_url:            state.m2AudioPath,
          audio_duration_ms:    state.m2AudioDurationMs,
          transcription_live:   state.m2TranscriptionLive || null,
          transcription_final:  state.m2TranscriptionFinal,
        },
      });
    } catch (err) {
      console.error("[PillFlow] submitM2 failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Erro ao salvar M2: " + msg);
      setState(s => ({ ...s, loading: false }));
      return;
    }
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
              transversal_l13: state.m3_3_transversal || null,
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
      return;
    }
    setState(s => ({ ...s, moment: "M4", loading: false }));
  };

  // Wave 12 — geração de eco isolada para retry barato (não re-salva M4)
  const generateEcoAndAdvance = async () => {
    // Wave 12.b — mostra EcoLoadingScreen durante geração
    setState(s => ({ ...s, loading: true, generatingEco: true, ecoFailed: false, ecoErrorMsg: "" }));
    try {
      const userName = localStorage.getItem("rdwth_user_name") || undefined;
      const eco = await callEdgeFunction<{
        eco_text: string;
        eco_lines?: string[];
        mirror?: string;
        question?: string;
        microtitle?: string | null;
        operator_hint?: string;
        cta_text?: string;
      }>("ipe-eco", {
        ipe_cycle_id: state.ipeCycleId,
        pill_id: state.pillId,
        ...(userName && { user_name: userName }),
      });

      const ecoText = eco.eco_text || "";
      let ecoLines: string[] = [];
      if (Array.isArray(eco.eco_lines) && eco.eco_lines.length > 0) {
        ecoLines = eco.eco_lines;
      } else if (ecoText) {
        ecoLines = ecoText.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("—"));
      }
      const ecoMicrotitle = eco.microtitle || "";
      const ecoOperatorHint = eco.operator_hint || "cost";
      const ecoCtaText = (eco.cta_text || "conversar com reed").replace(/\s*→+\s*$/u, "");
      const ecoMirror = eco.mirror || "";
      const ecoQuestion = eco.question || "";

      // Wave 12 — só avança se eco veio de fato (evita M5 vazia)
      if (!ecoText && ecoLines.length === 0) {
        throw new Error("eco vazio (texto e linhas ausentes)");
      }

      setState(s => ({
        ...s,
        ecoText, ecoLines, ecoMirror, ecoQuestion,
        ecoMicrotitle, ecoOperatorHint, ecoCtaText,
        moment: "M5", loading: false, generatingEco: false, ecoFailed: false, ecoErrorMsg: "",
      }));

      // Wave 14 — fire-and-forget: regen do deep reading depois que pill foi completed
      triggerDeepReadingRefresh(state.ipeCycleId);
    } catch (ecoErr) {
      console.error("[PillFlow] ipe-eco failed:", ecoErr);
      const msg = ecoErr instanceof Error ? ecoErr.message : String(ecoErr);
      setState(s => ({ ...s, loading: false, generatingEco: false, ecoFailed: true, ecoErrorMsg: msg }));
    }
  };

  const submitM4 = async () => {
    if (state.loading) return;
    // Wave 12 — se M4 já foi salvo (retry após falha do eco), pula direto pro eco
    if (state.m4Saved) {
      await generateEcoAndAdvance();
      return;
    }
    setState(s => ({ ...s, loading: true, ecoFailed: false, ecoErrorMsg: "" }));
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
          audio_url:            state.m4AudioPath,
          audio_duration_ms:    state.m4AudioDurationMs,
          transcription_live:   state.m4TranscriptionLive || null,
          transcription_final:  state.m4TranscriptionFinal,
        },
      });
      setState(s => ({ ...s, m4Saved: true }));
    } catch (err) {
      console.error("[PillFlow] submitM4 (save) failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Erro ao salvar M4: " + msg + "\n\nVer console (F12) para detalhes.");
      setState(s => ({ ...s, loading: false }));
      return;
    }
    await generateEcoAndAdvance();
  };

  // ─── M5 reveal ritual (v2.c.2 — 4 stages: microtitle, prosa, divisor, cta) ──
  const [m5Stage, setM5Stage] = useState(0);
  const [m5Arrived, setM5Arrived] = useState(false);

  useEffect(() => {
    if (state.moment !== "M5") {
      setM5Stage(0);
      setM5Arrived(false);
      return;
    }
    const arrivalTimer = setTimeout(() => setM5Arrived(true), 800);
    // 4 stages: microtitle (1.0s) → prosa (1.6s) → divisor (2.6s) → cta (3.2s)
    const stageDelays = [1000, 1600, 2600, 3200];
    const timers = stageDelays.map((delay, i) =>
      setTimeout(() => setM5Stage(s => Math.max(s, i + 1)), delay)
    );
    return () => {
      clearTimeout(arrivalTimer);
      timers.forEach(clearTimeout);
    };
  }, [state.moment]);

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
      <div className="r-scroll" style={{ padding: "28px 24px 16px" }}>
        {state.loading ? (
          <div style={{ minHeight: 120 }} />
        ) : (
          <>
            {/* Wave 12.b — word-by-word reveal (~1s frase, ~0.6s tensão) */}
            <RevealText as="div" mode="word" text={m1Content.frase} duration={1000} fadeMs={220} className="r-impact" />
            <RevealText as="div" mode="word" text={m1Content.tensao} duration={600} fadeMs={180} className="r-tension" style={{ marginTop: 14 }} />
          </>
        )}
      </div>
      <Footer onBack={() => navigate("/home")} onContinue={submitM1}
        continueLabel={state.loading ? "..." : "começar"}
        disabled={state.loading || !state.ipeCycleId} />
    </div>
  );

  // ─── M2: Narrative scene ──────────────────────────────────────
  if (moment === "M2") return (
    <div className="r-screen">
      <Header moment="M2" />
      <div className="r-scroll" style={{ padding: "28px 24px 16px" }}>
        <div className="r-narrative" style={{ whiteSpace: "pre-line", marginBottom: 24 }}>{m2Text}</div>
        <InvisibleTextarea
          value={state.m2Input}
          onChange={v => setState(s => ({ ...s, m2Input: v }))}
          disabled={state.reviewMode}
          onSend={state.reviewMode ? () => advance("M3_1") : submitM2}
          sendActive={state.reviewMode || (!state.loading && !!state.m2Input.trim())}
          recorder={!state.reviewMode && state.userId && state.ipeCycleId ? (
            <AudioRecorder userId={state.userId} cycleId={state.ipeCycleId} pillId={state.pillId} moment="m2" language={state.audioLocale}
              onLiveTranscript={text => setState(s => ({ ...s, m2Input: text, m2TranscriptionLive: text }))}
              onFinalTranscript={text => setState(s => ({ ...s, m2Input: text, m2TranscriptionFinal: text }))}
              onAudioStored={info => setState(s => ({ ...s, m2AudioPath: info.path, m2AudioDurationMs: info.durationMs }))}
              disabled={state.loading} />
          ) : undefined}
        />
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: state.reviewMode ? "M5" : "M1" }))} />
    </div>
  );

  // ─── M3_1: Bipolar scale ─────────────────────────────────────
  if (moment === "M3_1") return (
    <div className="r-screen">
      <Header moment="M3_1" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 24px 16px", maxWidth: 600, width: "100%", marginLeft: "auto", marginRight: "auto" }}>
        <div className="r-question" style={{ marginBottom: 20 }}>{m3_1Content.question}</div>
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
            <InvisibleTextarea value={state.m3_1_duasPalavras} onChange={v => setState(s => ({ ...s, m3_1_duasPalavras: v }))} placeholder="duas palavras para essa posição" disabled={state.reviewMode} />
            <InvisibleTextarea value={state.m3_1_situacaoOposta} onChange={v => setState(s => ({ ...s, m3_1_situacaoOposta: v }))} placeholder="como seria o oposto?" disabled={state.reviewMode} />
          </div>
        )}
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M2" }))}
        onContinue={() => advance("M3_2")}
        disabled={state.reviewMode ? false : (state.m3_1_posicao === null || !state.m3_1_duasPalavras.trim() || !state.m3_1_situacaoOposta.trim())} />
    </div>
  );

  // ─── M3_2: Impossible choice ──────────────────────────────────
  if (moment === "M3_2") {
    const { scenario, options } = m3_2Content;
    const selectedOption = options.find(o => o.id === state.m3_2_opcao);
    return (
      <div className="r-screen">
        <Header moment="M3_2" />
        <div className="r-scroll" style={{ padding: "28px 24px 16px" }}>
          <div className="r-narrative" style={{ whiteSpace: "pre-line", marginBottom: 24 }}>{scenario}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            {options.map(o => (
              <div key={o.id} className="r-choice" style={{ cursor: state.reviewMode ? "default" : "pointer" }}
                onClick={() => !state.reviewMode && setState(s => ({ ...s, m3_2_opcao: o.id as "A"|"B"|"C"|"D" }))}>
                <div className={`r-choice-dot${state.m3_2_opcao === o.id ? " selected" : ""}`} style={{ marginTop: 5 }} />
                <div className={`r-choice-text${state.m3_2_opcao === o.id ? " selected" : ""}`}>{o.text}</div>
              </div>
            ))}
          </div>
          {selectedOption && selectedOption.followupType === "question" && (
            <div style={{ marginBottom: 20 }}>
              <div className="r-question" style={{ marginBottom: 12, fontSize: 14 }}>{selectedOption.followup}</div>
              {state.m3_2_opcao === "C" && (
                <InvisibleTextarea value={state.m3_2_followupC} onChange={v => setState(s => ({ ...s, m3_2_followupC: v }))} disabled={state.reviewMode} />
              )}
              {state.m3_2_opcao === "D" && (
                <InvisibleTextarea value={state.m3_2_followupD} onChange={v => setState(s => ({ ...s, m3_2_followupD: v }))} disabled={state.reviewMode} />
              )}
            </div>
          )}
          {state.m3_2_opcao && (
            <div style={{ marginBottom: 24 }}>
              <div className="r-question" style={{ marginBottom: 12, fontSize: 14 }}>
                {selectedOption?.followupType === "cost" ? selectedOption.followup : "O que você abre mão ao escolher isso?"}
              </div>
              <InvisibleTextarea value={state.m3_2_abreMao} onChange={v => setState(s => ({ ...s, m3_2_abreMao: v }))} disabled={state.reviewMode} />
            </div>
          )}
          <div style={{ height: 16 }} />
        </div>
        <Footer onBack={() => setState(s => ({ ...s, moment: "M3_1" }))}
          onContinue={() => advance("M3_3")}
          disabled={state.reviewMode ? false : (!state.m3_2_opcao || !state.m3_2_abreMao.trim())} />
      </div>
    );
  }

  // ─── M3_3: Inventory ──────────────────────────────────────────
  if (moment === "M3_3") return (
    <div className="r-screen">
      <Header moment="M3_3" />
      <div className="r-scroll" style={{ padding: "28px 24px 16px" }}>
        <div className="r-question" style={{ marginBottom: 14 }}>{m3_3Content.q1}</div>
        <InvisibleTextarea value={state.m3_3_narrativa} onChange={v => setState(s => ({ ...s, m3_3_narrativa: v }))} disabled={state.reviewMode} />
        <div style={{ height: 32 }} />
        <div className="r-question" style={{ marginBottom: 14 }}>{m3_3Content.q2}</div>
        <InvisibleTextarea value={state.m3_3_condicao} onChange={v => setState(s => ({ ...s, m3_3_condicao: v }))} disabled={state.reviewMode} />
        {m3_3Content.qTransversal && (
          <>
            <div style={{ height: 32 }} />
            <div className="r-question" style={{ marginBottom: 14 }}>{m3_3Content.qTransversal}</div>
            <InvisibleTextarea value={state.m3_3_transversal} onChange={v => setState(s => ({ ...s, m3_3_transversal: v }))} disabled={state.reviewMode} />
          </>
        )}
        <div style={{ height: 24 }} />
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M3_2" }))}
        onContinue={state.reviewMode ? () => advance("M4") : submitM3}
        continueLabel={state.loading ? "..." : "continuar"}
        disabled={state.loading || (!state.reviewMode && (!state.m3_3_narrativa.trim() || !state.m3_3_condicao.trim()))} />
    </div>
  );

  // ─── M4: Self-observation ─────────────────────────────────────
  if (moment === "M4") return (
    <div className="r-screen">
      <Header moment="M4" />
      {/* Wave 12.b — overlay full-screen com morph + pulse + frase rotativa enquanto ipe-eco gera */}
      {state.generatingEco && <EcoLoadingScreen />}
      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="r-question">{m4Content.question}</div>
        <div className="r-sub">{m4Content.instruction}</div>
        <div style={{ marginTop: 10 }}>
          <InvisibleTextarea
            value={state.m4Input}
            onChange={v => setState(s => ({ ...s, m4Input: v }))}
            disabled={state.reviewMode}
            onSend={state.reviewMode ? () => setState(s => ({ ...s, moment: "M5" })) : submitM4}
            sendActive={state.reviewMode || (!state.loading && !!state.m4Input.trim())}
            recorder={!state.reviewMode && state.userId && state.ipeCycleId ? (
              <AudioRecorder userId={state.userId} cycleId={state.ipeCycleId} pillId={state.pillId} moment="m4" language={state.audioLocale}
                onLiveTranscript={text => setState(s => ({ ...s, m4Input: text, m4TranscriptionLive: text }))}
                onFinalTranscript={text => setState(s => ({ ...s, m4Input: text, m4TranscriptionFinal: text }))}
                onAudioStored={info => setState(s => ({ ...s, m4AudioPath: info.path, m4AudioDurationMs: info.durationMs }))}
                disabled={state.loading} />
            ) : undefined}
          />
        </div>
        {/* Wave 12 — erro inline do eco com retry barato */}
        {state.ecoFailed && !state.loading && (
          <div style={{
            padding: "12px 16px", marginTop: 12,
            background: "rgba(184,90,62,0.08)", border: "1px solid rgba(184,90,62,0.25)",
            borderRadius: 8, fontSize: 13, lineHeight: 1.5,
          }}>
            <div style={{ color: "var(--terracota, #b85a3e)", marginBottom: 4 }}>
              suas respostas foram salvas, mas o eco não veio.
            </div>
            <div style={{ opacity: 0.7, fontSize: 11 }}>
              clique em <strong>tentar de novo</strong> abaixo. nada se perde.
            </div>
            {state.ecoErrorMsg && (
              <div style={{ opacity: 0.5, fontSize: 10, marginTop: 6, fontFamily: "monospace" }}>
                {state.ecoErrorMsg.slice(0, 200)}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer onBack={() => setState(s => ({ ...s, moment: "M3_3" }))} />
    </div>
  );

  // ─── M5: Echo (v2.c.2 — eco em prosa contínua + CTA contextual) ──────
  // Fallback chain: ecoLines (v2.c.2) → ecoText.split (cached path) → array vazio
  const linesToRender: string[] = state.ecoLines.length > 0
    ? state.ecoLines
    : state.ecoText
        ? state.ecoText.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("—"))
        : [];

  return (
    <div className="r-screen" style={{ position: "relative" }}>
      <Header moment="M5" />

      {/* Arrival ritual */}
      <div className={`r-arrival${m5Arrived ? " gone" : ""}`}>
        <span className="r-pulse"></span>
      </div>

      <div className="r-scroll-m5">
        {(() => {
          // Dedupe: se microtitle == primeira linha do eco_lines, esconde
          const cleanMicro = (state.ecoMicrotitle || "").toLowerCase().replace(/[.…!?]+\s*$/u, "").trim();
          const cleanFirst = (linesToRender[0] || "").toLowerCase().replace(/[.…!?]+\s*$/u, "").trim();
          const showMicrotitle = state.ecoMicrotitle && cleanMicro && cleanMicro !== cleanFirst;
          return showMicrotitle ? (
            <div className={`r-microtitle r-stage-in${m5Stage >= 1 ? " show" : ""}`}>
              {state.ecoMicrotitle}
            </div>
          ) : null;
        })()}

        <div className={`r-eco-prose r-stage-in${m5Stage >= 2 ? " show" : ""}`}>
          {linesToRender.map((line, i) =>
            line === ""
              ? <div key={i} className="r-eco-pause" />
              : <div key={i} className="r-eco-line">{line}</div>
          )}
        </div>

        <div className={`r-eco-divider r-stage-in${m5Stage >= 3 ? " show" : ""}`} />

        <div className={`r-talk r-stage-in${m5Stage >= 4 ? " show" : ""}`}>
          <a onClick={() => navigate("/reed")}>{state.ecoCtaText} →</a>
        </div>

        <div className={`r-talk-secondary r-stage-in${m5Stage >= 4 ? " show" : ""}`}>
          <a onClick={() => navigate("/pills")}>fazer outra pill →</a>
        </div>
      </div>

      <Footer
        onBack={() => navigate("/pills")}
        onContinue={state.reviewMode
          ? () => setState(s => ({ ...s, moment: "M2" }))
          : () => navigate("/pills")}
        continueLabel={state.reviewMode ? "ler respostas" : "continuar"}
      />
    </div>
  );
}
