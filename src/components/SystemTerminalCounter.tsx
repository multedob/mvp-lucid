// src/components/SystemTerminalCounter.tsx
// Voz sistema com sufixo mutável — variante de SystemTerminalLine para contadores/status.
//
// Caso de uso: linha tipo "perguntas restantes: 8" onde o número muda ao longo do tempo.
// No primeiro render: digita prefix + value char por char.
// Quando value muda: backspace anima a remoção do value antigo e digita o novo.
// O prefix permanece estável (nunca redigita) — evita "muita voz" reaparecendo a cada update.
//
// Tipografia: idêntica a SystemTerminalLine (Plex Mono, weight 300, --r-voice-sys, fontSize 11 default).

import { useEffect, useRef, useState } from "react";

interface SystemTerminalCounterProps {
  prefix: string;
  value: string | number;
  fontSize?: number;
  charDelayMs?: number;
  showCursor?: boolean;
}

const STYLE_ID = "rdwth-systemterminalcounter-styles";
const DEFAULT_CHAR_DELAY = 30;
const DEFAULT_FONT_SIZE = 11;

const styles = `
@keyframes rdwth-systemterminalcounter-cursor {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-systemterminalcounter-cursor {
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

export default function SystemTerminalCounter({
  prefix,
  value,
  fontSize = DEFAULT_FONT_SIZE,
  charDelayMs = DEFAULT_CHAR_DELAY,
  showCursor = true,
}: SystemTerminalCounterProps) {
  const valueStr = String(value);
  const [displayedPrefix, setDisplayedPrefix] = useState("");
  const [displayedValue, setDisplayedValue] = useState("");
  const [done, setDone] = useState(false);

  const lastValueRef = useRef<string>(valueStr);
  const initializedRef = useRef(false);

  useEffect(() => {
    injectStyles();
  }, []);

  // Primeiro mount: digita prefix + value
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (prefersReducedMotion()) {
      setDisplayedPrefix(prefix);
      setDisplayedValue(valueStr);
      setDone(true);
      return;
    }

    setDisplayedPrefix("");
    setDisplayedValue("");
    setDone(false);

    let i = 0;
    const fullLength = prefix.length + valueStr.length;
    const interval = setInterval(() => {
      i++;
      if (i >= fullLength) {
        setDisplayedPrefix(prefix);
        setDisplayedValue(valueStr);
        setDone(true);
        clearInterval(interval);
      } else if (i <= prefix.length) {
        setDisplayedPrefix(prefix.slice(0, i));
        setDisplayedValue("");
      } else {
        setDisplayedPrefix(prefix);
        setDisplayedValue(valueStr.slice(0, i - prefix.length));
      }
    }, charDelayMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Updates de value: backspace + retype só o value (prefix permanece)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (lastValueRef.current === valueStr) return;

    const oldValue = lastValueRef.current;
    lastValueRef.current = valueStr;

    if (prefersReducedMotion()) {
      setDisplayedValue(valueStr);
      setDone(true);
      return;
    }

    setDone(false);
    let phase: "delete" | "type" = "delete";
    let i = oldValue.length;

    const interval = setInterval(() => {
      if (phase === "delete") {
        i--;
        if (i <= 0) {
          setDisplayedValue("");
          phase = "type";
          i = 0;
        } else {
          setDisplayedValue(oldValue.slice(0, i));
        }
      } else {
        i++;
        if (i >= valueStr.length) {
          setDisplayedValue(valueStr);
          setDone(true);
          clearInterval(interval);
        } else {
          setDisplayedValue(valueStr.slice(0, i));
        }
      }
    }, charDelayMs);
    return () => clearInterval(interval);
  }, [valueStr, charDelayMs]);

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
      <span aria-hidden="true">{"> "}</span>
      {displayedPrefix}
      {displayedValue}
      {showCursor && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            marginLeft: 2,
            opacity: 1,
            animation: done
              ? "rdwth-systemterminalcounter-cursor 0.6s steps(2) 2 forwards"
              : "none",
          }}
        >
          █
        </span>
      )}
    </div>
  );
}
