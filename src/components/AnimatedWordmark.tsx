// src/components/AnimatedWordmark.tsx
// ============================================================
// Wordmark rdwth com morph SVG (mesma lógica do Splash).
// Reusável em qualquer página onde queremos a marca animada.
// ============================================================

import { useEffect, useRef } from "react";

type LetterKey = "r" | "d" | "w" | "t" | "h";
interface FontDef { f: string; w: number; sz?: number }

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@700" +
  "&family=Bodoni+Moda:opsz,wght@6..96,900" +
  "&family=Press+Start+2P" +
  "&family=Saira+Condensed:wght@900" +
  "&family=Gloock" +
  "&family=Rozha+One" +
  "&family=Cormorant+Garamond:wght@700" +
  "&family=Teko:wght@700" +
  "&family=DM+Mono:wght@700" +
  "&family=Abril+Fatface" +
  "&family=Graduate" +
  "&family=Alfa+Slab+One" +
  "&family=Big+Shoulders+Display:wght@900" +
  "&family=Literata:opsz,wght@7..72,900" +
  "&family=Epilogue:wght@900" +
  "&family=Space+Mono:wght@700" +
  "&family=Playfair+Display:wght@900" +
  "&family=Fraunces:opsz,wght@9..144,900" +
  "&family=Barlow:wght@700" +
  "&display=swap";

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

const LETTER_RHYTHM: Record<LetterKey, number> = { r: 600, d: 1100, w: 850, t: 1400, h: 700 };
const START_OFFSETS: Record<LetterKey, number> = { r: 0, d: 300, w: 150, t: 500, h: 80 };
const MORPH_IDS = ["aw-morph-0","aw-morph-1","aw-morph-2","aw-morph-3","aw-morph-4","aw-morph-5","aw-morph-6", null];
const STEP_MS = 28;

interface AnimatedWordmarkProps {
  /** Tamanho base. Ex: 'clamp(40px, 8vw, 80px)' (default) */
  fontSize?: string;
}

export function AnimatedWordmark({ fontSize }: AnimatedWordmarkProps) {
  const lettersRef = useRef<Partial<Record<LetterKey, HTMLSpanElement | null>>>({});
  const stateRef = useRef<Record<LetterKey, number>>({ r: 0, d: 0, w: 0, t: 0, h: 0 });
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stoppedRef = useRef(false);

  const baseFontSize = fontSize ?? "clamp(40px, 8vw, 80px)";

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
        el.style.fontSize = `calc(${baseFontSize} * ${fd.sz})`;
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
  }, [baseFontSize]);

  return (
    <>
      {/* SVG filters */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="aw-morph-0" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
            <feMorphology operator="dilate" radius="18"/><feMorphology operator="erode" radius="16"/>
          </filter>
          <filter id="aw-morph-1" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
            <feMorphology operator="dilate" radius="12"/><feMorphology operator="erode" radius="10"/>
          </filter>
          <filter id="aw-morph-2" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
            <feMorphology operator="dilate" radius="7"/><feMorphology operator="erode" radius="5"/>
          </filter>
          <filter id="aw-morph-3" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
            <feMorphology operator="dilate" radius="4"/><feMorphology operator="erode" radius="3"/>
          </filter>
          <filter id="aw-morph-4" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
            <feMorphology operator="dilate" radius="2"/><feMorphology operator="erode" radius="2"/>
          </filter>
          <filter id="aw-morph-5" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
            <feMorphology operator="dilate" radius="1"/>
          </filter>
          <filter id="aw-morph-6" x="0%" y="0%" width="100%" height="100%">
            <feComponentTransfer><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 0, lineHeight: 1, justifyContent: "center" }}>
        {(["r","d","w","t","h"] as LetterKey[]).map(letter => (
          <span
            key={letter}
            ref={el => { lettersRef.current[letter] = el; }}
            style={{
              display: "inline-block",
              fontSize: baseFontSize,
              color: "var(--r-text)",
              lineHeight: 1,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </>
  );
}
