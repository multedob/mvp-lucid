// src/pages/Home.tsx
// v3.2 — saudação + empty message em cadeia no topo (ONB-7 §1.7)
// Saudação `> {nome}, {período}.` em IBM Plex Mono cinza terminal, no topo.
// Empty message `> comece pela primeira pill.` aparece logo abaixo,
// com delayMs=1100 — espera a saudação digitar antes de começar (cadeia).
// Clique navega pra /pills (CTA via onAction — Bruno d39c861).
// Resto do canvas fica vazio (spacer flex 1 — voz sistema sempre no topo).

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";
import { useUserName } from "@/hooks/useUserName";
import NavBottom from "@/components/NavBottom";
import EmptyStateMessage from "@/components/EmptyStateMessage";
import SystemTerminalLine from "@/components/SystemTerminalLine";

function getGreeting(name: string | null): string | null {
  const hour = new Date().getHours();

  // Sem nome ainda — não saúda
  if (!name) return null;

  // Formato terminal: nome primeiro, período em seguida (ONB-7 §1.7)
  if (hour >= 5 && hour < 12) return `${name}, bom dia.`;
  if (hour >= 12 && hour < 18) return `${name}, boa tarde.`;
  return `${name}, boa noite.`;
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
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Saudação voz sistema — topo do canvas */}
      {greeting && (
        <div style={{
          padding: "12px 24px 0",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.8s ease-in",
        }}>
          <SystemTerminalLine text={greeting} />
        </div>
      )}

      {/* Empty canvas — em cadeia logo abaixo da saudação (delayMs espera saudação) */}
      {/* Clique navega pra /pills (CTA via onAction) */}
      <EmptyStateMessage
        text="comece pela primeira pill."
        contextKey="home_first_visit"
        delayMs={1100}
        onAction={() => navigate("/pills")}
      />

      {/* Spacer — restante do canvas vazio */}
      <div style={{ flex: 1 }} />

      <NavBottom active="home" />

    </div>
  );
}
