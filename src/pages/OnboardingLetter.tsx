// src/pages/OnboardingLetter.tsx
// Exibida uma única vez após consentimento.
// Persiste flag em localStorage: "rdwth_letter_seen"
// Após "Begin" → /onboarding (coleta de nome)

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

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

export default function OnboardingLetter() {
  const navigate = useNavigate();
  const lettersRef = useRef<Partial<Record<LetterKey, HTMLSpanElement | null>>>({});
  const stateRef   = useRef<Record<LetterKey, number>>({ r: 0, d: 0, w: 0, t: 0, h: 0 });
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stoppedRef  = useRef(false);

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
      if (!el || stoppedRef.current) return;
      const pool = FONT_POOLS[letter];
      let nextIdx: number;
      do { nextIdx = Math.floor(Math.random() * pool.length); }
      while (nextIdx === stateRef.current[letter]);

      let step = 0;
      function runStep() {
        if (stoppedRef.current || !el) return;
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
  }, []);

  const handleBegin = () => {
    localStorage.setItem("rdwth_letter_seen", "1");
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
        <span className="r-header-label">rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Body — scrollável */}
      <div
        className="r-scroll"
        style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: 0 }}
      >

        {/* Wordmark animado + tagline */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            lineHeight: 1,
            marginBottom: 6,
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              fontSize: BASE_SIZE,
              color: "var(--r-text)",
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}></span>
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
              color: "var(--r-accent)",
              letterSpacing: "0.14em",
              opacity: 0.7,
            }}
          >
            read with
          </div>
        </div>

        {/* Manifesto */}
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 11,
            lineHeight: 1.9,
            color: "var(--r-dim)",
            letterSpacing: "0.03em",
          }}
        >
          Tornamos padrões visíveis.<br />
          Tornamos a complexidade legível.
          <br /><br />
          Por trás de cada escolha, conflito, impulso ou repetição,<br />
          existe uma estrutura em ação.
          <br /><br />
          rdwth foi criado para tornar essa estrutura legível —<br />
          sem reduzir uma pessoa a um tipo,<br />
          transformar diferença em hierarquia,<br />
          ou confundir padrão com identidade.
          <br /><br />
          Não oferecemos respostas prontas.<br />
          Oferecemos leitura.
          <br /><br />
          The kind of reading that brings tensions into focus,<br />
          organizes complexity,<br />
          and returns something rare:
          <br /><br />
          a clearer view of what is shaping<br />
          someone's experience,<br />
          while keeping responsibility in their hands.
          <br /><br />
          No diagnosis.<br />
          No prescription.<br />
          No fixed conclusions.
          <br /><br />
          Just one simple and radical proposition:
        </div>

        {/* Proposição — destaque */}
        <div
          style={{
            fontFamily: "var(--r-font-ed)",
            fontWeight: 800,
            fontSize: 16,
            lineHeight: 1.7,
            color: "var(--r-text)",
            letterSpacing: "0.01em",
            marginTop: 20,
            marginBottom: 32,
          }}
        >
          see more precisely<br />
          what is already there.
        </div>

      </div>

      {/* Footer — Begin */}
      <div className="r-line" />
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          flexShrink: 0,
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
              background: "var(--r-accent)",
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
            Begin
          </span>
        </div>
      </div>

    </div>
  );
}
