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
const B_REVERSE_CHAR_MS = 18;
const B_HINT_TYPE_MS = 1500;
const B_HINT_HOLD_MS = 2700;

/** Tempo desde hintShown=true até conteúdo principal entrar. */
export const FLOW_HINT_DELAY_MS = 300;
/** Tempo total desde mount até conteúdo entrar — usado pelo Modo A (Pills/Reed/Context). */
export const FLOW_CONTENT_DELAY_MS =
  A_LINE_DELAY_MS * 2 + A_TYPE_BUFFER_MS + 200; // ~5300ms

// ─── CyclingLine (Modo B) ───────────────────────────────────────────
// Linha que faz typewriter forward na entrada e reverse + forward ao trocar texto.
// Phase é DERIVADO do estado (displayed vs target) — não usa state machine que
// pode descincronizar. Usa requestAnimationFrame com tracking de timestamp pra
// distinguir velocidade forward/reverse.

function CyclingLine({ text: rawText }: { text: string }) {
  // Voz do sistema é SEMPRE minúscula.
  const text = rawText.toLowerCase();
  const [displayed, setDisplayed] = useState("");
  const targetRef = useRef(text);

  // Atualiza o target quando text muda. Loop reage automaticamente via comparação.
  useEffect(() => {
    targetRef.current = text;
  }, [text]);

  // Animation loop único, baseado em RAF + timestamp. Phase derivado a cada tick.
  useEffect(() => {
    let cancelled = false;
    let lastTickTs = 0;
    let raf = 0;

    const animate = (now: number) => {
      if (cancelled) return;

      setDisplayed((prev) => {
        const target = targetRef.current;
        // Phase derivado:
        //   prev === target              → shown (parado)
        //   target.startsWith(prev)      → forward (digitar próximo char)
        //   senão                        → reverse (apagar último char)
        const phase: "forward" | "shown" | "reverse" =
          prev === target
            ? "shown"
            : target.startsWith(prev)
              ? "forward"
              : "reverse";

        if (phase === "shown") return prev;

        const required =
          phase === "reverse" ? B_REVERSE_CHAR_MS : B_FORWARD_CHAR_MS;
        if (now - lastTickTs < required) return prev;

        lastTickTs = now;
        if (phase === "forward") {
          return target.slice(0, prev.length + 1);
        }
        return prev.slice(0, -1);
      });

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  const isShown = displayed === text;
  const hasContent = displayed.length > 0 || !isShown;

  return (
    <div
      style={{
        fontFamily: "var(--r-font-sys)",
        fontWeight: 300,
        fontSize: 11,
        lineHeight: 1.7,
        color: "var(--r-voice-sys)",
        letterSpacing: "0.04em",
        whiteSpace: "pre-wrap",
        margin: 0,
        minHeight: `${Math.round(11 * 1.7)}px`,
      }}
    >
      {hasContent && (
        <>
          <span aria-hidden="true">{"> "}</span>
          {displayed}
          {!isShown && (
            <span style={{ display: "inline-block", marginLeft: 2 }}>█</span>
          )}
        </>
      )}
    </div>
  );
}

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
        padding: "10px 24px 0",
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
  const [hintText, setHintText] = useState(""); // 3ª linha (hint) — vazio até ready
  const [fading, setFading] = useState(false);

  const stepRef = useRef(2); // próximo índice do pool a usar (pool[0]=line1 inicial; pool[1]=line2 entry)
  const nextLineRef = useRef<1 | 2>(1); // próxima linha a substituir

  // Mount: linha 1 = pool[0]
  useEffect(() => {
    if (!flow) {
      setLine1("");
      setLine2("");
      setHintText("");
      setFading(false);
      stepRef.current = 2;
      nextLineRef.current = 1;
      return;
    }
    setLine1(flow.pool[0] ?? "");
    setLine2("");
    setHintText("");
    setFading(false);
    stepRef.current = 2;
    nextLineRef.current = 1;
  }, [flow]);

  // Entrada inicial da linha 2 — 2000ms após mount (logo após linha 1 completar)
  useEffect(() => {
    if (!flow) return;
    if (line2 !== "") return;
    if (hintText) return;
    const t = window.setTimeout(() => {
      setLine2(flow.pool[1] ?? flow.pool[0] ?? "");
    }, B_LINE2_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [flow, line2, hintText]);

  // Tick interval — substitui linhas alternadamente (só após linha 2 entrar e !ready/!hint)
  useEffect(() => {
    if (!flow) return;
    if (line2 === "") return;
    if (hintText) return;
    if (isFlowReady) return; // hint cuidado pelo useEffect abaixo

    const interval = window.setInterval(() => {
      const phrase = flow.pool[stepRef.current % flow.pool.length];
      if (nextLineRef.current === 1) {
        setLine1(phrase);
        nextLineRef.current = 2;
      } else {
        setLine2(phrase);
        nextLineRef.current = 1;
      }
      stepRef.current += 1;
    }, B_STEP_MS);

    return () => window.clearInterval(interval);
  }, [flow, line2, hintText, isFlowReady]);

  // Quando isFlowReady, hint entra como 3ª linha NOVA (linhas 1 e 2 mantêm seu texto)
  useEffect(() => {
    if (!flow) return;
    if (!isFlowReady) return;
    if (hintText) return;
    setHintText(flow.hint);
  }, [flow, isFlowReady, hintText]);

  // Quando hint setada, notifica + arma fade-out
  useEffect(() => {
    _setHintShown(!!hintText);
    if (!hintText) return;
    const tFade = window.setTimeout(
      () => setFading(true),
      B_HINT_TYPE_MS + B_HINT_HOLD_MS
    );
    const tClear = window.setTimeout(
      () => clearFlow(),
      B_HINT_TYPE_MS + B_HINT_HOLD_MS + FADE_OUT_MS
    );
    return () => {
      window.clearTimeout(tFade);
      window.clearTimeout(tClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintText]);

  if (!flow) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "10px 24px 0",
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
  if (flow.dest === "questionnaire") {
    return <FlowVoiceModeB />;
  }
  return <FlowVoiceModeA />;
}
