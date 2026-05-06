// src/pages/OnboardingLetter.tsx
// Exibida uma única vez após consentimento.
// Persiste em user_onboarding_state.letter_seen_at (substituiu localStorage flag)
// Após "começar" → /onboarding (coleta de nome)

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";
import { track } from "@/lib/analytics";
import { markOnboardingStep } from "@/hooks/useOnboardingState";

// Typewriter inline — voz sistema com 3 fases:
//   pre:    cursor piscando, texto vazio (preDelay)
//   typing: cursor estático (sólido), texto entrando char a char
//   done:   cursor piscando após texto inteiro (hideCursorAfter ms até sumir)
function Typewriter({ text, charDelayMs = 70, preDelay = 0, hideCursorAfter }: {
  text: string;
  charDelayMs?: number;
  preDelay?: number;
  hideCursorAfter?: number;
}) {
  const [shown, setShown] = useState("");
  const [phase, setPhase] = useState<"pre" | "typing" | "done" | "hidden">("pre");

  useEffect(() => {
    setShown("");
    setPhase("pre");
    let interval: number | undefined;
    let hideTimer: number | undefined;
    const preTimer = window.setTimeout(() => {
      setPhase("typing");
      let i = 0;
      interval = window.setInterval(() => {
        i++;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          if (interval) window.clearInterval(interval);
          setPhase("done");
          if (hideCursorAfter !== undefined) {
            hideTimer = window.setTimeout(() => setPhase("hidden"), hideCursorAfter);
          }
        }
      }, charDelayMs);
    }, preDelay);

    return () => {
      window.clearTimeout(preTimer);
      if (interval) window.clearInterval(interval);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [text, charDelayMs, preDelay, hideCursorAfter]);

  const cursorClass =
    phase === "typing" ? "tw-cursor-static" :
    phase === "hidden" ? "tw-cursor-gone"   :
    "tw-cursor-blink";

  return <>{shown}<span className={cursorClass}>▌</span></>;
}

type LetterKey = "r" | "d" | "w" | "t" | "h";
interface FontDef { f: string; w: number; sz?: number }

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@700" +
  "&family=Bodoni+Moda:opsz,wght@6..96,900&family=Press+Start+2P" +
  "&family=Saira+Condensed:wght@900&family=Gloock&family=Rozha+One" +
  "&family=Cormorant+Garamond:wght@700&family=Teko:wght@700" +
  "&family=DM+Mono:wght@700&family=Abril+Fatface&family=Graduate" +
  "&family=Alfa+Slab+One&family=Big+Shoulders+Display:wght@900" +
  "&family=Literata:opsz,wght@7..72,900&family=Epilogue:wght@900" +
  "&family=Space+Mono:wght@700&family=Playfair+Display:wght@900" +
  "&family=Fraunces:opsz,wght@9..144,900&display=swap";

const FONT_POOLS: Record<LetterKey, FontDef[]> = {
  r: [
    { f: "'IBM Plex Mono', monospace", w: 700 },
    { f: "'Press Start 2P', monospace", w: 400 },
    { f: "'Rozha One', serif", w: 400 },
    { f: "'Graduate', serif", w: 400 },
    { f: "'Epilogue', sans-serif", w: 900 },
    { f: "'Fraunces', serif", w: 900 },
    { f: "'Space Mono', monospace", w: 700 },
  ],
  d: [
    { f: "'Bodoni Moda', serif", w: 900 },
    { f: "'Gloock', serif", w: 400 },
    { f: "'Playfair Display', serif", w: 900 },
    { f: "'Cormorant Garamond', serif", w: 700 },
    { f: "'Abril Fatface', serif", w: 400 },
    { f: "'DM Mono', monospace", w: 700 },
    { f: "'Literata', serif", w: 900 },
  ],
  w: [
    { f: "'Press Start 2P', monospace", w: 400, sz: 0.72 },
    { f: "'Teko', sans-serif", w: 700 },
    { f: "'Saira Condensed', sans-serif", w: 900 },
    { f: "'Big Shoulders Display', sans-serif", w: 900 },
    { f: "'IBM Plex Mono', monospace", w: 700 },
    { f: "'Epilogue', sans-serif", w: 900 },
    { f: "'Space Mono', monospace", w: 700, sz: 0.85 },
  ],
  t: [
    { f: "'Saira Condensed', sans-serif", w: 900 },
    { f: "'Bodoni Moda', serif", w: 900 },
    { f: "'IBM Plex Mono', monospace", w: 700 },
    { f: "'Teko', sans-serif", w: 700 },
    { f: "'Gloock', serif", w: 400 },
    { f: "'Fraunces', serif", w: 900 },
    { f: "'DM Mono', monospace", w: 700 },
  ],
  h: [
    { f: "'Gloock', serif", w: 400 },
    { f: "'Alfa Slab One', serif", w: 400 },
    { f: "'Big Shoulders Display', sans-serif", w: 900 },
    { f: "'Abril Fatface', serif", w: 400 },
    { f: "'Cormorant Garamond', serif", w: 700 },
    { f: "'Press Start 2P', monospace", w: 400, sz: 0.72 },
    { f: "'Playfair Display', serif", w: 900 },
  ],
};

const LETTER_RHYTHM: Record<LetterKey, number> = { r: 900, d: 1600, w: 1200, t: 2000, h: 1050 };
const START_OFFSETS: Record<LetterKey, number> = { r: 0, d: 400, w: 200, t: 700, h: 120 };
const MORPH_IDS = ["morph-ltr-0","morph-ltr-1","morph-ltr-2","morph-ltr-3","morph-ltr-4","morph-ltr-5","morph-ltr-6",null];
const STEP_MS = 28;
const BASE_SIZE = 36; // px
const WORDMARK_HEIGHT = BASE_SIZE * 1.5; // 54px — espaço seguro pra ascenders/descenders das fontes rotacionadas
const MAX_MORPH_CYCLES = 2; // morph estabiliza após 2 ciclos por letra — não distrai durante leitura

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "bom dia.";
  if (h >= 12 && h < 18) return "boa tarde.";
  return "boa noite.";
}

export default function OnboardingLetter() {
  const navigate = useNavigate();
  const lettersRef = useRef<Partial<Record<LetterKey, HTMLSpanElement | null>>>({});
  const stateRef   = useRef<Record<LetterKey, number>>({ r: 0, d: 0, w: 0, t: 0, h: 0 });
  const cyclesRef  = useRef<Record<LetterKey, number>>({ r: 0, d: 0, w: 0, t: 0, h: 0 });
  const frozenRef  = useRef(false); // morph para totalmente quando true (antes da saudação)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stoppedRef  = useRef(false);

  // Cascata sequencial respirada — ritmo de respiração calma.
  // Ordem: wordmark/morph (estabiliza em 2.2s) → saudação > [typewriter]
  //        → carta em 4 parágrafos (cada um respeitando tempo de leitura do anterior)
  //        → citação + link (juntos) → começar
  const [showGreeting, setShowGreeting]       = useState(false);
  const [showCarta1, setShowCarta1]           = useState(false); // "oi."
  const [showCarta2, setShowCarta2]           = useState(false); // parágrafo principal
  const [showCarta3, setShowCarta3]           = useState(false); // "primeiro a gente te conhece..."
  const [showCarta4, setShowCarta4]           = useState(false); // assinatura
  const [showCitacaoLink, setShowCitacaoLink] = useState(false); // citação + link juntos
  const [showComecar, setShowComecar]         = useState(false);
  const cascadeArmedRef = useRef(false);

  useEffect(() => {
    if (cascadeArmedRef.current) return;
    cascadeArmedRef.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Total ~8s — cascata como teatro de entrada; após 8s tudo está visível pra leitura tranquila.
    timers.push(setTimeout(() => setShowGreeting(true),     1200));   // morph parou em 1000
    // typewriter pre 300ms + 10 chars × 60ms = 600ms → termina em ~2100ms; blink+fade até ~2900ms
    timers.push(setTimeout(() => setShowCarta1(true),       2500));   // "oi."
    timers.push(setTimeout(() => setShowCarta2(true),       3300));   // parágrafo principal
    timers.push(setTimeout(() => setShowCarta3(true),       4300));   // "primeiro a gente..."
    timers.push(setTimeout(() => setShowCarta4(true),       5300));   // assinatura
    timers.push(setTimeout(() => setShowCitacaoLink(true),  6300));   // citação + link (juntos)
    timers.push(setTimeout(() => setShowComecar(true),      7500));   // começar
    return () => { timers.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (!document.querySelector(`link[href*="Bodoni+Moda"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    stoppedRef.current = false;

    function applyFont(letter: LetterKey, fd: FontDef) {
      const el = lettersRef.current[letter];
      if (!el) return;
      el.style.fontFamily = fd.f;
      el.style.fontWeight = String(fd.w);
      if (fd.sz) {
        el.style.fontSize = `${BASE_SIZE * fd.sz}px`;
        el.style.paddingBottom = "0.04em";
      } else {
        el.style.fontSize = "";
        el.style.paddingBottom = "";
      }
    }

    function morphLetter(letter: LetterKey) {
      const el = lettersRef.current[letter];
      if (!el || stoppedRef.current || frozenRef.current) return;
      const pool = FONT_POOLS[letter];
      let nextIdx: number;
      do { nextIdx = Math.floor(Math.random() * pool.length); }
      while (nextIdx === stateRef.current[letter]);

      let step = 0;
      function runStep() {
        if (stoppedRef.current || frozenRef.current || !el) return;
        const filterId = MORPH_IDS[step];
        if (filterId === null) { el.style.filter = "none"; return; }
        el.style.filter = `url(#${filterId})`;
        if (step === Math.floor(MORPH_IDS.length / 2)) {
          stateRef.current[letter] = nextIdx;
          applyFont(letter, pool[nextIdx]);
        }
        step++;
        const t = setTimeout(runStep, STEP_MS);
        timeoutsRef.current.push(t);
      }
      runStep();
    }

    function scheduleMorph(letter: LetterKey) {
      if (stoppedRef.current || frozenRef.current) return;
      if (cyclesRef.current[letter] >= MAX_MORPH_CYCLES) return; // estabiliza após N ciclos
      const base = LETTER_RHYTHM[letter];
      const delay = base + Math.random() * base;
      const t = setTimeout(() => {
        if (stoppedRef.current || frozenRef.current) return;
        morphLetter(letter);
        cyclesRef.current[letter] += 1;
        scheduleMorph(letter);
      }, delay);
      timeoutsRef.current.push(t);
    }

    // Freeze do morph antes da saudação entrar — limpa filtros e congela fontes atuais.
    const freezeTimer = setTimeout(() => {
      frozenRef.current = true;
      (Object.keys(lettersRef.current) as LetterKey[]).forEach(k => {
        const el = lettersRef.current[k];
        if (el) el.style.filter = "none";
      });
    }, 1000);
    timeoutsRef.current.push(freezeTimer);

    (Object.keys(FONT_POOLS) as LetterKey[]).forEach(letter => {
      applyFont(letter, FONT_POOLS[letter][0]);
    });
    (Object.keys(START_OFFSETS) as LetterKey[]).forEach(letter => {
      const t = setTimeout(() => scheduleMorph(letter), START_OFFSETS[letter]);
      timeoutsRef.current.push(t);
    });

    return () => {
      stoppedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const handleBegin = async () => {
    track("letter_completed");
    await markOnboardingStep("letter_seen");
    navigate("/onboarding");
  };

  return (
    <div className="r-screen">

      {/* SVG filters */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          {[
            { id: "morph-ltr-0", r: 10, e: 8 },
            { id: "morph-ltr-1", r: 6,  e: 5 },
            { id: "morph-ltr-2", r: 4,  e: 3 },
            { id: "morph-ltr-3", r: 2,  e: 2 },
            { id: "morph-ltr-4", r: 1,  e: 1 },
            { id: "morph-ltr-5", r: 1,  e: 0 },
            { id: "morph-ltr-6", r: 0,  e: 0 },
          ].map(({ id, r, e }) => (
            <filter key={id} id={id} x="0%" y="0%" width="100%" height="100%">
              <feComponentTransfer>
                <feFuncR type="discrete" tableValues="0 1"/>
                <feFuncG type="discrete" tableValues="0 1"/>
                <feFuncB type="discrete" tableValues="0 1"/>
              </feComponentTransfer>
              {r > 0 && <feMorphology operator="dilate" radius={r}/>}
              {e > 0 && <feMorphology operator="erode" radius={e}/>}
            </filter>
          ))}
        </defs>
      </svg>

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Body — scrollável */}
      <div
        className="r-scroll"
        style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: 0 }}
      >

        {/* Wordmark animado + tagline — height fixa pra evitar layout shift quando fontes rotacionam */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            lineHeight: 1,
            marginBottom: 6,
            height: WORDMARK_HEIGHT,
            overflow: "visible",
          }}>
            {(["r","d","w","t","h"] as LetterKey[]).map(letter => (
              <span
                key={letter}
                ref={el => { lettersRef.current[letter] = el; }}
                style={{
                  display: "inline-block",
                  fontSize: BASE_SIZE,
                  color: "var(--r-text)",
                  lineHeight: 1,
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 10,
              color: "var(--r-telha)",
              letterSpacing: "0.14em",
              opacity: 0.7,
            }}
          >
            read with
          </div>
        </div>

        {/* Estilos do cursor — pisca em pre/done, sólido em typing, oculto em hidden */}
        <style>{`
          @keyframes tw-cursor-blink-anim {
            0%, 50% { opacity: 0.6; }
            51%, 100% { opacity: 0; }
          }
          .tw-cursor-blink { animation: tw-cursor-blink-anim 1s step-end infinite; }
          .tw-cursor-static { opacity: 0.6; }
          .tw-cursor-gone { opacity: 0; transition: opacity 600ms ease-out; }
        `}</style>

        {/* Saudação por hora do dia — voz sistema, typewriter c/ cursor blink antes/depois */}
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 10,
            color: "var(--r-muted)",
            letterSpacing: "0.06em",
            marginBottom: 22,
            minHeight: 18,
            opacity: showGreeting ? 1 : 0,
            transition: "opacity 500ms ease-in",
          }}
        >
          {showGreeting && (
            <>
              <span aria-hidden="true">{"> "}</span>
              <Typewriter
                text={greeting()}
                charDelayMs={60}
                preDelay={300}
                hideCursorAfter={800}
              />
            </>
          )}
        </div>

        {/* Carta — voz fundadores (magenta IBM Plex), 4 parágrafos cascateados */}
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 12,
            lineHeight: 1.9,
            color: "var(--r-telha)",
            letterSpacing: "0.03em",
          }}
        >
          {/* §1 oi. */}
          <div style={{
            marginBottom: 18,
            opacity: showCarta1 ? 1 : 0,
            transition: "opacity 700ms ease-in",
          }}>
            oi.
          </div>

          {/* §2 parágrafo principal */}
          <div style={{
            marginBottom: 18,
            opacity: showCarta2 ? 1 : 0,
            transition: "opacity 700ms ease-in",
          }}>
            a gente fez o rdwth pra ler com você<br />
            seus padrões, suas tensões e o que se repete —<br />
            sem diagnóstico, sem prescrição, apenas observação.
          </div>

          {/* §3 primeiro a gente te conhece */}
          <div style={{
            marginBottom: 18,
            opacity: showCarta3 ? 1 : 0,
            transition: "opacity 700ms ease-in",
          }}>
            primeiro a gente te conhece.<br />
            ~4 minutos.
          </div>

          {/* §4 assinatura */}
          <div style={{
            opacity: showCarta4 ? 1 : 0,
            transition: "opacity 700ms ease-in",
          }}>
            — bruno + olivia
          </div>
        </div>

        {/* Citação + link aparecem juntos, fade lento */}
        <div style={{
          opacity: showCitacaoLink ? 1 : 0,
          transition: "opacity 1000ms ease-in",
          marginTop: 32,
          marginBottom: 32,
        }}>
          <div
            style={{
              fontFamily: "var(--r-font-ed)",
              fontWeight: 800,
              fontSize: 16,
              lineHeight: 1.7,
              color: "var(--r-text)",
              letterSpacing: "0.01em",
              marginBottom: 16,
            }}
          >
            “ver com mais precisão<br />
            o que já está ali.”
          </div>

          <Link
            to="/sobre"
            onClick={() => track("letter_manifesto_clicked")}
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 10,
              color: "var(--r-muted)",
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderBottom: "0.5px solid var(--r-ghost)",
              paddingBottom: 1,
            }}
          >
            ler manifesto completo →
          </Link>
        </div>

      </div>

      {/* Footer — começar */}
      <div className="r-line" />
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          flexShrink: 0,
          opacity: showComecar ? 1 : 0,
          transition: "opacity 600ms ease-in",
          pointerEvents: showComecar ? "auto" : "none",
        }}
      >
        <div
          onClick={handleBegin}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <div
            style={{
              width: 1,
              height: 14,
              background: "var(--r-telha)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 11,
              color: "var(--r-text)",
              letterSpacing: "0.08em",
            }}
          >
            começar
          </span>
        </div>
      </div>

    </div>
  );
}
