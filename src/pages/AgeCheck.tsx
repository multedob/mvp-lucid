// src/pages/AgeCheck.tsx
// Verificação de idade — primeiro passo do onboarding
// "tenho 16 anos ou mais" → marca step em user_onboarding_state + /consent | "tenho menos de 16" → bloqueio inline

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { markOnboardingStep } from "@/hooks/useOnboardingState";
import AppHeader from "@/components/AppHeader";

export default function AgeCheck() {
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);

  if (blocked) return (
    <div className="r-screen">
      <AppHeader />
      <div style={{ flex: 1 }} />
      <div style={{ padding: "0 24px 56px", flexShrink: 0 }}>
        <div style={{
          fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
          color: "var(--r-voice-sys)", letterSpacing: "0.04em", lineHeight: 1.8,
        }}>
          <span aria-hidden="true">{"> "}</span>rdwth está disponível para pessoas com 16 anos ou mais.
        </div>

        {/* B6 (auditoria) — feedback visual de opções desativadas após bloqueio */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28, opacity: 0.35, pointerEvents: "none" }} aria-disabled="true">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
              color: "var(--r-muted)", letterSpacing: "0.06em",
              textDecoration: "line-through",
            }}>
              tenho 16 anos ou mais
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
              color: "var(--r-muted)", letterSpacing: "0.06em",
            }}>
              tenho menos de 16
            </span>
          </div>
        </div>
      </div>
      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );

  return (
    <div className="r-screen">
      <AppHeader />
      <div style={{ flex: 1 }} />

      <main style={{ padding: "0 24px 56px", flexShrink: 0 }}>
        <h1 style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 22,
          letterSpacing: "-0.01em", lineHeight: 1.3, color: "var(--r-text)",
          marginBottom: 32, marginTop: 0,
        }}>
          antes de começar.
        </h1>

        <div style={{
          fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
          color: "var(--r-sub)", letterSpacing: "0.04em", lineHeight: 1.8,
          marginBottom: 28,
        }}>
          rdwth foi desenhado para adultos.<br />
          você precisa ter pelo menos 16 anos<br />
          para usar este serviço.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            onClick={async () => {
              track("age_confirmed");
              await markOnboardingStep("age_confirmed");
              navigate("/consent");
            }}
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              background: "transparent", border: "none", padding: 0, outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.outline = "1px dotted var(--r-telha)"; e.currentTarget.style.outlineOffset = "4px"; }}
            onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
          >
            <div aria-hidden="true" style={{ width: 1, height: 12, background: "var(--r-telha)", flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
              color: "var(--r-text)", letterSpacing: "0.06em",
            }}>
              tenho 16 anos ou mais
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              track("age_below_threshold");
              setBlocked(true);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              background: "transparent", border: "none", padding: 0, outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.outline = "1px dotted var(--r-ghost)"; e.currentTarget.style.outlineOffset = "4px"; }}
            onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
          >
            <div aria-hidden="true" style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
              color: "var(--r-muted)", letterSpacing: "0.06em",
            }}>
              tenho menos de 16
            </span>
          </button>
        </div>
      </main>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
