// src/components/LoadingScreen.tsx
// ============================================================
// Loading screen genérico com identidade rdwth.
// AnimatedWordmark + 3 frases sequenciais (timing linear, sem loop).
//
// Estado: phase = 1 | 2 | 3
// Regras:
//  - Inicia em phase 1
//  - Após 2200ms → phase 2 (sem loop)
//  - Phase 2 espera o load real terminar (visível indefinidamente)
//  - Quando loadComplete=true:
//     · se phase já é 2 → vai pra phase 3 imediato
//     · se phase ainda é 1 → aguarda timer de 2200ms terminar → entra phase 2
//       → vai imediato pra phase 3
//  - Phase 3 fica visível 1200ms → fade out → onDone
//
// Tempo MÍNIMO total ≥ 3400ms (2200 + 1200).
// ============================================================

import { useEffect, useRef, useState } from "react";
import { AnimatedWordmark } from "./AnimatedWordmark";

const PHASE1_MS = 2200;
const READY_MS = 1200;
const FADE_MS = 400;

interface Props {
  phrases: [string, string, string];
  loadComplete?: boolean;
  onDone?: () => void;
}

export function LoadingScreen({ phrases, loadComplete = true, onDone }: Props) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [fadingOut, setFadingOut] = useState(false);
  const loadCompleteRef = useRef(loadComplete);
  loadCompleteRef.current = loadComplete;

  // Phase 1 → Phase 2 após PHASE1_MS (linear, sem loop)
  useEffect(() => {
    if (phase !== 1) return;
    const t = setTimeout(() => {
      // Se load já completou enquanto estávamos em phase 1, pula direto pra 3
      setPhase(loadCompleteRef.current ? 3 : 2);
    }, PHASE1_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Quando loadComplete vira true em phase 2 → vai pra phase 3 imediato
  useEffect(() => {
    if (loadComplete && phase === 2) {
      setPhase(3);
    }
  }, [loadComplete, phase]);

  // Phase 3 → visível READY_MS, fade out, onDone
  useEffect(() => {
    if (phase !== 3) return;
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
        animation: "rdwth-ls-fade-in 400ms ease-out",
      }}
    >
      <style>{`
        @keyframes rdwth-ls-fade-in {
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
          animation: "rdwth-ls-fade-in 400ms ease-out",
        }}
      >
        {phrases[phase - 1]}
      </div>
    </div>
  );
}
