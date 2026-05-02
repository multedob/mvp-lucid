// src/components/HighlightTarget.tsx
// Aplica destaque temporário a um elemento DOM via animação CSS
// Usado pelo empty canvas (AFC ONB-2 tipo 2 — onboarding diferido)
// Restrição da Constituição: NÃO usa cor (cor é semântica de identidade)
// Alternativas: peso, escala, outline neutro, opacity pulse

import { useEffect } from "react";

type HighlightEffect = "pulse" | "scale" | "weight" | "outline";

interface HighlightTargetProps {
  targetId: string;
  effect?: HighlightEffect;
  duration?: number;
  repeat?: number;
  delay?: number;
}

const STYLE_ID = "rdwth-highlight-styles";

const styles = `
@keyframes rdwth-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes rdwth-scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes rdwth-weight {
  0%, 100% { font-weight: inherit; }
  50% { font-weight: bold; }
}

@keyframes rdwth-outline {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 0 1px var(--r-text); }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
  @keyframes rdwth-scale {
    0%, 100% { transform: scale(1); }
  }
  @keyframes rdwth-weight {
    0%, 100% { font-weight: inherit; }
  }
  @keyframes rdwth-outline {
    0%, 100% { box-shadow: 0 0 0 0 transparent; }
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

/**
 * Componente puro de efeito colateral — não renderiza nada visível.
 * Quando montado, aplica animação CSS ao elemento com targetId.
 * Quando desmontado, remove a animação.
 */
export default function HighlightTarget({
  targetId,
  effect = "pulse",
  duration = 800,
  repeat = 1,
  delay = 0,
}: HighlightTargetProps) {
  useEffect(() => {
    injectStyles();

    const el = document.getElementById(targetId);
    if (!el) {
      if (import.meta.env.DEV) {
        console.warn(`[HighlightTarget] elemento '${targetId}' não encontrado`);
      }
      return;
    }

    const totalDuration = duration * repeat;
    const animationName = `rdwth-${effect}`;

    const timeoutStart = setTimeout(() => {
      el.style.animation = `${animationName} ${duration}ms ease-in-out ${repeat}`;
    }, delay);

    const timeoutEnd = setTimeout(() => {
      el.style.animation = "";
    }, delay + totalDuration);

    return () => {
      clearTimeout(timeoutStart);
      clearTimeout(timeoutEnd);
      if (el) el.style.animation = "";
    };
  }, [targetId, effect, duration, repeat, delay]);

  return null;
}
