// src/pages/AgeCheck.tsx
// Verificação de idade — primeiro passo do onboarding
// "I am 16 or older" → seta flag + /consent | "I am under 16" → bloqueio inline

import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AgeCheck() {
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);

  if (blocked) return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth</span>
      </div>
      <div className="r-line" />
      <div style={{ flex: 1 }} />
      <div style={{ padding: "0 24px 56px", flexShrink: 0 }}>
        <div style={{
          fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
          color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.8,
        }}>
          _rdwth is available for users<br />16 years and older.
        </div>
      </div>
      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth</span>
      </div>
      <div className="r-line" />
      <div style={{ flex: 1 }} />

      <div style={{ padding: "0 24px 56px", flexShrink: 0 }}>
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 22,
          letterSpacing: "-0.01em", lineHeight: 1.3, color: "var(--r-text)",
          marginBottom: 32,
        }}>
          Before we begin.
        </div>

        <div style={{
          fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
          color: "var(--r-sub)", letterSpacing: "0.04em", lineHeight: 1.8,
          marginBottom: 28,
        }}>
          _rdwth is designed for adults.<br />
          You must be at least 16 years old<br />
          to use this service.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            onClick={() => {
              localStorage.setItem("rdwth_age_confirmed", "1");
              navigate("/consent");
            }}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          >
            <div style={{ width: 1, height: 12, background: "var(--r-accent)", flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
              color: "var(--r-text)", letterSpacing: "0.06em",
            }}>
              I am 16 or older
            </span>
          </div>

          <div
            onClick={() => setBlocked(true)}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          >
            <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
              color: "var(--r-muted)", letterSpacing: "0.06em",
            }}>
              I am under 16
            </span>
          </div>
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
