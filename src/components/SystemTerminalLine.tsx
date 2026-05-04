// src/components/SystemTerminalLine.tsx
// Voz terminal D — primitivo reusável do sistema de 4 vozes (ONB-7 §1.5)
// Renderiza: prefixo "> " + texto digitado char por char + cursor "█" piscando 2x e parando.
// Tipografia: IBM Plex Mono, weight 300, cor --r-voice-sys (cinza WCAG AA).
//
// Props:
// - text: conteúdo a digitar
// - showCursor: exibe cursor (default true)
// - fontSize: tamanho em px (default 11)
// - charDelayMs: ms por caractere (default 30)
// - delayMs: ms a esperar antes de começar a digitar (default 0).
//   Útil pra sequenciar múltiplas linhas: caller passa delay calculado pra
//   que a próxima frase só comece após a anterior terminar. Cursor fica
//   invisível durante o delay (evita dois cursores ao mesmo tempo).
//
// prefers-reduced-motion: texto exibido instantaneamente, cursor pisca 2x e some.

import { useEffect, useState } from "react";

interface SystemTerminalLineProps {
  text: string;
  showCursor?: boolean;
  fontSize?: number;
  charDelayMs?: number;
  delayMs?: number;
}

const STYLE_ID = "rdwth-systemterminalline-styles";
const DEFAULT_CHAR_DELAY = 30;
const DEFAULT_FONT_SIZE = 11;

const styles = `
@keyframes rdwth-systemterminalline-cursor {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-systemterminalline-cursor {
    0%, 100% { opacity: 1; }
  }
}
`;

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement("style");
  styleEl.id = STYLE_ID;
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function SystemTerminalLine({
  text,
  showCursor = true,
  fontSize = DEFAULT_FONT_SIZE,
  charDelayMs = DEFAULT_CHAR_DELAY,
  delayMs = 0,
}: SystemTerminalLineProps) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    setDone(false);
    setStarted(false);
    setDisplayed("");

    if (prefersReducedMotion()) {
      setDisplayed(text);
      setStarted(true);
      setDone(true);
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    const startTimer = setTimeout(() => {
      setStarted(true);
      let i = 0;
      interval = setInterval(() => {
        i++;
        if (i >= text.length) {
          setDisplayed(text);
          setDone(true);
          if (interval) clearInterval(interval);
        } else {
          setDisplayed(text.slice(0, i));
        }
      }, charDelayMs);
    }, delayMs);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [text, charDelayMs, delayMs]);

  return (
    <div
      style={{
        fontFamily: "var(--r-font-sys)",
        fontWeight: 300,
        fontSize,
        lineHeight: 1.7,
        color: "var(--r-voice-sys)",
        letterSpacing: "0.04em",
        whiteSpace: "pre-wrap",
        minHeight: `${Math.round(fontSize * 1.7)}px`,
      }}
    >
      {started ? (
        <>
          <span aria-hidden="true">{"> "}</span>
          {displayed}
          {showCursor && (
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                marginLeft: 2,
                opacity: 1,
                animation: done
                  ? "rdwth-systemterminalline-cursor 0.6s steps(2) 2 forwards"
                  : "none",
              }}
            >
              █
            </span>
          )}
        </>
      ) : null}
    </div>
  );
}
