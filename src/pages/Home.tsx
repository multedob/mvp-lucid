// src/pages/Home.tsx
// v3.4 — saudação + empty message em cadeia + team_message banner topo (B-S5.F2)
// Saudação `> {nome}, {período}.` em IBM Plex Mono cinza terminal.
// Empty message `> comece pela primeira pill.` em cadeia logo abaixo.
// TeamMessage como banner editorial no topo (acima da saudação) — só
// renderiza quando há mensagem ativa que user nunca viu (cache 3 visitas).
// Clique no empty navega pra /pills (CTA via onAction — Bruno d39c861).
//
// Fix v3.4: removido fade-in opacity da saudação que escondia o typewriter
// (typewriter rodava invisível, texto aparecia completo via fade). Agora
// saudação aparece imediatamente, typewriter visível desde o começo.

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getToday } from "@/lib/api";
import { useUserName } from "@/hooks/useUserName";
import NavBottom from "@/components/NavBottom";
import EmptyStateMessage from "@/components/EmptyStateMessage";
import SystemTerminalLine from "@/components/SystemTerminalLine";
import TeamMessage from "@/components/TeamMessage";

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
  const location = useLocation();
  const userName = useUserName();
  const [greeting, setGreeting] = useState<string | null>(null);

  // AFC ONB-6/7 — pulse roxo único na NavBottom quando user vem de /warmup.
  // Limpa state imediatamente pra não disparar de novo em refresh.
  const [pulseNavOnce, setPulseNavOnce] = useState(false);
  useEffect(() => {
    const fromWarmup = (location.state as { warmupJustCompleted?: boolean } | null)?.warmupJustCompleted;
    if (fromWarmup) {
      setPulseNavOnce(true);
      // Remove state da history pra evitar re-trigger em F5
      window.history.replaceState({}, document.title);
    }
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

      {/* TeamMessage — banner editorial topo (só renderiza se houver mensagem ativa) */}
      <TeamMessage contextKey="home_first_visit" />

      {/* Saudação voz sistema — espera TeamMessage aparecer (delayMs=700) */}
      {greeting && (
        <div style={{ padding: "12px 24px 0" }}>
          <SystemTerminalLine text={greeting} delayMs={700} />
        </div>
      )}

      {/* Empty canvas — em cadeia após saudação terminar de digitar (delayMs=1500) */}
      <EmptyStateMessage
        text="comece pela primeira pill."
        contextKey="home_first_visit"
        delayMs={1500}
        onAction={() => navigate("/pills")}
      />

      {/* Spacer — restante do canvas vazio */}
      <div style={{ flex: 1 }} />

      <NavBottom active="home" pulseOnce={pulseNavOnce} />

    </div>
  );
}
