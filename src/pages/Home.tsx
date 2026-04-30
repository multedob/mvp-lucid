// src/pages/Home.tsx
// v2.0 — greeting com nome do usuário
// Centro: saudação personalizada silenciosa

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";
import { useUserName } from "@/hooks/useUserName";
import NavBottom from "@/components/NavBottom";

function getGreeting(name: string | null): string | null {
  const hour = new Date().getHours();

  // First visit ever — no name yet
  if (!name) return null;

  // Time-aware, minimal, warm
  if (hour >= 5 && hour < 12) return `bom dia, ${name}.`;
  if (hour >= 12 && hour < 18) return `oi, ${name}.`;
  if (hour >= 18 && hour < 23) return `boa noite, ${name}.`;
  return `${name}.`;
}

export default function Home() {
  const navigate = useNavigate();
  const userName = useUserName();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const text = getGreeting(userName);
    if (text) {
      setGreeting(text);
      // Fade in after a brief pause — feels intentional, not instant
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [userName]);

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">início</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Centro — saudação personalizada */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}>
        {greeting && (
          <p style={{
            fontFamily: "var(--r-font-ed)",
            fontWeight: 300,
            fontSize: 14,
            color: "var(--r-muted)",
            letterSpacing: "0.02em",
            lineHeight: 1.8,
            textAlign: "center",
            margin: 0,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease-in",
          }}>
            {greeting}
          </p>
        )}
      </div>

      <NavBottom active="home" />

    </div>
  );
}
