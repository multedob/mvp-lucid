// src/components/LoadingScreen.tsx
// ============================================================
// Loading screen v4 — TUDO no campo da voz do sistema (topo-esquerda).
// Cada linha é um SystemTerminalLine (typewriter + cursor quadrado).
//
// Sequência de 3 linhas empilhadas (o morph foi removido em v4):
//   > frase Diablo 1           ← linha 1 (entra imediato)
//   > frase Diablo 2           ← linha 2 (entra após LINE_DELAY_MS)
//   > pronto.                  ← linha 3 (só quando loadComplete + tempo mínimo)
//
// Frases Diablo são SORTEADAS do pool e distintas. Após "pronto." → fade + onDone.
// ============================================================

import { useEffect, useRef, useState } from "react";
import AppHeader from "./AppHeader";
import NavBottom, { type ActivePage } from "./NavBottom";
import SystemTerminalLine from "./SystemTerminalLine";

const LINE_DELAY_MS = 2500;       // tempo entre cada linha — ~ritmo de leitura
const MIN_BEFORE_DONE_MS = 5000;  // tempo mínimo total antes de "pronto." — dá tempo de ler diablo 2
const READY_HOLD_MS = 1200;       // quanto "pronto." fica visível antes de fade
const FADE_MS = 400;

// Pool inicial — 30 frases (Bruno cura depois editando o array).
// Categorizadas por tipo: mecânica, ciclos, terceiros, ética/privacidade,
// Reed/voz, estrutura, filosofia.
const DIABLO_POOL: string[] = [
  // Mecânica do sistema
  "Um ciclo tem tensões, perguntas e amigos.",
  "As tensões são leituras curtas. Você reage, o sistema escuta.",
  "Cada tensão representa uma dimensão da sua estrutura.",
  "O ciclo tem 18 blocos em 4 dimensões.",
  "Você pode pausar o ciclo. Ele guarda onde parou.",
  "As tensões alimentam o sistema e revelam padrões.",
  "Um ciclo se fecha quando tensões, perguntas e amigos estão respondidos.",
  // Profundidade no tempo
  "Quanto mais ciclos, mais camadas aparecem.",
  "Sua leitura se aprofunda com o tempo, não com a pressa.",
  "Padrões só aparecem com repetição.",
  "O rdwth amadurece com você ao longo dos ciclos.",
  // Amigos
  "A visão dos amigos mitiga seus pontos cegos.",
  "Pessoas próximas veem coisas que você não vê de dentro.",
  "Convidar amigos leva 5 minutos do lado deles.",
  "Você pode revogar um convite a qualquer momento.",
  "Amigos respondem em anonimato se preferirem.",
  // Privacidade
  "Suas respostas são suas. O rdwth não compartilha nada.",
  "O rdwth não diagnostica. Ele não preescreve.",
  "Você pode apagar tudo a qualquer momento em ajustes.",
  "Reed presta atenção, mas não julga.",
  "O rdwth não tira a responsabilidade de você.",
  // Reed
  "Reed é a voz do rdwth. Não é humano, mas escuta com atenção.",
  "Reed lê o que você traz, não o que você não disse.",
  "Pode usar áudio com o Reed em vez de texto, se for mais natural.",
  // Estrutura
  "O rdwth lê 16 verticais diferentes sobre você.",
  "Cada eco é observação estrutural, não opinião.",
  "Sua estrutura não é fixa. Ela se desenha com o tempo.",
  // Filosofia
  "Olhar pra dentro precisa de tempo e silêncio.",
  "Algumas coisas só aparecem quando você nomeia.",
  "O que você adia, o sistema observa.",
  "Auto-conhecimento não é destino — é movimento.",
];

interface Props {
  loadComplete?: boolean;
  onDone?: () => void;
  /** Texto do meio do header (ex: "reed", "contexto"). Sem section, só "rdwth | data". */
  section?: string;
  /** Item ativo do NavBottom (ilumina enquanto carrega). Default: "none". */
  active?: ActivePage;
  /** Esconde o NavBottom — usado em ThirdParty (terceiro sem app). */
  hideNav?: boolean;
}

function pickRandom<T>(pool: T[], excluding: T[] = []): T {
  const candidates = pool.filter(p => !excluding.includes(p));
  const arr = candidates.length > 0 ? candidates : pool;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function LoadingScreen({
  loadComplete = true,
  onDone,
  section,
  active = "none",
  hideNav = false,
}: Props) {
  // shownCount controla quantas linhas estão visíveis (0..3):
  //   1 = diablo1; 2 = +diablo2; 3 = +pronto
  const [shownCount, setShownCount] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const loadCompleteRef = useRef(loadComplete);
  loadCompleteRef.current = loadComplete;
  const startTimeRef = useRef(Date.now());

  // Sorteia 2 frases Diablo distintas no mount (não rotacionam — entram em sequência)
  const [diablo1] = useState<string>(() => pickRandom(DIABLO_POOL));
  const [diablo2] = useState<string>(() => pickRandom(DIABLO_POOL, [diablo1]));

  // Cadeia das linhas (todas no campo da voz sistema):
  //   t=0       → diablo1        (shownCount 0→1)
  //   t=2500ms  → diablo2        (shownCount 1→2)
  //   loadComplete && t≥5000ms → pronto (shownCount 2→3)
  useEffect(() => {
    setShownCount(1);
    const t1 = window.setTimeout(() => setShownCount(2), LINE_DELAY_MS);
    return () => window.clearTimeout(t1);
  }, []);

  // Vigilância pra mostrar "pronto." quando: load completo + tempo mínimo
  useEffect(() => {
    if (shownCount < 2) return;
    const checkInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (loadCompleteRef.current && elapsed >= MIN_BEFORE_DONE_MS) {
        window.clearInterval(checkInterval);
        setShownCount(3);
      }
    }, 100);
    return () => window.clearInterval(checkInterval);
  }, [shownCount]);

  // Quando "pronto." aparece, espera HOLD + FADE e chama onDone
  useEffect(() => {
    if (shownCount !== 3) return;
    const t1 = window.setTimeout(() => setFadingOut(true), READY_HOLD_MS);
    const t2 = window.setTimeout(() => onDone?.(), READY_HOLD_MS + FADE_MS);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [shownCount, onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--r-bg)",
        zIndex: 100,
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        animation: "rdwth-ls-fade-in 400ms ease-out",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {/* Container centralizado — mesma largura mobile no desktop.
          Estrutura: AppHeader (top) → main relativo (voz sistema + centro) → NavBottom. */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 480,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}>
      <style>{`
        @keyframes rdwth-ls-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Header canônico — `rdwth | section | YYYY.MM.DD` */}
      <AppHeader section={section} />

      {/* Main — voz sistema topo (~12px abaixo do header) + Wordmark/Diablo central */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {/* Voz sistema — topo-esquerda, abaixo do header (não colide mais com r-header) */}
        <div style={{
          position: "absolute",
          top: 12,
          left: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 1,
        }}>
          {/* Linha 1 — diablo 1 (typewriter + cursor quadrado) */}
          {shownCount >= 1 && <SystemTerminalLine text={diablo1} />}

          {/* Linha 2 — diablo 2 */}
          {shownCount >= 2 && <SystemTerminalLine text={diablo2} />}

          {/* Linha 3 — pronto. (só com loadComplete && tempo mínimo) */}
          {shownCount >= 3 && <SystemTerminalLine text="pronto." />}
        </div>
      </div>

      {/* NavBottom com item ativo iluminado — esconde no ThirdParty (terceiro sem app) */}
      {!hideNav && <NavBottom active={active} />}
      </div>
    </div>
  );
}
