// src/components/DecisionModal.tsx
// AFC ONB-5 — classe Decisão (ações irreversíveis ou que pedem confirmação consciente)
// Fecha cláusula deferida da ONB-4 (modal dentro do frame, sem overlay full-screen)
//
// Comportamento:
// - position:absolute dentro do container pai (caller garante position:relative no canvas)
// - Backdrop cobre apenas o canvas, não cobre NavBottom/header do AppFrame futuro
// - Voz sistema (IBM Plex Mono, cor --r-voice-sys, prefixo "> ")
// - Foco padrão: Confirmar (tone="neutral") | Cancelar (tone="destructive")
// - Esc fecha e dispara onCancel
// - Tab cicla foco entre os dois botões (focus trap simples)
// - tone="destructive" muda apenas tipografia e foco padrão, nunca cor
//   (cor é identidade, não função — Constituição §1.1 / ONB-7 §1.2)

import { useEffect, useRef, useState } from "react";

type Tone = "neutral" | "destructive";

interface DecisionModalProps {
  open: boolean;
  question: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: Tone;
  onConfirm: () => void;
  onCancel: () => void;
}

const STYLE_ID = "rdwth-decisionmodal-styles";

const styles = `
@keyframes rdwth-decisionmodal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes rdwth-decisionmodal-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.rdwth-decisionmodal-backdrop {
  background: rgba(0, 0, 0, 0.15);
}
.dark .rdwth-decisionmodal-backdrop {
  background: rgba(0, 0, 0, 0.45);
}
.rdwth-decisionmodal-card {
  background: var(--r-bg);
  border: 1px solid var(--r-ghost);
}
.dark .rdwth-decisionmodal-card {
  background: var(--r-bg-dark);
  border-color: var(--r-ghost-dk);
}
.rdwth-decisionmodal-button:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-decisionmodal-fade-in { from { opacity: 1; } to { opacity: 1; } }
  @keyframes rdwth-decisionmodal-rise { from { opacity: 1; transform: none; } to { opacity: 1; transform: none; } }
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

export default function DecisionModal({
  open,
  question,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "neutral",
  onConfirm,
  onCancel,
}: DecisionModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    setMounted(true);
    const target = tone === "destructive" ? cancelRef.current : confirmRef.current;
    const t = setTimeout(() => target?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, tone]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  const handleTabTrap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusables = [cancelRef.current, confirmRef.current].filter(
      (el): el is HTMLButtonElement => el !== null
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open || !mounted) return null;

  const isDestructive = tone === "destructive";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rdwth-decisionmodal-question"
      className="rdwth-decisionmodal-backdrop"
      onKeyDown={handleTabTrap}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        animation: "rdwth-decisionmodal-fade-in 200ms ease-out",
        zIndex: 50,
      }}
    >
      <div
        className="rdwth-decisionmodal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(100%, 340px)",
          padding: "24px",
          animation: "rdwth-decisionmodal-rise 240ms ease-out",
          fontFamily: "var(--r-font-sys)",
        }}
      >
        <div
          id="rdwth-decisionmodal-question"
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--r-voice-sys)",
            letterSpacing: "0.04em",
            whiteSpace: "pre-wrap",
            marginBottom: 24,
          }}
        >
          <span aria-hidden="true">{"> "}</span>
          {question}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rdwth-decisionmodal-button"
            style={{
              fontFamily: "var(--r-font-sys)",
              fontSize: 12,
              fontWeight: isDestructive ? 500 : 300,
              letterSpacing: "0.04em",
              color: "var(--r-voice-sys)",
              background: "none",
              border: "none",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="rdwth-decisionmodal-button"
            style={{
              fontFamily: "var(--r-font-sys)",
              fontSize: 12,
              fontWeight: isDestructive ? 300 : 500,
              letterSpacing: "0.04em",
              color: "var(--r-voice-user)",
              background: "none",
              border: "none",
              padding: "8px 12px",
              cursor: "pointer",
              textDecoration: isDestructive ? "underline" : "none",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
