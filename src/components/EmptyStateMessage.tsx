// src/components/EmptyStateMessage.tsx
// Mensagem do empty canvas (AFC ONB-2)
// Voz/tipografia conforme AFC ONB-1
// Dismiss persistente em localStorage (será trocado por Supabase quando Trilha A entregar B-S4.1 backend)
// Integração opcional com HighlightTarget para mensagens tipo 2 (onboarding diferido)

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
  highlightTargetId?: string;
  highlightEffect?: HighlightEffect;
}

const DISMISS_PREFIX = "rdwth_emptystate_dismissed_";

export default function EmptyStateMessage({
  text,
  voice = "system",
  signature,
  contextKey,
  dismissible = true,
  onDismiss,
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
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [dismissed]);

  if (dismissed) return null;

  const handleDismiss = () => {
    if (!dismissible) return;
    localStorage.setItem(dismissKey, "1");
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 300);
  };

  const isSystem = voice === "system";
  const color = isSystem ? "var(--r-muted)" : "var(--r-accent)";

  return (
    <>
      <div
        onClick={handleDismiss}
        role={dismissible ? "button" : undefined}
        tabIndex={dismissible ? 0 : undefined}
        onKeyDown={(e) => {
          if (dismissible && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleDismiss();
          }
        }}
        aria-describedby={highlightTargetId}
        aria-label={dismissible ? "tocar para fechar" : undefined}
        style={{
          padding: "16px 24px",
          textAlign: "center",
          cursor: dismissible ? "pointer" : "default",
          opacity: visible ? 1 : 0,
          transition: "opacity 300ms ease-out",
          maxWidth: 320,
          margin: "0 auto",
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
          {text}
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
