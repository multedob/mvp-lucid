// src/pages/Home.tsx
// Tela vazia — header + nav bottom apenas.
// O centro fica em branco; futuramente pode receber mensagens do sistema.

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";
import NavBottom from "@/components/NavBottom";

// Troque para uma string quando quiser exibir uma mensagem do sistema no centro.
const systemMessage: string | null = null;

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>_rdwth</span></span>
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

      <NavBottom active="home" />

    </div>
  );
}
