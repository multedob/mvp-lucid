// src/pages/Sobre.tsx
// Manifesto completo do rdwth — voz dos fundadores
// Acessível via /sobre, ou link a partir de OnboardingLetter

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function Sobre() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">
          <span onClick={() => navigate(-1)} style={{ cursor: "pointer" }}>rdwth</span> · sobre
        </span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ flex: 1, padding: "28px 24px" }}>
        {/* Manifesto completo — voz fundadores: IBM Plex Mono COLORIDO (var(--r-telha)) */}
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 12,
            lineHeight: 1.9,
            color: "var(--r-telha)",
            letterSpacing: "0.03em",
          }}
        >
          Tornamos padrões visíveis.<br />
          Tornamos a complexidade legível.
          <br /><br />
          Por trás de cada escolha, conflito, impulso ou repetição,<br />
          existe uma estrutura em ação.
          <br /><br />
          rdwth foi criado para tornar essa estrutura legível —<br />
          sem reduzir uma pessoa a um tipo,<br />
          transformar diferença em hierarquia,<br />
          ou confundir padrão com identidade.
          <br /><br />
          Não oferecemos respostas prontas.<br />
          Oferecemos leitura.
          <br /><br />
          O tipo de leitura que coloca tensões em foco,<br />
          organiza a complexidade,<br />
          e devolve algo raro:
          <br /><br />
          uma visão mais clara do que está moldando<br />
          a experiência de alguém,<br />
          mantendo a responsabilidade nas mãos dela.
          <br /><br />
          Sem diagnóstico.<br />
          Sem prescrição.<br />
          Sem conclusões fixas.
          <br /><br />
          Só uma proposição simples e radical:
        </div>

        {/* Proposição — destaque */}
        <div
          style={{
            fontFamily: "var(--r-font-ed)",
            fontWeight: 800,
            fontSize: 18,
            lineHeight: 1.7,
            color: "var(--r-text)",
            letterSpacing: "0.01em",
            marginTop: 28,
            marginBottom: 32,
          }}
        >
          ver com mais precisão<br />
          o que já está ali.
        </div>

        {/* Voltar */}
        <div
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 16 }}
        >
          <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
            color: "var(--r-muted)", letterSpacing: "0.06em",
          }}>
            voltar
          </span>
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
