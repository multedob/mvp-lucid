// src/pages/Splash.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

export default function Splash() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // fade in
    const t1 = setTimeout(() => setVisible(true), 120);

    // após 3.8s — verificar sessão e redirecionar
    const t2 = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      navigate(session ? "/home" : "/auth", { replace: true });
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [navigate]);

  const handleClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    navigate(session ? "/home" : "/auth", { replace: true });
  };

  return (
    <div
      onClick={handleClick}
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
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s ease 0.1s",
        }}
      >
        <span className="r-header-date">{getToday()}</span>
      </div>

      {/* linha superior */}
      <div
        className="r-line"
        style={{
          opacity: visible ? 0.2 : 0,
          transition: "opacity 0.5s ease 0.15s",
        }}
      />

      {/* espaço vazio */}
      <div style={{ flex: 1 }} />

      {/* wordmark — ancorado no rodapé */}
      <div
        style={{
          padding: "20px 24px 20px",
          flexShrink: 0,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
        }}
      >
        <div className="r-wordmark" style={{ marginBottom: 10 }}>
          _rdwth
        </div>
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 11,
            color: "var(--r-accent)",
            letterSpacing: "0.06em",
            lineHeight: 1.8,
          }}
        >
          read with insight.
        </div>
      </div>

      {/* linha inferior */}
      <div
        className="r-line"
        style={{
          opacity: visible ? 0.2 : 0,
          transition: "opacity 0.6s ease 0.3s",
        }}
      />

      {/* safe area */}
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
