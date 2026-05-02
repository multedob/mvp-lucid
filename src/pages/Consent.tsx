// src/pages/Consent.tsx
// Aceite de Política de Privacidade + Termos — segundo passo do onboarding
// Checkbox → habilita "continuar" → seta flag + /letter

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ABOUT = [
  "rdwth oferece leituras reflexivas estruturais baseadas nas suas respostas.",
  "Não é diagnóstico clínico.",
  "Não substitui psicólogos, psiquiatras ou outros profissionais de saúde.",
  "Não determina identidade nem valor humano.",
  "Nenhuma configuração estrutural implica superioridade.",
];

const DATA = [
  "Coletamos o que você compartilha conosco.",
  "Geramos leituras estruturais a partir das suas respostas.",
  "Guardamos seu histórico se você escolher continuar.",
  "Você pode apagar seus dados a qualquer momento.",
  "Você pode solicitar uma cópia dos seus dados a qualquer momento.",
];

export default function Consent() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 0" }}>
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 22,
          letterSpacing: "-0.01em", lineHeight: 1.3, color: "var(--r-text)",
          marginBottom: 24,
        }}>
          antes de começar.
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
            concordo com a{" "}
            <span style={{ color: "var(--r-accent)", borderBottom: "1px solid var(--r-accent)", paddingBottom: 1 }}>
              Política de Privacidade
            </span>
            {" "}e os{" "}
            <span style={{ color: "var(--r-accent)", borderBottom: "1px solid var(--r-accent)", paddingBottom: 1 }}>
              Termos de Uso
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
            continuar
          </span>
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
