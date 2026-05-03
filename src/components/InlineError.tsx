// src/components/InlineError.tsx
// AFC ONB-5 — classe Transacional (erro local em form ou ação pontual)
// Voz sistema com prefixo "! " (alerta, distinto do "> " neutro/comando).
// Sem cor de função: cor é identidade, não sinalização (Constituição §1.1 / ONB-7 §1.2).
// Caller decide quando montar (via render condicional); o componente em si não tem prop "open".
//
// Comportamento:
// - Mensagem inline em voz sistema, padrão tipográfico do EmptyStateMessage
// - onRetry opcional: botão inline em alto contraste com label customizável
// - role="alert" + aria-live="assertive" (screen reader anuncia imediatamente)
// - Animação de entrada sutil; respeita prefers-reduced-motion

import { useEffect } from "react";

interface InlineErrorProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

const STYLE_ID = "rdwth-inlineerror-styles";

const styles = `
@keyframes rdwth-inlineerror-enter {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}
.rdwth-inlineerror-retry:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-inlineerror-enter {
    from { opacity: 0; transform: none; }
    to { opacity: 1; transform: none; }
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

export default function InlineError({
  message,
  retryLabel = "tentar novamente",
  onRetry,
}: InlineErrorProps) {
  useEffect(() => {
    injectStyles();
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding: "8px 0",
        animation: "rdwth-inlineerror-enter 200ms ease-out",
      }}
    >
      <div
        style={{
          fontFamily: "var(--r-font-sys)",
          fontWeight: 300,
          fontSize: 11,
          lineHeight: 1.6,
          color: "var(--r-voice-sys)",
          letterSpacing: "0.04em",
          whiteSpace: "pre-wrap",
        }}
      >
        <span aria-hidden="true">{"! "}</span>
        {message}
        {onRetry && (
          <>
            {" "}
            <button
              type="button"
              onClick={onRetry}
              className="rdwth-inlineerror-retry"
              style={{
                fontFamily: "var(--r-font-sys)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: "var(--r-voice-user)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {retryLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
