// src/components/SystemVoiceSequence.tsx
// Sequência de voz do sistema 100% CSS-driven.
// Cada linha entra com typewriter (CSS animation). Sem JS timers — anima na GPU.
//
// API:
//   phrases     — frases a renderizar em sequência (typewriter forward)
//   onHintReady — disparado quando a ÚLTIMA frase (hint) terminou typewriter.
//                 Usa onAnimationEnd da CSS animation (robusto a thread blocking).
//   fadeOut     — quando vira true, container faz fade-out 400ms.
//                 Parent só seta true APÓS o conteúdo principal entrar
//                 (= voz sai DEPOIS da pergunta aparecer).
//   onFinish    — callback após fade-out completar (pra clearFlow etc).
//
// Sequência típica de uso (Questionnaire):
//   t=0           render → voz começa
//   t=~hint_ready onHintReady dispara → parent marca voiceHintReady
//   parent espera: hintReady && dataReady → revela pergunta
//   após pergunta visível → parent seta fadeOut=true → voz sai
//   onFinish → clearFlow

import { useEffect, useMemo, useState } from "react";

const STYLE_ID = "rdwth-voice-seq-styles";
const KEYFRAMES = `
@keyframes rdwth-voice-type {
  from { width: 0; }
  to   { width: var(--rdwth-w, 100%); }
}
@keyframes rdwth-voice-appear {
  from { opacity: 0; }
  to   { opacity: 1; }
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
  phrases: string[];
  /** Quando vira true, container faz fade-out. Parent controla quando isso acontece
   *  (idealmente DEPOIS de o conteúdo principal já estar visível). */
  fadeOut: boolean;
  /** Disparado quando a hint (última frase) terminar typewriter. */
  onHintReady?: () => void;
  /** Callback após fade-out completar. */
  onFinish?: () => void;
  fontSize?: number;
}

export default function SystemVoiceSequence({
  phrases,
  fadeOut,
  onHintReady,
  onFinish,
  fontSize = 11,
}: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    injectStyles();
  }, []);

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

  // Após fade-out completar, esconde e chama onFinish
  useEffect(() => {
    if (!fadeOut) return;
    const tHide = window.setTimeout(() => setHidden(true), FADE_OUT_MS);
    const tFinish = window.setTimeout(() => onFinish?.(), FADE_OUT_MS + 50);
    return () => {
      window.clearTimeout(tHide);
      window.clearTimeout(tFinish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fadeOut]);

  if (hidden) return null;

  const hintIndex = lines.length - 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        opacity: fadeOut ? 0 : 1,
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
            // Linha inteira (incluindo "> ") só aparece quando typewriter começa
            opacity: 0,
            animation: `rdwth-voice-appear 1ms ${line.startMs}ms forwards`,
          }}
        >
          <span aria-hidden="true">{"> "}</span>
          <span
            onAnimationEnd={
              idx === hintIndex
                ? () => {
                    onHintReady?.();
                  }
                : undefined
            }
            style={{
              display: "inline-block",
              overflow: "hidden",
              whiteSpace: "nowrap",
              verticalAlign: "bottom",
              width: 0,
              animation: `rdwth-voice-type ${line.typeMs}ms steps(${line.text.length || 1}) ${line.startMs}ms forwards`,
              // +2ch compensa o letter-spacing 0.04em acumulado (~0.04 × N chars)
              ["--rdwth-w" as keyof React.CSSProperties as string]: `calc(${line.text.length}ch + 2ch)`,
            } as React.CSSProperties}
          >
            {line.text}
          </span>
        </div>
      ))}
    </div>
  );
}
