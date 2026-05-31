// src/pages/Entrada.tsx
// Tela intermediária entre /alpha e /auth.
// Réplica visual fiel do Splash (mesmas font pools Barlow + IBM Plex Mono,
// mesmos filtros de morph, mesma tagline "read with").
// Sempre auto-avança pra /auth em ~2.5s. Clique antecipa.

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
const MORPH_IDS = ["e-morph-0","e-morph-1","e-morph-2","e-morph-3","e-morph-4","e-morph-5","e-morph-6",null];
const STEP_MS = 28;

export default function Entrada() {
  const navigate = useNavigate();
  const lettersRef = useRef<Partial<Record<LetterKey, HTMLSpanElement | null>>>({});
  const stateRef = useRef<Record<LetterKey, number>>({ r: 0, d: 0, w: 0, t: 0, h: 0 });
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!document.querySelector(`link[href*="Barlow"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => navigate("/auth", { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [navigate]);

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
        const tt = setTimeout(runStep, STEP_MS);
        timeoutsRef.current.push(tt);
      }
      runStep();
    }

    function scheduleMorph(letter: LetterKey) {
      if (stoppedRef.current) return;
      const base = LETTER_RHYTHM[letter];
      const delay = base + Math.random() * base;
      const tt = setTimeout(() => {
        if (stoppedRef.current) return;
        morphLetter(letter);
        scheduleMorph(letter);
      }, delay);
      timeoutsRef.current.push(tt);
    }

    (Object.keys(FONT_POOLS) as LetterKey[]).forEach(letter => {
      applyFont(letter, FONT_POOLS[letter][0]);
    });

    (Object.keys(START_OFFSETS) as LetterKey[]).forEach(letter => {
      const tt = setTimeout(() => scheduleMorph(letter), START_OFFSETS[letter]);
      timeoutsRef.current.push(tt);
    });

    return () => {
      stoppedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  return (
    <div
      onClick={() => navigate("/auth", { replace: true })}
      className="r-screen"
      style={{ cursor: "pointer" }}
    >
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          {[18,12,7,4,2,1,0].map((d, i) => (
            <filter key={i} id={`e-morph-${i}`} x="0%" y="0%" width="100%" height="100%">
              <feComponentTransfer>
                <feFuncR type="discrete" tableValues="0 1"/>
                <feFuncG type="discrete" tableValues="0 1"/>
                <feFuncB type="discrete" tableValues="0 1"/>
              </feComponentTransfer>
              {d > 0 && <feMorphology operator="dilate" radius={d}/>}
              {d > 1 && <feMorphology operator="erode" radius={Math.max(1, d - 2)}/>}
            </filter>
          ))}
        </defs>
      </svg>

      <div style={{ padding: "18px 24px 16px", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <span className="r-header-date">{getToday()}</span>
      </div>

      <div className="r-line" style={{ opacity: 0.2 }} />

      <div style={{ flex: 1 }} />

      <div style={{ padding: "20px 24px 20px", flexShrink: 0 }}>
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 0,
          lineHeight: 1,
          marginBottom: 10,
          fontSize: "clamp(52px, 9.5vw, 112px)",
        }}>
          {(["r","d","w","t","h"] as LetterKey[]).map(letter => (
            <span
              key={letter}
              ref={el => { lettersRef.current[letter] = el; }}
              style={{ display: "inline-block", color: "var(--r-text)", lineHeight: 1 }}
            >
              {letter}
            </span>
          ))}
        </div>

        <div style={{
          fontFamily: "'Barlow', 'IBM Plex Mono', sans-serif",
          fontWeight: 700,
          fontSize: 11,
          color: "var(--r-telha)",
          letterSpacing: "0.06em",
          lineHeight: 1.8,
        }}>
          read with
        </div>
      </div>

      <div className="r-line" style={{ opacity: 0.2 }} />

      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
