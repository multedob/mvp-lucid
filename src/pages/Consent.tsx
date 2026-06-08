// src/pages/Consent.tsx
// Aceite de Política de Privacidade + Termos — segundo passo do onboarding
// Checkbox → habilita "continuar" → marca step em user_onboarding_state + /letter

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { markOnboardingStep } from "@/hooks/useOnboardingState";
import AppHeader from "@/components/AppHeader";

const ABOUT = [
  "rdwth oferece leituras reflexivas estruturais baseadas nas suas respostas.",
  "Não é diagnóstico clínico, nem substitui psicólogos ou psiquiatras.",
];

const DATA = [
  "As conversas com Reed são processadas pela Anthropic (Claude).",
  "Seus dados são armazenados no Supabase.",
  "Guardamos seu histórico enquanto você continuar usando.",
  "Você pode apagar seus dados a qualquer momento.",
  "Você pode solicitar uma cópia dos seus dados a qualquer momento.",
];

export default function Consent() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="r-screen">
      <AppHeader />

      <main className="r-scroll" style={{ padding: "28px 24px 0" }}>
        <h1 style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 22,
          letterSpacing: "-0.01em", lineHeight: 1.3, color: "var(--r-text)",
          marginBottom: 24, marginTop: 0,
        }}>
          como tratamos seus dados.
        </h1>

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
      </main>

      <div style={{ padding: "20px 24px 48px", flexShrink: 0 }}>
        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.5, marginBottom: 24 }} />

        {/* Checkbox — agora acessível: role=checkbox + aria-checked + keyboard (Space/Enter) */}
        <div
          role="checkbox"
          aria-checked={accepted}
          aria-label="concordo com a Política de Privacidade e os Termos de Uso"
          tabIndex={0}
          onClick={() => setAccepted(a => !a)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              setAccepted(a => !a);
            }
          }}
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 24, outline: "none" }}
          onFocus={(e) => { e.currentTarget.style.outline = "1px dotted var(--r-telha)"; e.currentTarget.style.outlineOffset = "4px"; }}
          onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
        >
          <div aria-hidden="true" style={{
            width: 14, height: 14, flexShrink: 0,
            border: `1px solid ${accepted ? "var(--r-telha)" : "var(--r-ghost)"}`,
            borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
            background: accepted ? "var(--r-telha)" : "transparent", transition: "all 0.15s",
          }}>
            {accepted && <div style={{ width: 6, height: 6, background: "var(--r-bg)", borderRadius: 1 }} />}
          </div>
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
            color: "var(--r-text)", letterSpacing: "0.04em", lineHeight: 1.6,
          }}>
            concordo com a{" "}
            <Link
              to="/privacy"
              target="_blank"
              onClick={e => { e.stopPropagation(); track("consent_privacy_link_clicked"); }}
              style={{ color: "var(--r-telha)", borderBottom: "1px solid var(--r-telha)", paddingBottom: 1, textDecoration: "none" }}
            >
              Política de Privacidade
            </Link>
            {" "}e os{" "}
            <Link
              to="/terms"
              target="_blank"
              onClick={e => { e.stopPropagation(); track("consent_terms_link_clicked"); }}
              style={{ color: "var(--r-telha)", borderBottom: "1px solid var(--r-telha)", paddingBottom: 1, textDecoration: "none" }}
            >
              Termos de Uso
            </Link>.
          </span>
        </div>

        {/* Continue — agora botão real: focável, keyboard-accessible, disabled state semântico */}
        <button
          type="button"
          disabled={!accepted}
          aria-disabled={!accepted}
          onClick={async () => {
            if (!accepted) return;
            track("consent_given");
            await markOnboardingStep("consent_given");
            navigate("/letter");
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "transparent", border: "none", padding: 0,
            cursor: accepted ? "pointer" : "default",
            opacity: accepted ? 1 : 0.35, transition: "opacity 0.2s",
            outline: "none",
          }}
          onFocus={(e) => { if (accepted) { e.currentTarget.style.outline = "1px dotted var(--r-telha)"; e.currentTarget.style.outlineOffset = "4px"; } }}
          onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
        >
          <div aria-hidden="true" style={{ width: 1, height: 12, background: "var(--r-telha)", flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
            color: "var(--r-text)", letterSpacing: "0.06em",
          }}>
            continuar
          </span>
        </button>
      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
