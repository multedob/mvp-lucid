// src/components/SystemTerminalLine.tsx
// Voz terminal D — primitivo reusável do sistema de 4 vozes (ONB-7 §1.5)
// Renderiza: prefixo "> " + texto + cursor "█" piscando 2x e parando.
// Tipografia: IBM Plex Mono, weight 300, cor --r-voice-sys (cinza WCAG AA, ONB-7 §1.8).
//
// Substitui o trecho voice="system" do EmptyStateMessage quando usado standalone.
// Casos de uso: saudação Home (ONB-7 §1.7), frases do modo guiado, mini-eco warm-up.

import { useEffect } from "react";

interface SystemTerminalLineProps {
  text: string;
  showCursor?: boolean;
  fontSize?: number;
}

const STYLE_ID = "rdwth-systemterminalline-styles";

const styles = `
@keyframes rdwth-systemterminalline-cursor {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes rdwth-systemterminalline-cursor {
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

export default function SystemTerminalLine({
  text,
  showCursor = true,
  fontSize = 11,
}: SystemTerminalLineProps) {
  useEffect(() => {
    injectStyles();
  }, []);

  return (
    <div
      style={{
        fontFamily: "var(--r-font-sys)",
        fontWeight: 300,
        fontSize,
        lineHeight: 1.7,
        color: "var(--r-voice-sys)",
        letterSpacing: "0.04em",
        whiteSpace: "pre-wrap",
      }}
    >
      <span aria-hidden="true">{"> "}</span>
      {text}
      {showCursor && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            marginLeft: 2,
            animation:
              "rdwth-systemterminalline-cursor 0.6s steps(2) 2 forwards",
          }}
        >
          █
        </span>
      )}
    </div>
  );
}
