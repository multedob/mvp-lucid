// src/components/QuestionnaireLoadingScreen.tsx
// ============================================================
// Loading screen do Questionário com identidade rdwth.
// Wordmark animado (morph SVG) + linha de texto rotativa sutil.
//
// Timing:
//  - Phase 1: "ajustando ao seu ciclo..."           — 2200ms
//  - Phase 2: "revisando o que ainda faz sentido…"  — 2200ms
//  - Loop entre 1↔2 enquanto o load real não terminou
//  - Quando loadComplete=true, força transição pra phase 3
//  - Phase 3: "pronto."                              — 400ms, fade out
// ============================================================

import { useEffect, useState } from "react";
import { AnimatedWordmark } from "./AnimatedWordmark";

const PHRASES = [
  "ajustando ao seu ciclo...",
  "revisando o que ainda faz sentido perguntar...",
  "pronto.",
];

const PHASE_MS = 2200;
const READY_MS = 400;
const FADE_MS = 400;

interface Props {
  /** quando true, transiciona pra phase 3 ("pronto.") e dispara onDone após READY+FADE */
  loadComplete?: boolean;
  onDone?: () => void;
}

export function QuestionnaireLoadingScreen({ loadComplete = true, onDone }: Props) {
  // 0 = phrase 1, 1 = phrase 2, 2 = phrase 3 ("pronto.")
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [fadingOut, setFadingOut] = useState(false);

  // Loop entre phase 0 ↔ 1 enquanto loadComplete=false
  useEffect(() => {
    if (phase === 2) return;
    const t = setTimeout(() => {
      if (phase === 0) {
        setPhase(1);
      } else if (phase === 1) {
        // se já completou, pula pra "pronto."; senão volta pra 0
        setPhase(loadComplete ? 2 : 0);
      }
    }, PHASE_MS);
    return () => clearTimeout(t);
  }, [phase, loadComplete]);

  // Quando loadComplete fica true, força phase 3 imediatamente
  useEffect(() => {
    if (loadComplete && phase !== 2) {
      // permite ler ao menos a frase atual brevemente
      const t = setTimeout(() => setPhase(2), 200);
      return () => clearTimeout(t);
    }
  }, [loadComplete, phase]);

  // Phase 3 → mostra "pronto." por READY_MS, fade out, dispara onDone
  useEffect(() => {
    if (phase !== 2) return;
    const t1 = setTimeout(() => setFadingOut(true), READY_MS);
    const t2 = setTimeout(() => onDone?.(), READY_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, onDone]);

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
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
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
        key={phase}
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
        {PHRASES[phase]}
      </div>
    </div>
  );
}
