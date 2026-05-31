// src/pages/Entrada.tsx
// Tela intermediária entre /alpha e /auth.
// Mostra a wordmark animada (morph rdwth) por ~2.5s, depois navega pra /auth.
// Clique antecipa.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";

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
      style={{
        cursor: "pointer",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <AnimatedWordmark fontSize="clamp(52px, 9.5vw, 112px)" />
    </div>
  );
}
