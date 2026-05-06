// src/components/LoadingScreen.tsx
// ============================================================
// Loading screen v2 — voz sistema empilhada + Wordmark + frases Diablo-style
//
// Estrutura:
//   ┌──────────────────────────────────────────┐
//   │ > frase 1                                │  ← topo-esq, voz sistema
//   │ > frase 2                                │     fade-in sequencial
//   │ > frase 3 (pronto.)                      │     última só com loadComplete
//   │                                          │
//   │           rdwth (wordmark)               │  ← centro, identidade
//   │                                          │
//   │      [frase Diablo rotacionando 1]       │  ← embaixo, educação
//   │      [frase Diablo rotacionando 2]       │     2 frases, troca a cada 5s
//   └──────────────────────────────────────────┘
//
// Tempo MÍNIMO total ~3500ms (1500ms entre linhas + 500ms fade out).
// Diablo rotaciona enquanto loading; some no fade out final.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { AnimatedWordmark } from "./AnimatedWordmark";

const LINE_DELAY_MS = 1500;       // tempo entre frase 1 → 2
const MIN_BEFORE_DONE_MS = 4500;  // tempo mínimo total antes de mostrar "pronto." — dá tempo de ler 1 frase Diablo
const READY_HOLD_MS = 1200;       // quanto "pronto." fica visível antes de fade
const FADE_MS = 400;
const DIABLO_ROTATE_MS = 5000;    // a cada 5s, troca 1 das 2 frases visíveis
const FADE_LINE_MS = 500;

// Pool inicial — 30 frases (Bruno cura depois editando o array).
// Categorizadas por tipo: mecânica, ciclos, terceiros, ética/privacidade,
// Reed/voz, estrutura, filosofia.
const DIABLO_POOL: string[] = [
  // Mecânica do sistema
  "Um ciclo é composto por pills, questionário e terceiros.",
  "As pills são leituras curtas. Você reage, o sistema escuta.",
  "Cada pill representa uma dimensão da sua estrutura.",
  "O questionário tem 18 blocos em 4 dimensões.",
  "Você pode pausar o questionário. Ele guarda onde parou.",
  "As pills alimentam o sistema e revelam padrões.",
  "Um ciclo se fecha quando pills, questionário e terceiros estão respondidos.",
  // Profundidade no tempo
  "Quanto mais ciclos, mais camadas aparecem.",
  "Sua leitura se aprofunda com o tempo, não com a pressa.",
  "Padrões só aparecem com repetição.",
  "O rdwth amadurece com você ao longo dos ciclos.",
  // Terceiros
  "A visão de terceiros mitiga seus pontos cegos.",
  "Pessoas próximas veem coisas que você não vê de dentro.",
  "Convidar terceiros leva 5 minutos do lado deles.",
  "Você pode revogar um convite de terceiro a qualquer momento.",
  "Terceiros respondem em anonimato se preferirem.",
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
  phrases: [string, string, string];
  loadComplete?: boolean;
  onDone?: () => void;
}

function pickRandom<T>(pool: T[], excluding: T[] = []): T {
  const candidates = pool.filter(p => !excluding.includes(p));
  const arr = candidates.length > 0 ? candidates : pool;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function LoadingScreen({ phrases, loadComplete = true, onDone }: Props) {
  // Sistema empilhado: shownCount controla quantas linhas estão visíveis (0..3)
  const [shownCount, setShownCount] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const loadCompleteRef = useRef(loadComplete);
  loadCompleteRef.current = loadComplete;
  const startTimeRef = useRef(Date.now());

  // Diablo: 2 frases visíveis, rotaciona uma de cada vez
  const [diabloPair, setDiabloPair] = useState<[string, string]>(() => {
    const a = pickRandom(DIABLO_POOL);
    const b = pickRandom(DIABLO_POOL, [a]);
    return [a, b];
  });

  // Cadeia das frases sistema:
  // - frase 1: imediato (shownCount 0→1)
  // - frase 2: após LINE_DELAY_MS (shownCount 1→2)
  // - frase 3 ("pronto."): só quando loadComplete E elapsed >= MIN_BEFORE_DONE_MS
  useEffect(() => {
    setShownCount(1);
    const t1 = window.setTimeout(() => setShownCount(2), LINE_DELAY_MS);
    return () => window.clearTimeout(t1);
  }, []);

  // Vigilância pra mostrar frase 3 quando ambos: load completo + tempo mínimo
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

  // Quando frase 3 aparece, espera HOLD + FADE e chama onDone
  useEffect(() => {
    if (shownCount !== 3) return;
    const t1 = window.setTimeout(() => setFadingOut(true), READY_HOLD_MS);
    const t2 = window.setTimeout(() => onDone?.(), READY_HOLD_MS + FADE_MS);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [shownCount, onDone]);

  // Diablo rotation
  useEffect(() => {
    const interval = window.setInterval(() => {
      setDiabloPair(prev => {
        const idxToReplace = Math.random() < 0.5 ? 0 : 1;
        const candidate = pickRandom(DIABLO_POOL, [prev[0], prev[1]]);
        const next: [string, string] = [prev[0], prev[1]];
        next[idxToReplace] = candidate;
        return next;
      });
    }, DIABLO_ROTATE_MS);
    return () => window.clearInterval(interval);
  }, []);

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
      {/* Container centralizado — mesma largura mobile no desktop */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 480,
        height: "100%",
      }}>
      <style>{`
        @keyframes rdwth-ls-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes rdwth-ls-line-in {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rdwth-ls-diablo-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .rdwth-ls-line {
          animation: rdwth-ls-line-in ${FADE_LINE_MS}ms ease-out forwards;
        }
        .rdwth-ls-diablo {
          animation: rdwth-ls-diablo-in 600ms ease-in forwards;
        }
      `}</style>

      {/* Voz sistema — topo-esquerda, margens apertadas (igual r-header) */}
      <div style={{
        position: "absolute",
        top: 14,
        left: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}>
        {phrases.slice(0, shownCount).map((p, i) => (
          <div
            key={i}
            className="rdwth-ls-line"
            style={{
              fontFamily: "var(--r-font-sys, 'IBM Plex Mono', monospace)",
              fontSize: 11,
              fontWeight: 300,
              color: "var(--r-voice-sys, #585860)",
              letterSpacing: "0.04em",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            <span aria-hidden="true">{"> "}</span>
            {p}
          </div>
        ))}
      </div>

      {/* Centro: Wordmark + Diablo phrases logo abaixo (flex column).
          Mesmo layout em desktop e mobile. Margens laterais apertadas. */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "0 16px",
      }}>
        <AnimatedWordmark fontSize="clamp(40px, 8vw, 80px)" />

        {/* Frases Diablo logo abaixo da logo, centralizadas. Contraste aumentado
            (voice-sys cor canônica WCAG AA + opacity 1). */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}>
          {diabloPair.map((phrase, i) => (
            <div
              key={`${i}-${phrase}`}
              className="rdwth-ls-diablo"
              style={{
                fontFamily: "var(--r-font-sys, 'IBM Plex Mono', monospace)",
                fontSize: 11,
                fontWeight: 300,
                color: "var(--r-voice-sys, #585860)",
                letterSpacing: "0.04em",
                lineHeight: 1.6,
                textAlign: "center",
                maxWidth: 420,
              }}
            >
              {phrase}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
