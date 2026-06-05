// src/components/FeedbackButton.tsx
// v7 — bolinha inline, sem posicionamento.
// O alinhamento agora é responsabilidade do container (flex/grid) que envolve
// a primeira linha da voz do sistema da tela. Use sempre dentro de um wrapper
// como: <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
//   <SystemTerminalLine .../>
//   <FeedbackButton />
// </div>
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
          // touch target generoso, visual minúsculo (mesmo truque do settings dot)
          padding: 8,
          margin: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          flexShrink: 0,
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
