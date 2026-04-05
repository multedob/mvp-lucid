// src/pages/OnboardingLetter.tsx
// Exibida uma única vez após primeiro login.
// Persiste flag em localStorage: "rdwth_letter_seen"
// Após "Begin" → navegação para /home

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function OnboardingLetter() {
  const navigate = useNavigate();

  const handleBegin = () => {
    localStorage.setItem("rdwth_letter_seen", "1");
    navigate("/age");
  };

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label">_rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Body — scrollável */}
      <div
        className="r-scroll"
        style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: 0 }}
      >

        {/* Wordmark + tagline */}
        <div style={{ marginBottom: 32 }}>
          <div
            className="r-wordmark"
            style={{ fontSize: 36, letterSpacing: "0.08em", marginBottom: 6 }}
          >
            _rdwth
          </div>
          <div
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 10,
              color: "var(--r-accent)",
              letterSpacing: "0.14em",
              opacity: 0.7,
            }}
          >
            Read With Insight
          </div>
        </div>

        {/* Manifesto */}
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 11,
            lineHeight: 1.9,
            color: "var(--r-dim)",
            letterSpacing: "0.03em",
          }}
        >
          We make patterns visible.<br />
          We make complexity readable.
          <br /><br />
          Behind every choice, conflict, impulse, or repetition,<br />
          there is a structure at work.
          <br /><br />
          _rdwth was built to make that structure legible —<br />
          without reducing a person to a type,<br />
          turning difference into hierarchy,<br />
          or mistaking pattern for identity.
          <br /><br />
          We do not offer ready-made answers.<br />
          We offer reading.
          <br /><br />
          The kind of reading that brings tensions into focus,<br />
          organizes complexity,<br />
          and returns something rare:
          <br /><br />
          a clearer view of what is shaping<br />
          someone's experience,<br />
          while keeping responsibility in their hands.
          <br /><br />
          No diagnosis.<br />
          No prescription.<br />
          No fixed conclusions.
          <br /><br />
          Just one simple and radical proposition:
        </div>

        {/* Proposição — destaque */}
        <div
          style={{
            fontFamily: "var(--r-font-ed)",
            fontWeight: 800,
            fontSize: 16,
            lineHeight: 1.7,
            color: "var(--r-text)",
            letterSpacing: "0.01em",
            marginTop: 20,
            marginBottom: 32,
          }}
        >
          see more precisely<br />
          what is already there.
        </div>

      </div>

      {/* Footer — Begin */}
      <div className="r-line" />
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <div
          onClick={handleBegin}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <div
            style={{
              width: 1,
              height: 14,
              background: "var(--r-accent)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 11,
              color: "var(--r-text)",
              letterSpacing: "0.08em",
            }}
          >
            Begin
          </span>
        </div>
      </div>

    </div>
  );
}
