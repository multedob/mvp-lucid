// src/components/TransientToast.tsx
// AFC ONB-5 — classe Calor / Ambiental (sinal efêmero, baixa interrupção)
// Mensagem que aparece, é vista, desaparece. Sem ação obrigatória.
//
// Comportamento:
// - position:absolute dentro do canvas (caller garante position:relative)
// - Aparece no rodapé, centralizado horizontalmente
// - Fica acima do NavBottom porque vive dentro do canvas, não cobre o frame
// - Voz sistema (cinza, prefixo "> ") ou fundadores (cor identidade, sem prefixo)
// - Auto-dismiss configurável (duration=0 desativa)
// - Clique fecha quando dismissible
// - role="status" + aria-live="polite" (anuncia sem interromper screen reader)
//
// Saída sem animação no MVP (caller seta open=false e o componente desmonta direto).
// Animação de entrada respeita prefers-reduced-motion.

import { useEffect, useRef } from "react";

type Voice = "system" | "founders";

interface TransientToastProps {
  open: boolean;
  message: string;
  voice?: Voice;
  duration?: number;
  dismissible?: boolean;
  onDismiss: () => void;
}

const STYLE_ID = "rdwth-transienttoast-styles";

const styles = `
@keyframes rdwth-toast-enter {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.rdwth-transienttoast-card {
  background: var(--r-bg);
  border: 1px solid var(--r-ghost);
}
.dark .rdwth-transienttoast-card {
  background: var(--r-bg-dark);
  border-color: var(--r-ghost-dk);
}
.rdwth-transienttoast-card:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-toast-enter {
    from { opacity: 0; transform: translate(-50%, 0); }
    to { opacity: 1; transform: translate(-50%, 0); }
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

export default function TransientToast({
  open,
  message,
  voice = "system",
  duration = 4000,
  dismissible = true,
  onDismiss,
}: TransientToastProps) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    if (!open || duration <= 0) return;
    const t = setTimeout(() => onDismissRef.current(), duration);
    return () => clearTimeout(t);
  }, [open, duration, message]);

  if (!open) return null;

  const isSystem = voice === "system";
  const color = isSystem ? "var(--r-voice-sys)" : "var(--r-voice-founders)";

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => {
        if (dismissible) onDismiss();
      }}
      onKeyDown={(e) => {
        if (dismissible && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onDismiss();
        }
      }}
      tabIndex={dismissible ? 0 : -1}
      aria-label={dismissible ? "tocar para fechar" : undefined}
      className="rdwth-transienttoast-card"
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(calc(100% - 32px), 320px)",
        padding: "12px 16px",
        cursor: dismissible ? "pointer" : "default",
        zIndex: 40,
        animation: "rdwth-toast-enter 240ms ease-out",
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontFamily: "var(--r-font-sys)",
          fontWeight: 300,
          fontSize: 12,
          lineHeight: 1.6,
          color,
          letterSpacing: "0.04em",
          whiteSpace: "pre-wrap",
        }}
      >
        {isSystem && <span aria-hidden="true">{"> "}</span>}
        {message}
      </div>
    </div>
  );
}
