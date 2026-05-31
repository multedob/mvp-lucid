// src/components/FeedbackButton.tsx
// Botão flutuante discreto, sempre visível em rotas autenticadas (AppShell).
import { useState } from "react";
import { FeedbackModal } from "./FeedbackModal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="enviar feedback"
        style={{
          position: "absolute",
          right: 16,
          bottom: 72, // acima da NavBottom
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "var(--r-telha)",
          color: "var(--r-bg)",
          border: "none",
          fontFamily: "var(--r-font-sys)",
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "0.02em",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          opacity: 0.85,
          zIndex: 50,
          transition: "opacity 200ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
      >
        ?!
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
