// src/pages/Home.tsx
// Tela vazia — header + nav bottom apenas.
// O centro fica em branco; futuramente pode receber mensagens do sistema.

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

// Troque para uma string quando quiser exibir uma mensagem do sistema no centro.
const systemMessage: string | null = null;

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label">_rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Centro — vazio ou mensagem do sistema */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}>
        {systemMessage && (
          <p style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 11,
            color: "var(--r-muted)",
            letterSpacing: "0.04em",
            lineHeight: 1.8,
            textAlign: "center",
            margin: 0,
          }}>
            {systemMessage}
          </p>
        )}
      </div>

      {/* Nav bottom */}
      <div className="r-line" />
      <div style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 28,
        flexShrink: 0,
      }}>
        {[
          { label: "pills",   path: "/pills" },
          { label: "context", path: "/context" },
          { label: "reed",    path: "/reed" },
        ].map(({ label, path }) => (
          <span
            key={label}
            onClick={() => navigate(path)}
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 11,
              color: "var(--r-muted)",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            {label}
          </span>
        ))}
        <div
          onClick={() => navigate("/settings")}
          style={{
            marginLeft: "auto",
            width: 6,
            height: 6,
            borderRadius: "50%",
            border: "1px solid var(--r-ghost)",
            background: "transparent",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
      </div>

    </div>
  );
}
