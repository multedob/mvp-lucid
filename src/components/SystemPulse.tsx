// src/components/SystemPulse.tsx
// Pulso sutil de modo guiado (continuidade §6+§7 / ONB-7 §1.9)
// Aplica color: var(--r-fn) + opacidade pulsante a um elemento DOM por id.
//
// Especificação:
// - 1 ciclo = 3.5s (opacidade 100% → 75% → 100%, ease-in-out)
// - Respiração-pausa: 4 ciclos seguidos (~14s) → 6s estático em 100% → repete
// - Total do keyframe: 20s, infinite
// - Sem geometria (sem outline, scale, box-shadow) — só cor + opacidade
// - Single-target em looping: este componente é montado por destino
// - Cor de função (--r-fn) — único uso permitido como sinalização (ONB-7 §1.1/§1.9)
//
// Comportamento:
// - Componente puro de efeito colateral, não renderiza nada visível
// - Quando active=true, aplica cor e animação ao elemento via element.style
// - Salva cor/animação anteriores e restaura ao desmontar ou active=false
// - prefers-reduced-motion: opacity fica em 1, sem pulse

import { useEffect } from "react";

interface SystemPulseProps {
  targetId: string;
  active?: boolean;
}

const STYLE_ID = "rdwth-systempulse-styles";
const ANIMATION_NAME = "rdwth-systempulse";

const styles = `
@keyframes rdwth-systempulse {
  0% { opacity: 1; }
  8.75% { opacity: 0.75; }
  17.5% { opacity: 1; }
  26.25% { opacity: 0.75; }
  35% { opacity: 1; }
  43.75% { opacity: 0.75; }
  52.5% { opacity: 1; }
  61.25% { opacity: 0.75; }
  70% { opacity: 1; }
  100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-systempulse {
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

export default function SystemPulse({
  targetId,
  active = true,
}: SystemPulseProps) {
  useEffect(() => {
    injectStyles();
    if (!active) return;

    const el = document.getElementById(targetId);
    if (!el) {
      if (import.meta.env.DEV) {
        console.warn(`[SystemPulse] elemento '${targetId}' não encontrado`);
      }
      return;
    }

    const previousColor = el.style.color;
    const previousAnimation = el.style.animation;

    el.style.color = "var(--r-fn)";
    el.style.animation = `${ANIMATION_NAME} 20s ease-in-out infinite`;

    return () => {
      el.style.color = previousColor;
      el.style.animation = previousAnimation;
    };
  }, [targetId, active]);

  return null;
}
