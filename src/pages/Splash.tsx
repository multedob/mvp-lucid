// src/pages/Splash.tsx
// Tela de abertura — animação rdwth com morphing de fontes (Barlow + IBM Plex Mono)
// Sessão ativa: skip imediato. Sem sessão: 2.5s, depois /auth. Clique antecipa.

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

type LetterKey = "r" | "d" | "w" | "t" | "h";
interface FontDef { f: string; w: number; sz?: number }

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;700;800" +
  "&family=IBM+Plex+Mono:wght@300;400;700" +
  "&display=swap";

const FONT_POOLS: Record<LetterKey, FontDef[]> = {
  r: [
    { f: "'IBM Plex Mono', monospace", w: 700 },
    { f: "'Barlow', sans-serif",       w: 800 },
    { f: "'IBM Plex Mono', monospace", w: 300 },
    { f: "'Barlow', sans-serif",       w: 400 },
  ],
  d: [
    { f: "'Barlow', sans-serif",       w: 800 },
    { f: "'IBM Plex Mono', monospace", w: 700 },
    { f: "'Barlow', sans-serif",       w: 300 },
    { f: "'IBM Plex Mono', monospace", w: 400 },
  ],
  w: [
    { f: "'IBM Plex Mono', monospace", w: 700 },
    { f: "'Barlow', sans-serif",       w: 800 },
    { f: "'IBM Plex Mono', monospace", w: 400 },
    { f: "'Barlow', sans-serif",       w: 700 },
  ],
  t: [
    { f: "'Barlow', sans-serif",       w: 800 },
    { f: "'IBM Plex Mono', monospace", w: 700 },
    { f: "'Barlow', sans-serif",       w: 400 },
    { f: "'IBM Plex Mono', monospace", w: 300 },
  ],
  h: [
    { f: "'IBM Plex Mono', monospace", w: 700 },
    { f: "'Barlow', sans-serif",       w: 800 },
    { f: "'IBM Plex Mono', monospace", w: 400 },
    { f: "'Barlow', sans-serif",       w: 300 },
  ],
};

const LETTER_RHYTHM: Record<LetterKey, number> = { r: 600, d: 1100, w: 850, t: 1400, h: 700 };
const START_OFFSETS: Record<LetterKey, number> = { r: 0, d: 300, w: 150, t: 500, h: 80 };
const MORPH_IDS = ["morph-0","morph-1","morph-2","morph-3","morph-4","morph-5","morph-6",null];
const STEP_MS = 28;

export default function Splash() {
  const navigate = useNavigate();
  const lettersRef = useRef<Partial<Record<LetterKey, HTMLSpanElement | null>>>({});
  const stateRef = useRef<Record<LetterKey, number>>({ r: 0, d: 0, w: 0, t: 0, h: 0 });
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stoppedRef = useRef(false);

  // ── Injetar Google Fonts uma vez ─────────────────────────────────
  useEffect(() => {
    if (!document.querySelector(`link[href*="Bodoni+Moda"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  // ── Timer de auto-avanço ─────────────────────────────────────────
  // Sessão ativa: skip splash imediato (vai pro RootRedirect que decide)
  // Sem sessão: mostra splash por 2.5s, depois /auth
  useEffect(() => {
    const SPLASH_MS = 2500;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session) {
        navigate("/", { replace: true });
        return;
      }

      timeoutId = setTimeout(() => {
        if (!cancelled) navigate("/auth", { replace: true });
      }, SPLASH_MS);
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate]);

  // ── Animação de morphing ─────────────────────────────────────────
  useEffect(() => {
    stoppedRef.current = false;

    function applyFont(letter: LetterKey, fd: FontDef) {
      const el = lettersRef.current[letter];
      if (!el) return;
      el.style.fontFamily = fd.f;
      el.style.fontWeight = String(fd.w);
      if (fd.sz) {
        el.style.fontSize = `calc(clamp(52px, 9.5vw, 112px) * ${fd.sz})`;
        el.style.paddingBottom = "0.06em";
      } else {
        el.style.fontSize = "";
        el.style.paddingBottom = "";
      }
    }

    function morphLetter(letter: LetterKey) {
      const el = lettersRef.current[letter];
      if (!el || stoppedRef.current) return;
      const pool = FONT_POOLS[letter];
      let nextIdx: number;
      do { nextIdx = Math.floor(Math.random() * pool.length); }
      while (nextIdx === stateRef.current[letter]);

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
      if (stoppedRef.current) return;
      const base = LETTER_RHYTHM[letter];
      const delay = base + Math.random() * base;
      const t = setTimeout(() => {
        if (stoppedRef.current) return;
        morphLetter(letter);
        scheduleMorph(letter);
      }, delay);
      timeoutsRef.current.push(t);
    }

    // Aplicar fontes iniciais
    (Object.keys(FONT_POOLS) as LetterKey[]).forEach(letter => {
      applyFont(letter, FONT_POOLS[letter][0]);
    });

    // Stagger de início
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

  const handleClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    navigate(session ? "/" : "/auth", { replace: true });
  };

  return (
    <div
      onClick={handleClick}
      className="r-screen"
      style={{ cursor: "pointer" }}
    >
      {/* SVG filters — morphing pixelado coarse→fine */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="morph-0" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="18"/>
            <feMorphology operator="erode" radius="16"/>
          </filter>
          <filter id="morph-1" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="12"/>
            <feMorphology operator="erode" radius="10"/>
          </filter>
          <filter id="morph-2" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="7"/>
            <feMorphology operator="erode" radius="5"/>
          </filter>
          <filter id="morph-3" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="4"/>
            <feMorphology operator="erode" radius="3"/>
          </filter>
          <filter id="morph-4" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="2"/>
            <feMorphology operator="erode" radius="2"/>
          </filter>
          <filter id="morph-5" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="1"/>
          </filter>
          <filter id="morph-6" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 1"/>
              <feFuncG type="discrete" tableValues="0 1"/>
              <feFuncB type="discrete" tableValues="0 1"/>
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      {/* data no topo direito */}
      <div style={{
        padding: "18px 24px 16px",
        display: "flex",
        justifyContent: "flex-end",
        flexShrink: 0,
      }}>
        <span className="r-header-date">{getToday()}</span>
      </div>

      {/* linha superior */}
      <div className="r-line" style={{ opacity: 0.2 }} />

      {/* espaço vazio */}
      <div style={{ flex: 1 }} />

      {/* wordmark animado — ancorado no rodapé */}
      <div style={{ padding: "20px 24px 20px", flexShrink: 0 }}>
        {/* Letras rdwth — fontSizeAdjust no pai normaliza altura visual entre fontes */}
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 0,
          lineHeight: 1,
          marginBottom: 10,
          fontSize: "clamp(52px, 9.5vw, 112px)",
          fontSizeAdjust: 0.5,
        }}>
          {(["r","d","w","t","h"] as LetterKey[]).map(letter => (
            <span
              key={letter}
              ref={el => { lettersRef.current[letter] = el; }}
              style={{
                display: "inline-block",
                color: "var(--r-text)",
                lineHeight: 1,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* tagline */}
        <div style={{
          fontFamily: "'Barlow', 'IBM Plex Mono', sans-serif",
          fontWeight: 700,
          fontSize: 11,
          color: "var(--r-accent)",
          letterSpacing: "0.06em",
          lineHeight: 1.8,
        }}>
          read with
        </div>
      </div>

      {/* linha inferior */}
      <div className="r-line" style={{ opacity: 0.2 }} />

      {/* safe area */}
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
