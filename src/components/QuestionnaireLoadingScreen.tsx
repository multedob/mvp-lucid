// src/components/QuestionnaireLoadingScreen.tsx
// ============================================================
// Loading screen do Questionário com identidade rdwth.
// Wordmark animado (morph SVG) + linha de texto rotativa sutil.
// Não bloqueia load real — apenas tela visual.
// ============================================================

import { useEffect, useState } from "react";
import { AnimatedWordmark } from "./AnimatedWordmark";

const PHRASES = [
  "ajustando ao seu ciclo...",
  "revisando o que ainda faz sentido perguntar...",
  "pronto.",
];

const ROTATE_MS = 1500;

export function QuestionnaireLoadingScreen() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i < PHRASES.length - 1 ? i + 1 : i));
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--r-bg)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        animation: "qls-fade-in 400ms ease-out",
      }}
    >
      <style>{`
        @keyframes qls-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <AnimatedWordmark fontSize="clamp(40px, 8vw, 80px)" />

      <div
        key={idx}
        style={{
          fontFamily: "var(--r-font-sys, 'IBM Plex Mono', monospace)",
          fontSize: 11,
          color: "var(--r-muted)",
          letterSpacing: "0.06em",
          fontWeight: 300,
          textAlign: "center",
          maxWidth: 360,
          padding: "0 24px",
          transition: "opacity 400ms ease",
          animation: "qls-fade-in 400ms ease-out",
        }}
      >
        {PHRASES[idx]}
      </div>
    </div>
  );
}
