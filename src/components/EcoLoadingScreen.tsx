// ============================================================
// EcoLoadingScreen (Wave 12.b)
// Tela de loading entre M4 → M5 enquanto ipe-eco gera o eco.
// Reusa mecanismo de morph SVG do Splash — UMA palavra-chave
// que troca de fonte com efeito morph (dilate/erode).
// + pulse + frase rotativa estática + frase secundária estática.
// ============================================================

import { useEffect, useRef, useState } from "react";

interface FontDef { f: string; w: number }

// Pool genérico de fontes — aplicável a qualquer letra
const GENERIC_POOL: FontDef[] = [
  { f: "'IBM Plex Mono', monospace",   w: 700 },
  { f: "'Bodoni Moda', serif",         w: 900 },
  { f: "'Gloock', serif",              w: 400 },
  { f: "'Cormorant Garamond', serif",  w: 700 },
  { f: "'Fraunces', serif",            w: 900 },
  { f: "'Playfair Display', serif",    w: 900 },
  { f: "'DM Mono', monospace",         w: 700 },
];

const MORPH_IDS = ["loading-morph-0","loading-morph-1","loading-morph-2","loading-morph-3","loading-morph-4","loading-morph-5","loading-morph-6", null];
const STEP_MS = 28;
const LETTER_RHYTHM_MIN = 700;
const LETTER_RHYTHM_MAX = 1400;

// Frases que rotacionam (estáticas, sem morph) — Reed em modo escuta
const STATIC_PHRASES = [
  "reed está lendo o que você disse.",
  "reed está com você.",
  "isso leva alguns segundos.",
  "respira.",
];

// Palavras-chave que morpham (substituem-se entre si a cada ~3s)
const MORPH_WORDS = ["ouvindo", "lendo", "escutando", "respondendo"];
const WORD_ROTATE_MS = 2800;

interface EcoLoadingScreenProps {
  /** Mensagem extra opcional (default: rotaciona STATIC_PHRASES) */
  staticOverride?: string;
}

export function EcoLoadingScreen({ staticOverride }: EcoLoadingScreenProps) {
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const fontStateRef = useRef<number[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stoppedRef = useRef(false);

  const [wordIdx, setWordIdx] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);

  const currentWord = MORPH_WORDS[wordIdx];

  // Rotação da palavra-chave
  useEffect(() => {
    const t = setInterval(() => {
      setWordIdx(i => (i + 1) % MORPH_WORDS.length);
    }, WORD_ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  // Rotação da frase secundária (mais lenta)
  useEffect(() => {
    if (staticOverride) return;
    const t = setInterval(() => {
      setPhraseIdx(i => (i + 1) % STATIC_PHRASES.length);
    }, WORD_ROTATE_MS * 1.7);
    return () => clearInterval(t);
  }, [staticOverride]);

  // Animação morph nas letras da palavra ATUAL
  useEffect(() => {
    stoppedRef.current = false;
    fontStateRef.current = currentWord.split("").map(() => 0);
    lettersRef.current = lettersRef.current.slice(0, currentWord.length);

    function applyFont(idx: number, fd: FontDef) {
      const el = lettersRef.current[idx];
      if (!el) return;
      el.style.fontFamily = fd.f;
      el.style.fontWeight = String(fd.w);
    }

    function morphLetter(idx: number) {
      const el = lettersRef.current[idx];
      if (!el || stoppedRef.current) return;
      let nextIdx: number;
      do { nextIdx = Math.floor(Math.random() * GENERIC_POOL.length); }
      while (nextIdx === fontStateRef.current[idx]);

      let step = 0;
      function runStep() {
        if (stoppedRef.current || !el) return;
        const filterId = MORPH_IDS[step];
        if (filterId === null) {
          el.style.filter = "none";
          return;
        }
        el.style.filter = `url(#${filterId})`;
        if (step === Math.floor(MORPH_IDS.length / 2)) {
          fontStateRef.current[idx] = nextIdx;
          applyFont(idx, GENERIC_POOL[nextIdx]);
        }
        step++;
        const t = setTimeout(runStep, STEP_MS);
        timeoutsRef.current.push(t);
      }
      runStep();
    }

    function scheduleMorph(idx: number) {
      if (stoppedRef.current) return;
      const delay = LETTER_RHYTHM_MIN + Math.random() * (LETTER_RHYTHM_MAX - LETTER_RHYTHM_MIN);
      const t = setTimeout(() => {
        if (stoppedRef.current) return;
        morphLetter(idx);
        scheduleMorph(idx);
      }, delay);
      timeoutsRef.current.push(t);
    }

    // Aplicar fonte inicial
    currentWord.split("").forEach((_, i) => applyFont(i, GENERIC_POOL[0]));

    // Stagger início (cada letra começa em momento diferente)
    currentWord.split("").forEach((_, i) => {
      const t = setTimeout(() => scheduleMorph(i), i * 100);
      timeoutsRef.current.push(t);
    });

    return () => {
      stoppedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [currentWord]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--r-bg)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        animation: "loading-fade-in 400ms ease-out",
      }}
    >
      {/* Inline keyframes pro fade-in */}
      <style>{`
        @keyframes loading-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes loading-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>

      {/* SVG filters — copiados do Splash com IDs únicos pra evitar colisão */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="loading-morph-0" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="18"/>
            <feMorphology operator="erode" radius="16"/>
          </filter>
          <filter id="loading-morph-1" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="12"/>
            <feMorphology operator="erode" radius="10"/>
          </filter>
          <filter id="loading-morph-2" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="7"/>
            <feMorphology operator="erode" radius="5"/>
          </filter>
          <filter id="loading-morph-3" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="4"/>
            <feMorphology operator="erode" radius="3"/>
          </filter>
          <filter id="loading-morph-4" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="2"/>
            <feMorphology operator="erode" radius="2"/>
          </filter>
          <filter id="loading-morph-5" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="1"/>
          </filter>
          <filter id="loading-morph-6" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      {/* Pulse central (acima da palavra) */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--r-voice-founders, var(--r-telha, #b85a3e))",
          animation: "loading-pulse 1.6s ease-in-out infinite",
        }}
      />

      {/* Palavra-chave com morph (a cada letra troca de fonte) */}
      <div
        style={{
          display: "flex",
          gap: 0,
          fontSize: "clamp(40px, 7vw, 72px)",
          color: "var(--r-text)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          minHeight: "clamp(40px, 7vw, 72px)",
        }}
        key={currentWord}
      >
        {currentWord.split("").map((char, i) => (
          <span
            key={`${currentWord}-${i}`}
            ref={el => { lettersRef.current[i] = el; }}
            style={{ display: "inline-block" }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* Frase secundária (rotaciona se sem override) */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 13,
          color: "var(--r-ghost, var(--r-dim))",
          letterSpacing: "0.04em",
          fontWeight: 300,
          textAlign: "center",
          maxWidth: 360,
          padding: "0 24px",
          opacity: 0.7,
          transition: "opacity 600ms ease",
        }}
      >
        {staticOverride ?? STATIC_PHRASES[phraseIdx]}
      </div>
    </div>
  );
}
