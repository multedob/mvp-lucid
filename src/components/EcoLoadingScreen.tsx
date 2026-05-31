// ============================================================
// EcoLoadingScreen (Wave 13 — voz sistema padrão Warmup)
// Tela de loading entre M4 → M5 enquanto ipe-eco gera o eco.
// 3 linhas voz sistema com typewriter sequencial, mesmo padrão
// do Warmup. Respeita margens do AppShell (não é fullscreen).
// ============================================================

import { useEffect, useRef, useState } from "react";

interface EcoLoadingScreenProps {
  // Mantido pra backward compat com callers antigos. Não usado nesta versão.
  staticOverride?: string;
}

const SYSTEM_LINES = [
  "respira.",
  "isso leva alguns segundos.",
  "reed lê suas respostas.",
  "depois, você pode conversar com ele.",
] as const;

const CHAR_DELAY_MS = 38;
const LINE_PAUSE_MS = 250; // pausa entre linhas (depois de uma terminar, antes da próxima)

// Typewriter inline — texto aparece L→R, char por char.
// Idempotente: se já animou esse mesmo texto, não re-anima.
function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  const animatedTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (animatedTextRef.current === text) return;
    animatedTextRef.current = text;
    setShown("");
    let i = 0;
    const interval = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(interval);
    }, CHAR_DELAY_MS);
    return () => window.clearInterval(interval);
  }, [text]);

  return (
    <>
      {shown}
      <span style={{ opacity: shown.length < text.length ? 0.5 : 0 }}>▌</span>
    </>
  );
}

export function EcoLoadingScreen(_: EcoLoadingScreenProps = {}) {
  // Cascata sequencial — linha 2 só aparece depois de linha 1 terminar
  const [visibleLineIdx, setVisibleLineIdx] = useState(0);

  useEffect(() => {
    if (visibleLineIdx >= SYSTEM_LINES.length - 1) return;
    const currentLine = SYSTEM_LINES[visibleLineIdx];
    const renderTime = currentLine.length * CHAR_DELAY_MS + LINE_PAUSE_MS;
    const t = window.setTimeout(() => {
      setVisibleLineIdx((idx) => Math.min(idx + 1, SYSTEM_LINES.length - 1));
    }, renderTime);
    return () => window.clearTimeout(t);
  }, [visibleLineIdx]);

  return (
    <div
      style={{
        padding: "24px 24px 64px",
        fontFamily: "var(--r-font-sys)",
        fontWeight: 300,
        fontSize: 11,
        lineHeight: 1.7,
        letterSpacing: "0.04em",
        color: "var(--r-voice-sys)",
        textAlign: "left",
        whiteSpace: "pre-wrap",
      }}
    >
      {SYSTEM_LINES.map((line, idx) => {
        if (idx > visibleLineIdx) return null;
        return (
          <div key={idx} style={{ marginBottom: idx < SYSTEM_LINES.length - 1 ? 6 : 0 }}>
            <span aria-hidden="true">{"> "}</span>
            <Typewriter text={line} />
          </div>
        );
      })}
    </div>
  );
}
