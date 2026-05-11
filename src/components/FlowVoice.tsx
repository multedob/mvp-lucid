// src/components/FlowVoice.tsx
// Voz do sistema durante uma transição flowTo() — overlay absoluto sobre o canvas.
//
// Tem 2 modos, escolhidos por flow.dest:
//
// MODO A (default — Pills, Reed, Context): 3 frases empilhadas, typewriter forward.
//   t=0      → linha 1 (diablo1)
//   t=1800   → linha 2 (diablo2)
//   t=3600   → linha 3 = extras[0] (rotaciona a cada 2500ms enquanto !ready)
//   ready    → linha 3 vira hint
//   hint     → hold ~1500ms → fade-out → clearFlow
//
// MODO B (Questionnaire): zig-zag com typewriter reverso e cobertura de loading lento.
//   t=0      → linha 1 = pool[0]
//   t=2000   → linha 2 = pool[1]
//   t=5500   → linha 1 substitui (reverse + forward) com pool[2]
//   t=9000   → linha 2 substitui com pool[3]
//   ...      → loop até ready
//   ready    → linha 3 (hint) ENTRA NOVA abaixo (linhas 1 e 2 mantêm o que estão)
//   hint     → hold ~2700ms → fade-out de tudo → clearFlow

import { useEffect, useRef, useState } from "react";
import { useFlow } from "@/hooks/useFlow";
import SystemTerminalLine from "./SystemTerminalLine";
import SystemCyclingLine from "./SystemCyclingLine";

const FADE_OUT_MS = 400;

// ─── Constantes Modo A ──────────────────────────────────────────────
const A_LINE_DELAY_MS = 1800;
const A_ROTATE_MS = 2500;
const A_HOLD_AFTER_HINT_MS = 1500;
const A_TYPE_BUFFER_MS = 1500;

// ─── Constantes Modo B ──────────────────────────────────────────────
const B_LINE2_DELAY_MS = 2000;        // entrada da linha 2 após mount
const B_STEP_MS = 3500;                // intervalo entre substituições (cobre reverse + forward)
const B_FORWARD_CHAR_MS = 30;
// Reverse não tem charDelay próprio — usa o mesmo tick do forward mas remove
// 2 chars por tick (efetivo ~15ms/char).
const B_HINT_TYPE_MS = 1500;
const B_HINT_HOLD_MS = 2700;

/** Tempo desde hintShown=true até conteúdo principal entrar. */
export const FLOW_HINT_DELAY_MS = 300;
/** Tempo total desde mount até conteúdo entrar — usado pelo Modo A (Pills/Reed/Context). */
export const FLOW_CONTENT_DELAY_MS =
  A_LINE_DELAY_MS * 2 + A_TYPE_BUFFER_MS + 200; // ~5300ms

// CyclingLine extraído pra ./SystemCyclingLine.tsx — reusado aqui e em
// outros lugares (ex: ContextThirdParty).
const CyclingLine = SystemCyclingLine;

// ─── Modo A ─────────────────────────────────────────────────────────

function FlowVoiceModeA() {
  const { flow, isFlowReady, clearFlow, _setHintShown } = useFlow();
  const [shownCount, setShownCount] = useState(0);
  const [line3Text, setLine3Text] = useState<string | null>(null);
  const [hintActive, setHintActive] = useState(false);
  const [fading, setFading] = useState(false);

  // Reset + entrada das 3 linhas
  useEffect(() => {
    if (!flow) {
      setShownCount(0);
      setLine3Text(null);
      setHintActive(false);
      setFading(false);
      return;
    }
    setShownCount(1);
    setLine3Text(null);
    setHintActive(false);
    setFading(false);

    const t1 = window.setTimeout(() => setShownCount(2), A_LINE_DELAY_MS);
    const t2 = window.setTimeout(() => {
      setShownCount(3);
      if (flow.extras.length === 0) {
        setLine3Text(flow.hint);
      } else {
        setLine3Text(flow.extras[0]);
      }
    }, A_LINE_DELAY_MS * 2);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [flow]);

  // Rotação da linha 3 enquanto !isFlowReady
  useEffect(() => {
    if (!flow) return;
    if (shownCount < 3) return;
    if (isFlowReady) return;
    if (flow.extras.length <= 1) return;

    const interval = window.setInterval(() => {
      setLine3Text((prev) => {
        const candidates = flow.extras.filter((e) => e !== prev);
        if (candidates.length === 0) return prev;
        return candidates[Math.floor(Math.random() * candidates.length)];
      });
    }, A_ROTATE_MS);
    return () => window.clearInterval(interval);
  }, [flow, shownCount, isFlowReady]);

  // Quando ready + linha 3 visível, substitui pela hint e arma fade-out
  useEffect(() => {
    if (!flow) return;
    if (!isFlowReady) return;
    if (shownCount < 3) return;
    if (hintActive) return;
    setLine3Text(flow.hint);
    setHintActive(true);
  }, [flow, isFlowReady, shownCount, hintActive]);

  // Fade-out quando hint mostrada
  useEffect(() => {
    _setHintShown(hintActive);
    if (!hintActive) return;
    const tFade = window.setTimeout(
      () => setFading(true),
      A_TYPE_BUFFER_MS + A_HOLD_AFTER_HINT_MS
    );
    const tClear = window.setTimeout(
      () => clearFlow(),
      A_TYPE_BUFFER_MS + A_HOLD_AFTER_HINT_MS + FADE_OUT_MS
    );
    return () => {
      window.clearTimeout(tFade);
      window.clearTimeout(tClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintActive]);

  if (!flow) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "12px 24px 0",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {shownCount >= 1 && <SystemTerminalLine text={flow.diablo1} />}
      {shownCount >= 2 && <SystemTerminalLine text={flow.diablo2} />}
      {shownCount >= 3 && line3Text && (
        <SystemTerminalLine key={line3Text} text={line3Text} />
      )}
    </div>
  );
}

// ─── Modo B (Questionnaire) ─────────────────────────────────────────

function FlowVoiceModeB() {
  const { flow, isFlowReady, clearFlow, _setHintShown } = useFlow();
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [hintText, setHintText] = useState(""); // 3ª linha — vazio até ready
  const [fading, setFading] = useState(false);

  // Ref pra ler hintText mais atual no callback do setInterval (evita pausar tarde demais)
  const hintTextRef = useRef(hintText);
  useEffect(() => { hintTextRef.current = hintText; }, [hintText]);

  // Sequência fixa por TIMER (independente de isFlowReady):
  //   t=0      → linha 1
  //   t=2000   → linha 2
  //   t=5500   → substituição linha 1
  //   t=9000   → substituição linha 2
  //   t=HINT_AT (~7000)  → hint aparece (3ª linha)
  //
  // A hint aparece após HINT_SHOW_AT_MS desde o início, INDEPENDENTE do destino.
  // O destino (Questionnaire) inicia seu load APENAS após hintShown=true — evitando
  // bloquear o JS thread durante as substituições.
  //
  // isFlowReady aqui sinaliza "conteúdo do destino pronto" — usado pra encerrar
  // a voz (fade-out). Até lá, a hint fica visível indefinidamente.
  const HINT_SHOW_AT_MS = 7000;

  useEffect(() => {
    if (!flow) {
      setLine1("");
      setLine2("");
      setHintText("");
      setFading(false);
      return;
    }

    setLine1(flow.pool[0] ?? "");
    setLine2("");
    setHintText("");
    setFading(false);

    let cancelled = false;
    let step = 1;
    let intervalId: number | null = null;

    const t1 = window.setTimeout(() => {
      if (cancelled) return;
      setLine2(flow.pool[1] ?? flow.pool[0] ?? "");
      step = 2;

      // Substituições a cada B_STEP_MS — até hint aparecer
      intervalId = window.setInterval(() => {
        if (cancelled) return;
        if (hintTextRef.current) return; // hint apareceu, pausa
        const phrase = flow.pool[step % flow.pool.length];
        if (step % 2 === 0) setLine1(phrase);
        else setLine2(phrase);
        step += 1;
      }, B_STEP_MS);
    }, B_LINE2_DELAY_MS);

    // Hint aparece após HINT_SHOW_AT_MS — independente de ready
    const tHint = window.setTimeout(() => {
      if (cancelled) return;
      setHintText(flow.hint);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }, HINT_SHOW_AT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(tHint);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  // Notifica hintShown sempre que hint aparece
  useEffect(() => {
    _setHintShown(!!hintText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintText]);

  // Fade-out só quando isFlowReady (conteúdo do destino pronto) E hint visível.
  // Hint fica visível indefinidamente até conteúdo estar pronto.
  useEffect(() => {
    if (!hintText) return;
    if (!isFlowReady) return;
    // Espera typewriter da hint completar + breve hold pra ler
    const tFade = window.setTimeout(() => setFading(true), B_HINT_HOLD_MS);
    const tClear = window.setTimeout(
      () => clearFlow(),
      B_HINT_HOLD_MS + FADE_OUT_MS
    );
    return () => {
      window.clearTimeout(tFade);
      window.clearTimeout(tClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintText, isFlowReady]);

  if (!flow) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "12px 24px 0",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <CyclingLine text={line1} />
      <CyclingLine text={line2} />
      {hintText && <CyclingLine text={hintText} />}
    </div>
  );
}

// ─── FlowVoice (decisão de modo) ────────────────────────────────────

export default function FlowVoice() {
  const { flow } = useFlow();
  if (!flow) return null;
  // Questionnaire e ThirdParty renderizam voz INLINE (SystemVoiceSequence),
  // pra evitar JS timers congelando quando o thread bloqueia no load.
  if (flow.dest === "questionnaire") return null;
  if (flow.dest === "thirdparty") return null;
  return <FlowVoiceModeA />;
}
