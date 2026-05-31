// src/pages/Entrada.tsx
// Tela intermediária entre /alpha e /auth.
// Mesma identidade visual do Splash (wordmark morfando + "read with" colorido).
// Auto-avança pra /auth em ~2.5s. Clique antecipa.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { getToday } from "@/lib/api";

export default function Entrada() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate("/auth", { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      onClick={() => navigate("/auth", { replace: true })}
      className="r-screen"
      style={{ cursor: "pointer" }}
    >
      {/* data no topo direito */}
      <div
        style={{
          padding: "18px 24px 16px",
          display: "flex",
          justifyContent: "flex-end",
          flexShrink: 0,
        }}
      >
        <span className="r-header-date">{getToday()}</span>
      </div>

      <div className="r-line" style={{ opacity: 0.2 }} />

      <div style={{ flex: 1 }} />

      {/* wordmark + tagline — ancorados no rodapé */}
      <div style={{ padding: "20px 24px 20px", flexShrink: 0 }}>
        <div style={{ marginBottom: 10 }}>
          <AnimatedWordmark fontSize="clamp(52px, 9.5vw, 112px)" />
        </div>

        <div
          style={{
            fontFamily: "'Barlow', 'IBM Plex Mono', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            color: "var(--r-telha)",
            letterSpacing: "0.06em",
            lineHeight: 1.8,
          }}
        >
          read with
        </div>
      </div>

      <div className="r-line" style={{ opacity: 0.2 }} />

      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
