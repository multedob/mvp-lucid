// src/components/EmptyStateMessage.tsx
// Mensagem do empty canvas (AFC ONB-2)
// voice="system" → usa SystemTerminalLine (typewriter + cursor piscando 2x e parando)
// voice="founders" → texto direto em --r-voice-founders (telha light / ciano dark)
// Alinhamento à esquerda, topo da tela. Dismiss persistente em localStorage.
//
// Refactor B-S5.D: voice="system" delega ao SystemTerminalLine para padronizar
// tipografia, cor (--r-voice-sys WCAG AA), tamanho default (11) e typewriter
// com todas as outras instâncias de voz sistema na app. voice="founders" também
// usa fontSize 11 pra consistência geral da voz.
//
// Refactor B-S5.D.5: ganha prop delayMs (passado pro SystemTerminalLine quando
// voice="system") para encadear empty message com saudação ou outro texto que
// já está digitando — caller controla quando esse aparece em sequência.

import { useEffect, useState } from "react";
import HighlightTarget from "./HighlightTarget";
import SystemTerminalLine from "./SystemTerminalLine";

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
  delayMs?: number;
}

const DISMISS_PREFIX = "rdwth_emptystate_dismissed_";

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
  delayMs = 0,
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
  const signatureColor = isSystem
    ? "var(--r-voice-sys)"
    : "var(--r-voice-founders)";

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
        {isSystem ? (
          <SystemTerminalLine text={text} delayMs={delayMs} />
        ) : (
          <div
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 11,
              lineHeight: 1.7,
              color: "var(--r-voice-founders)",
              letterSpacing: "0.04em",
              whiteSpace: "pre-wrap",
            }}
          >
            {text}
          </div>
        )}
        {signature && (
          <div
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 10,
              lineHeight: 1.6,
              color: signatureColor,
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
