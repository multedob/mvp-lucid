// src/components/SystemCyclingLine.tsx
// Linha de voz do sistema com typewriter forward na entrada e reverse + forward
// ao trocar de texto. Phase derivado a cada tick (sem state machine que pode
// descincronizar). Reverse remove 2 chars/tick (≈ 2x mais rápido que forward).

import { useEffect, useRef, useState } from "react";

const TICK_MS = 30;

interface Props {
  text: string;
  /** Tamanho da fonte em px (default 11). */
  fontSize?: number;
}

export default function SystemCyclingLine({ text: rawText, fontSize = 11 }: Props) {
  // Voz do sistema é SEMPRE minúscula (regra do design).
  const text = rawText.toLowerCase();
  const [displayed, setDisplayed] = useState("");
  const targetRef = useRef(text);

  useEffect(() => {
    targetRef.current = text;
  }, [text]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDisplayed((prev) => {
        const target = targetRef.current;
        if (prev === target) return prev;
        if (target.startsWith(prev)) {
          return target.slice(0, prev.length + 1); // forward — 1 char
        }
        // reverse — 2 chars (~2x mais rápido)
        return prev.slice(0, Math.max(0, prev.length - 2));
      });
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  const isShown = displayed === text;
  const hasContent = displayed.length > 0 || !isShown;

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
        margin: 0,
        minHeight: `${Math.round(fontSize * 1.7)}px`,
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
