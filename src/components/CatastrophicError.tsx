// src/components/CatastrophicError.tsx
// AFC ONB-5 — classe Transacional grave (erro que bloqueia o uso)
// Cobre o canvas inteiro com fundo sólido. NavBottom/header do AppFrame continuam acessíveis.
// Voz sistema, sem cor de função (regra: cor é identidade — Constituição §1.1 / ONB-7 §1.2).
// Caller decide quando montar via render condicional.
//
// Comportamento:
// - position:absolute; inset:0 dentro do canvas (caller garante position:relative)
// - Fundo sólido (--r-bg / --r-bg-dark) — sinaliza interrupção, não pausa
// - Title em voz sistema com prefixo "! " (consistente com InlineError)
// - Mensagem mais detalhada abaixo, em voz sistema regular
// - Botão de ação opcional (retry, voltar, recarregar)
// - Foco automático no botão quando montado (acessibilidade)
// - role="alert" + aria-live="assertive"

import { useEffect, useRef } from "react";

interface CatastrophicErrorProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const STYLE_ID = "rdwth-catastrophicerror-styles";

const styles = `
@keyframes rdwth-catastrophicerror-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}
.rdwth-catastrophicerror-shell {
  background: var(--r-bg);
}
.dark .rdwth-catastrophicerror-shell {
  background: var(--r-bg-dark);
}
.rdwth-catastrophicerror-action:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-catastrophicerror-enter {
    from { opacity: 1; }
    to { opacity: 1; }
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

export default function CatastrophicError({
  title = "algo travou",
  message,
  actionLabel = "tentar novamente",
  onAction,
}: CatastrophicErrorProps) {
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => actionRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rdwth-catastrophicerror-shell"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        zIndex: 60,
        animation: "rdwth-catastrophicerror-enter 300ms ease-out",
        fontFamily: "var(--r-font-sys)",
      }}
    >
      <div style={{ width: "min(100%, 360px)", textAlign: "left" }}>
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 500,
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--r-voice-sys)",
            letterSpacing: "0.04em",
            marginBottom: 12,
          }}
        >
          <span aria-hidden="true">{"! "}</span>
          {title}
        </div>
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--r-voice-sys)",
            letterSpacing: "0.04em",
            whiteSpace: "pre-wrap",
            marginBottom: onAction ? 24 : 0,
          }}
        >
          {message}
        </div>
        {onAction && (
          <button
            ref={actionRef}
            type="button"
            onClick={onAction}
            className="rdwth-catastrophicerror-action"
            style={{
              fontFamily: "var(--r-font-sys)",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: "var(--r-voice-user)",
              background: "none",
              border: "none",
              padding: "8px 0",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
