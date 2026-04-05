// src/pages/Consent.tsx
// Aceite de Privacy Policy + Terms — segundo passo do onboarding
// Checkbox → habilita "Continue" → seta flag + /letter

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ABOUT = [
  "_rdwth offers structural reflexive readings based on your responses.",
  "It is not a clinical diagnosis.",
  "It does not replace licensed professionals.",
  "It does not determine identity or human value.",
  "No structural configuration implies superiority.",
];

const DATA = [
  "We collect what you share with us.",
  "We generate structural readings from your responses.",
  "We store your history if you choose to continue.",
  "You can delete your data at any time.",
  "You can request a copy of your data at any time.",
];

export default function Consent() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 0" }}>
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 22,
          letterSpacing: "-0.01em", lineHeight: 1.3, color: "var(--r-text)",
          marginBottom: 24,
        }}>
          Before you begin.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {ABOUT.map((line, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0, marginTop: 3 }} />
              <span style={{
                fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
                color: "var(--r-sub)", letterSpacing: "0.04em", lineHeight: 1.7,
              }}>{line}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.5, marginBottom: 24 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {DATA.map((line, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0, marginTop: 3 }} />
              <span style={{
                fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
                color: "var(--r-sub)", letterSpacing: "0.04em", lineHeight: 1.7,
              }}>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px 48px", flexShrink: 0 }}>
        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.5, marginBottom: 24 }} />

        {/* Checkbox */}
        <div
          onClick={() => setAccepted(a => !a)}
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 24 }}
        >
          <div style={{
            width: 14, height: 14, flexShrink: 0,
            border: `1px solid ${accepted ? "var(--r-accent)" : "var(--r-ghost)"}`,
            borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
            background: accepted ? "var(--r-accent)" : "transparent", transition: "all 0.15s",
          }}>
            {accepted && <div style={{ width: 6, height: 6, background: "var(--r-bg)", borderRadius: 1 }} />}
          </div>
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
            color: "var(--r-text)", letterSpacing: "0.04em", lineHeight: 1.6,
          }}>
            I agree to the{" "}
            <span style={{ color: "var(--r-accent)", borderBottom: "1px solid var(--r-accent)", paddingBottom: 1 }}>
              Privacy Policy
            </span>
            {" "}and{" "}
            <span style={{ color: "var(--r-accent)", borderBottom: "1px solid var(--r-accent)", paddingBottom: 1 }}>
              Terms of Use
            </span>.
          </span>
        </div>

        {/* Continue */}
        <div
          onClick={() => {
            if (!accepted) return;
            localStorage.setItem("rdwth_consent_given", "1");
            navigate("/letter");
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: accepted ? "pointer" : "default",
            opacity: accepted ? 1 : 0.35, transition: "opacity 0.2s",
          }}
        >
          <div style={{ width: 1, height: 12, background: "var(--r-accent)", flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
            color: "var(--r-text)", letterSpacing: "0.06em",
          }}>
            Continue
          </span>
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
