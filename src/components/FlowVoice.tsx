// src/components/FlowVoice.tsx
// Voz do sistema durante uma transição flowTo() — overlay absoluto sobre o canvas.
//
// Alternação ZIG-ZAG (uma linha por vez), com typewriter REVERSO ao trocar:
//   t=0      → linha 1 = pool[0]   (forward typewriter)
//   t=STEP   → linha 2 = pool[1]   (forward — linha 1 mantém)
//   t=2STEP  → linha 1 = pool[2]   (reverse pool[0] → forward pool[2])
//   t=3STEP  → linha 2 = pool[3]   (reverse pool[1] → forward pool[3])
//   ...      → loop até isFlowReady
//
// Quando isFlowReady, no próximo tick: linha 1 → hint, linha 2 → "" (reverse vazio).
// Após ~typewriter da hint completa, hintShown=true. Hold ~2700ms → fade-out → clearFlow.

import { useEffect, useRef, useState } from "react";
import { useFlow } from "@/hooks/useFlow";

const STEP_INTERVAL_MS = 3500;     // intervalo entre cada substituição de linha
const FORWARD_CHAR_MS = 30;        // ms por char ao digitar
const REVERSE_CHAR_MS = 18;        // ms por char ao apagar (mais rápido que digitar)
const HINT_REVERSE_FORWARD_MS = 2300; // ~ tempo pra linha 1 fazer reverse + forward(hint)
const HINT_HOLD_MS = 2700;
const FADE_OUT_MS = 400;

/** Tempo desde hintShown=true até conteúdo principal entrar. */
export const FLOW_HINT_DELAY_MS = 300;
/** Alias mantido por compatibilidade. */
export const FLOW_CONTENT_DELAY_MS = FLOW_HINT_DELAY_MS;

// ─── CyclingLine ────────────────────────────────────────────────────
// Linha que faz typewriter forward na entrada, reverse + forward ao trocar texto.
// Vazio quando text="" (apaga e fica em branco). Cursor visível enquanto não shown.

type LinePhase = "forward" | "shown" | "reverse";

function CyclingLine({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<LinePhase>("forward");
  const targetRef = useRef(text);

  // Sync target. Se text mudar enquanto shown, dispara reverse.
  useEffect(() => {
    targetRef.current = text;
    setPhase((current) => (current === "shown" ? "reverse" : current));
  }, [text]);

  // Animation loop reativo ao phase.
  useEffect(() => {
    if (phase === "shown") return;
    const delay = phase === "reverse" ? REVERSE_CHAR_MS : FORWARD_CHAR_MS;

    const interval = window.setInterval(() => {
      if (phase === "forward") {
        setDisplayed((prev) => {
          const target = targetRef.current;
          if (prev === target) {
            setPhase("shown");
            return prev;
          }
          if (target.startsWith(prev)) {
            return target.slice(0, prev.length + 1);
          }
          // Mismatch (target mudou no meio do digit): vai pra reverse
          setPhase("reverse");
          return prev;
        });
      } else {
        setDisplayed((prev) => {
          if (prev.length === 0) {
            setPhase("forward");
            return prev;
          }
          return prev.slice(0, -1);
        });
      }
    }, delay);

    return () => window.clearInterval(interval);
  }, [phase]);

  const hasContent = displayed.length > 0 || phase !== "shown";

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
          {phase !== "shown" && (
            <span style={{ display: "inline-block", marginLeft: 2 }}>█</span>
          )}
        </>
      )}
    </div>
  );
}

// ─── FlowVoice ──────────────────────────────────────────────────────

export default function FlowVoice() {
  const { flow, isFlowReady, clearFlow, _setHintShown } = useFlow();
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [hint, setHint] = useState(false);
  const [fading, setFading] = useState(false);

  // Tracking do índice atual no pool
  const stepRef = useRef(0);

  // Reset interno + entrada inicial da linha 1
  useEffect(() => {
    if (!flow) {
      setLine1("");
      setLine2("");
      setHint(false);
      setFading(false);
      stepRef.current = 0;
      return;
    }
    setLine1(flow.pool[0] ?? "");
    setLine2("");
    setHint(false);
    setFading(false);
    stepRef.current = 1;
  }, [flow]);

  // Tick de alternação. Step ímpar → atualiza linha 2; par → atualiza linha 1.
  // Quando isFlowReady, próximo tick troca pra hint (linha 1) + apaga linha 2.
  useEffect(() => {
    if (!flow) return;
    if (hint) return;

    const interval = window.setInterval(() => {
      if (isFlowReady) {
        setLine1(flow.hint);
        setLine2("");
        setHint(true);
        window.clearInterval(interval);
        return;
      }
      const idx = stepRef.current;
      const phrase = flow.pool[idx % flow.pool.length];
      if (idx % 2 === 1) {
        setLine2(phrase);
      } else {
        setLine1(phrase);
      }
      stepRef.current = idx + 1;
    }, STEP_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [flow, isFlowReady, hint]);

  // Quando hint vira true: aguarda transição reverse+forward da linha 1, marca
  // hintShown, hold, fade-out, clearFlow.
  useEffect(() => {
    _setHintShown(false);
    if (!hint) return;

    const tShown = window.setTimeout(() => _setHintShown(true), HINT_REVERSE_FORWARD_MS);
    const tFade = window.setTimeout(
      () => setFading(true),
      HINT_REVERSE_FORWARD_MS + HINT_HOLD_MS
    );
    const tClear = window.setTimeout(
      () => clearFlow(),
      HINT_REVERSE_FORWARD_MS + HINT_HOLD_MS + FADE_OUT_MS
    );

    return () => {
      window.clearTimeout(tShown);
      window.clearTimeout(tFade);
      window.clearTimeout(tClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint]);

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
    </div>
  );
}
