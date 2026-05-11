// src/components/SystemVoiceSequence.tsx
// Sequência de voz do sistema 100% CSS-driven.
// Cada linha entra com typewriter (CSS animation width: 0 → Nch via steps).
// Sem JS timers — roda na GPU, não suspende quando JS thread está bloqueado
// por loads pesados do componente pai.
//
// Sequência (calculada por comprimento das frases):
//   t=0          → linha 1 entra (typewriter)
//   t=enter2     → linha 2 entra
//   t=enterHint  → hint entra
//   hint fica visível indefinidamente até `done=true` (parent controla)
//   done=true   → container faz fade-out
//
// Usage:
//   <SystemVoiceSequence phrases={[d1, d2, hint]} done={loadFinished} />

import { useEffect, useMemo, useState } from "react";

const STYLE_ID = "rdwth-voice-seq-styles";
const KEYFRAMES = `
@keyframes rdwth-voice-type {
  from { width: 0; }
  to   { width: var(--rdwth-w, 100%); }
}
`;

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
}

const TYPE_MS_PER_CHAR = 30;
const HOLD_AFTER_TYPE_MS = 1200;
const FADE_OUT_MS = 400;

interface Line {
  text: string;
  startMs: number;
  typeMs: number;
}

interface Props {
  /** Frases da voz. Pode ter 1, 2 ou 3 frases. A última é tratada como hint
   *  (fica visível indefinidamente após typewriter). */
  phrases: string[];
  /** Quando vira true, container faz fade-out (load do pai terminou) */
  done: boolean;
  /** Callback chamado após fade-out completar (pra clearFlow etc) */
  onFinish?: () => void;
  fontSize?: number;
}

export default function SystemVoiceSequence({
  phrases,
  done,
  onFinish,
  fontSize = 11,
}: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    injectStyles();
  }, []);

  // Calcula timing pra cada linha (sequencial).
  // Hint = última. Anteriores: typewriter + hold antes da próxima entrar.
  const lines = useMemo<Line[]>(() => {
    const arr: Line[] = [];
    let cursor = 0;
    phrases.forEach((text) => {
      const lowered = text.toLowerCase();
      const typeMs = Math.max(150, lowered.length * TYPE_MS_PER_CHAR);
      arr.push({ text: lowered, startMs: cursor, typeMs });
      cursor += typeMs + HOLD_AFTER_TYPE_MS;
    });
    return arr;
  }, [phrases]);

  // Quando `done` vira true, espera fade-out e chama onFinish
  useEffect(() => {
    if (!done) return;
    const tHide = window.setTimeout(() => setHidden(true), FADE_OUT_MS);
    const tFinish = window.setTimeout(() => onFinish?.(), FADE_OUT_MS + 50);
    return () => {
      window.clearTimeout(tHide);
      window.clearTimeout(tFinish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (hidden) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        opacity: done ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`,
        pointerEvents: "none",
      }}
    >
      {lines.map((line, idx) => (
        <div
          key={`${idx}-${line.text}`}
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize,
            lineHeight: 1.7,
            color: "var(--r-voice-sys)",
            letterSpacing: "0.04em",
            whiteSpace: "pre-wrap",
            margin: 0,
            minHeight: `${Math.round(fontSize * 1.7)}px`,
          }}
        >
          <span aria-hidden="true">{"> "}</span>
          <span
            style={{
              display: "inline-block",
              overflow: "hidden",
              whiteSpace: "nowrap",
              verticalAlign: "bottom",
              width: 0,
              animation: `rdwth-voice-type ${line.typeMs}ms steps(${line.text.length || 1}) ${line.startMs}ms forwards`,
              ["--rdwth-w" as keyof React.CSSProperties as string]: `${line.text.length}ch`,
            } as React.CSSProperties}
          >
            {line.text}
          </span>
        </div>
      ))}
    </div>
  );
}
