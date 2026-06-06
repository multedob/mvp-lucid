// src/components/FeedbackButton.tsx
// v8 — caixinha [!] laranja (voz founders) com tooltip "feedback".
// Inline, alinhamento via container flex/grid (mesma regra v7).
import { useState } from "react";
import { FeedbackModal } from "./FeedbackModal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <>
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-label="feedback"
          style={{
            padding: 6,
            margin: 0,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--r-font-sys)",
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "var(--r-telha)",
            lineHeight: 1,
          }}
        >
          [!]
        </button>
        {hover && (
          <span
            role="tooltip"
            style={{
              position: "absolute",
              right: "calc(100% + 4px)",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--r-voice-sys)",
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 10,
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            feedback
          </span>
        )}
      </span>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
