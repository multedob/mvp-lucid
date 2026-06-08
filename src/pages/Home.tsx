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
import { useUserName } from "@/hooks/useUserName";
import { useShell } from "@/hooks/useShell";
import SystemTerminalLine from "@/components/SystemTerminalLine";
import SystemPulse from "@/components/SystemPulse";
import SystemPulseRotation from "@/components/SystemPulseRotation";
import TeamMessage from "@/components/TeamMessage";
import useHomeGuide from "@/hooks/useHomeGuide";
import useHomeNotices from "@/hooks/useHomeNotices";
import { FeedbackButton } from "@/components/FeedbackButton";

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

  // Mantém header sem section + nav active=home enquanto na Home
  useShell({ section: undefined, active: "home" });

  // Modo guiado marco-driven (pulse + frase curta) + notices empilháveis
  const { guide } = useHomeGuide();
  const { notices } = useHomeNotices();

  // Cascade depende do TeamMessage (que é async — fetch edge function).
  // Estados:
  //   teamLoaded: TeamMessage terminou de carregar (com ou sem mensagem)
  //   teamHasMessage: tem mensagem editorial ativa
  //   showGreeting/showGuide: controlam render via setTimeout pós-load
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamHasMessage, setTeamHasMessage] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Pulse só dispara DEPOIS da frase digitar
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    const fromWarmup = !!(location.state as { warmupJustCompleted?: boolean } | null)?.warmupJustCompleted;
    if (fromWarmup) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const text = getGreeting(userName);
    if (text) setGreeting(text);
  }, [userName]);

  // Cascade dinâmico — espera TeamMessage carregar antes de armar saudação/guide.
  // Com mensagem: 3500ms (lê) → greeting → 2000ms → guide
  // Sem mensagem: 200ms → greeting → 1500ms → guide
  useEffect(() => {
    if (!teamLoaded) return;
    const greetDelay = teamHasMessage ? 3500 : 200;
    const guideDelay = teamHasMessage ? 5500 : 1700;
    const pulseDelay = teamHasMessage ? 7500 : 3500;
    const t1 = window.setTimeout(() => setShowGreeting(true), greetDelay);
    const t2 = window.setTimeout(() => setShowGuide(true), guideDelay);
    const t3 = window.setTimeout(() => setPulseActive(true), pulseDelay);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [teamLoaded, teamHasMessage]);

  return (
    <>
      {/* Voice slot — espaço reservado (~110px) pra coexistir com FlowVoice.
          Sem flow: TeamMessage + saudação + guide ocupam.
          Com flow (clique no NavBottom): Home desmonta imediatamente — espaço da
          página alvo assume o overlay. */}
      <div style={{ minHeight: 110, flexShrink: 0 }}>
        <TeamMessage
          contextKey="home_first_visit"
          onLoaded={(has) => {
            setTeamHasMessage(has);
            setTeamLoaded(true);
          }}
        />

        {/* Voice slot 110px (cresce conforme conteúdo) — paridade com /tensão /ciclo /amigos /leitura.
            Fix UX 06/jun: notices (avisos do sistema) agora ficam dentro do mesmo bloco
            do greeting, separados por gap mínimo — antes ficavam num container separado abaixo,
            criando vácuo visual entre a saudação e o aviso. */}
        <div
          style={{
            padding: "12px 24px 20px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            minHeight: 110,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {greeting && showGreeting && (
              <SystemTerminalLine text={greeting} delayMs={0} />
            )}
            {guide && showGuide && (
              <SystemTerminalLine text={guide.frase} delayMs={0} />
            )}
            {showGuide && notices.length > 0 && notices.map((n, i) => (
              <div key={n.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <SystemTerminalLine text={n.frase} delayMs={i * 600} showCursor={false} />
                <button
                  type="button"
                  onClick={() => navigate(n.ctaPath)}
                  style={{
                    alignSelf: "flex-start",
                    background: "transparent",
                    border: "none",
                    padding: "4px 0",
                    cursor: "pointer",
                    fontFamily: "var(--r-font-sys)",
                    fontWeight: 400,
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: "var(--r-telha)",
                  }}
                >
                  {n.ctaLabel} →
                </button>
              </div>
            ))}
          </div>
          <FeedbackButton />
        </div>
      </div>

      {/* Spacer — restante do canvas vazio */}
      <div style={{ flex: 1 }} />

      {/* Pulse no destino do marco */}
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
    </>
  );
}
