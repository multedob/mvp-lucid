// src/components/EmptyStateMessage.tsx
// Mensagem do empty canvas (AFC ONB-2)
// voice="system" → prefixo "> " + cursor "█" pisca 2x e para
// voice="founders" → sem prefixo, sem cursor, cor de acento
// Alinhamento à esquerda, topo da tela. Dismiss persistente em localStorage.

import { useEffect, useState } from "react";
import HighlightTarget from "./HighlightTarget";

type Voice = "system" | "founders";
type HighlightEffect = "pulse" | "scale" | "weight" | "outline";

interface EmptyStateMessageProps {
  text: string;
  voice?: Voice;
  signature?: string;
  contextKey: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  /** Quando provided, clique dispara onAction E marca como dispensado. */
  onAction?: () => void;
  highlightTargetId?: string;
  highlightEffect?: HighlightEffect;
}

const DISMISS_PREFIX = "rdwth_emptystate_dismissed_";
const STYLE_ID = "rdwth-emptystate-styles";

const styles = `
@keyframes rdwth-cursor-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-cursor-blink {
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

export default function EmptyStateMessage({
  text,
  voice = "system",
  signature,
  contextKey,
  dismissible = true,
  onDismiss,
  onAction,
  highlightTargetId,
  highlightEffect = "pulse",
}: EmptyStateMessageProps) {
  const dismissKey = DISMISS_PREFIX + contextKey;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(dismissKey) === "1";
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    injectStyles();
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [dismissed]);

  if (dismissed) return null;

  const handleClick = () => {
    // Se há onAction (CTA), dispara ação + marca como visto (não fade-out).
    if (onAction) {
      localStorage.setItem(dismissKey, "1");
      onAction();
      return;
    }
    // Sem onAction: comportamento de dismiss padrão.
    if (!dismissible) return;
    localStorage.setItem(dismissKey, "1");
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 300);
  };

  const isClickable = !!onAction || dismissible;

  const isSystem = voice === "system";
  const color = isSystem ? "var(--r-muted)" : "var(--r-telha)";

  return (
    <>
      <div
        onClick={isClickable ? handleClick : undefined}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-describedby={highlightTargetId}
        aria-label={onAction ? text : dismissible ? "tocar para fechar" : undefined}
        style={{
          padding: "12px 24px 20px",
          textAlign: "left",
          cursor: isClickable ? "pointer" : "default",
          opacity: visible ? 1 : 0,
          transition: "opacity 300ms ease-out",
          userSelect: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 11,
            lineHeight: 1.7,
            color,
            letterSpacing: "0.04em",
            whiteSpace: "pre-wrap",
          }}
        >
          {isSystem ? (
            <>
              <span aria-hidden="true">{"> "}</span>
              {text}
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  marginLeft: 2,
                  animation: "rdwth-cursor-blink 0.6s steps(2) 2 forwards",
                }}
              >
                █
              </span>
            </>
          ) : (
            text
          )}
        </div>
        {signature && (
          <div
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 10,
              lineHeight: 1.6,
              color,
              letterSpacing: "0.04em",
              marginTop: 12,
              opacity: 0.7,
            }}
          >
            {signature}
          </div>
        )}
      </div>
      {highlightTargetId && visible && !dismissed && (
        <HighlightTarget
          targetId={highlightTargetId}
          effect={highlightEffect}
          duration={800}
          repeat={3}
        />
      )}
    </>
  );
}
