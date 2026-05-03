// src/components/InviteCTA.tsx
// AFC ONB-5 — classe Convite (sugestão de próximo passo, baixa pressão)
// Voz fundadores (humana, eventual) ou Reed (companion, estrutural).
// Caller decide quando montar e quando ocultar permanentemente (state externo).
//
// Comportamento:
// - Card minimalista no canvas (sem border, padding generoso)
// - Voz "founders": IBM Plex Mono + var(--r-voice-founders) — cor de identidade
// - Voz "reed": var(--r-font-ed) (Urbanist) + var(--r-voice-user) — sem acento
//   TODO: confirmar com Bruno se Reed é Barlow Bold (continuidade) ou Urbanist
//   (atual --r-font-ed). Se Barlow, criar var --r-font-reed em B-S5.A follow-up.
// - CTA primário em alto contraste com underline
// - Dispensar opcional ("depois") ao lado do CTA, em voz sistema cinza
// - Não captura foco automaticamente — convite, não exigência
// - Animação de entrada sutil; respeita prefers-reduced-motion

import { useEffect } from "react";

type Voice = "founders" | "reed";

interface InviteCTAProps {
  text: string;
  signature?: string;
  voice?: Voice;
  ctaLabel: string;
  onCTA: () => void;
  dismissLabel?: string;
  onDismiss?: () => void;
}

const STYLE_ID = "rdwth-invitecta-styles";

const styles = `
@keyframes rdwth-invitecta-enter {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.rdwth-invitecta-button:focus-visible {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-invitecta-enter {
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

export default function InviteCTA({
  text,
  signature,
  voice = "founders",
  ctaLabel,
  onCTA,
  dismissLabel = "depois",
  onDismiss,
}: InviteCTAProps) {
  useEffect(() => {
    injectStyles();
  }, []);

  const isFounders = voice === "founders";
  const textColor = isFounders
    ? "var(--r-voice-founders)"
    : "var(--r-voice-user)";
  const textFont = isFounders ? "var(--r-font-sys)" : "var(--r-font-ed)";
  const textWeight = isFounders ? 300 : 600;
  const textSize = isFounders ? 12 : 16;
  const textSpacing = isFounders ? "0.04em" : "normal";

  return (
    <div
      style={{
        padding: "16px 24px",
        animation: "rdwth-invitecta-enter 240ms ease-out",
      }}
    >
      <div
        style={{
          fontFamily: textFont,
          fontWeight: textWeight,
          fontSize: textSize,
          lineHeight: 1.6,
          color: textColor,
          letterSpacing: textSpacing,
          whiteSpace: "pre-wrap",
          marginBottom: 16,
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
            color: textColor,
            letterSpacing: "0.04em",
            opacity: 0.7,
            marginBottom: 16,
          }}
        >
          {signature}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="button"
          onClick={onCTA}
          className="rdwth-invitecta-button"
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
          {ctaLabel}
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rdwth-invitecta-button"
            style={{
              fontFamily: "var(--r-font-sys)",
              fontSize: 12,
              fontWeight: 300,
              letterSpacing: "0.04em",
              color: "var(--r-voice-sys)",
              background: "none",
              border: "none",
              padding: "8px 0",
              cursor: "pointer",
            }}
          >
            {dismissLabel}
          </button>
        )}
      </div>
    </div>
  );
}
