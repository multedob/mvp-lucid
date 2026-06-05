// src/components/FeedbackButton.tsx
// v4 — bolinha discreta (mesmo pattern visual do .r-send-dot do produto).
// Posicionada no topo direito do canvas, alinhada com a borda direita do
// container central (.r-screen é o pai posicionado via AppShell).
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
        title="enviar feedback"
        style={{
          position: "absolute",
          top: "3rem",
          right: 24,
          // touch target generoso, visual minúsculo (mesmo truque do settings dot)
          padding: 8,
          margin: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          zIndex: 50,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
        }}
      >
        <span
          className="r-send-dot active"
          style={{ display: "block" }}
          aria-hidden="true"
        />
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
