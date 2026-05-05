// src/pages/Home.tsx
// v3.6 — modo guiado marco-driven (B-S5.G3 + B-S5.H1 light)
//
// Sequência de aparição:
// 1. TeamMessage (banner editorial topo) — só renderiza se houver mensagem ativa
// 2. Saudação `> {nome}, {período}.` em IBM Plex Mono cinza (delayMs=700)
// 3. Frase do marco-driven (substitui o EmptyStateMessage anterior)
// 4. Pulse roxo (single ou rotação) no destino do marco — dispara após frase digitar
//
// useHomeGuide() detecta marco atual via Supabase e retorna {frase, target/targets}.
// Se vem do warmup, NavBottom pulsa a respiração única antes do pulse single-target.

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getToday } from "@/lib/api";
import { useUserName } from "@/hooks/useUserName";
import NavBottom from "@/components/NavBottom";
import SystemTerminalLine from "@/components/SystemTerminalLine";
import SystemPulse from "@/components/SystemPulse";
import SystemPulseRotation from "@/components/SystemPulseRotation";
import TeamMessage from "@/components/TeamMessage";
import useHomeGuide from "@/hooks/useHomeGuide";

function getGreeting(name: string | null): string | null {
  const hour = new Date().getHours();

  if (!name) return null;

  if (hour >= 5 && hour < 12) return `${name}, bom dia.`;
  if (hour >= 12 && hour < 18) return `${name}, boa tarde.`;
  return `${name}, boa noite.`;
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = useUserName();
  const [greeting, setGreeting] = useState<string | null>(null);

  // Modo guiado marco-driven
  const { guide } = useHomeGuide();

  // Pulse só dispara DEPOIS da frase digitar (delayMs 1500 + ~700ms typewriter ≈ 2500ms)
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    const fromWarmup = !!(location.state as { warmupJustCompleted?: boolean } | null)?.warmupJustCompleted;
    if (fromWarmup) {
      window.history.replaceState({}, document.title);
    }
    // Single-target pulse depois da frase digitar (não usamos mais respiração única
    // na NavBottom inteira — substituída por single-target/rotation no destino do marco)
    const timer = setTimeout(() => setPulseActive(true), 2500);
    return () => clearTimeout(timer);
  }, [location.state]);

  useEffect(() => {
    const text = getGreeting(userName);
    if (text) setGreeting(text);
  }, [userName]);

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* TeamMessage — voz fundadores, banner editorial topo (entra primeiro) */}
      <TeamMessage contextKey="home_first_visit" />

      {/* Saudação voz sistema — espera TeamMessage ser lida (texto longo dos fundadores) */}
      {greeting && (
        <div style={{ padding: "12px 24px 0" }}>
          <SystemTerminalLine text={greeting} delayMs={4500} />
        </div>
      )}

      {/* Frase guide — em cadeia após saudação (cascade total ~7s) */}
      {guide && (
        <div style={{ padding: "12px 24px 20px" }}>
          <SystemTerminalLine text={guide.frase} delayMs={6500} />
        </div>
      )}

      {/* Spacer — restante do canvas vazio */}
      <div style={{ flex: 1 }} />

      {/* Pulse no destino do marco (single ou rotação) — dispara depois da frase digitar */}
      {guide?.target && pulseActive && (
        <SystemPulse targetId={guide.target} active={true} />
      )}
      {guide?.targets && pulseActive && (
        <SystemPulseRotation
          targetIds={guide.targets}
          perTargetMs={guide.perTargetMs ?? 7000}
          active={true}
        />
      )}

      <NavBottom active="home" />

    </div>
  );
}
