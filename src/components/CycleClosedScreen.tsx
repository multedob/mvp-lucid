// ============================================================
// CycleClosedScreen
// Tela curta de transição entre o último envio do questionário
// e a leitura profunda (Reed). Mesma estética do EcoLoadingScreen:
// duas linhas voz do sistema com typewriter sequencial + botão "ler".
//
// Props:
//  - ready: quando true, mostra botão "ler" (lucid-engine terminou).
//           Enquanto false, mantém só a primeira linha (silêncio enquanto processa).
//  - onContinue: handler do botão "ler".
// ============================================================

import { useEffect, useRef, useState } from "react";

const LINE_1 = "ciclo fechado.";
const LINE_2 = "leia sua leitura profunda.";

const CHAR_DELAY_MS = 38;
const LINE_PAUSE_MS = 350;

function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const [shown, setShown] = useState("");
  const animatedTextRef = useRef<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (animatedTextRef.current === text) return;
    animatedTextRef.current = text;
    doneRef.current = false;
    setShown("");
    let i = 0;
    const interval = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(interval);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, CHAR_DELAY_MS);
    return () => window.clearInterval(interval);
  }, [text, onDone]);

  return (
    <>
      {shown}
      <span style={{ opacity: shown.length < text.length ? 0.5 : 0 }}>▌</span>
    </>
  );
}

interface CycleClosedScreenProps {
  ready: boolean;
  onContinue: () => void;
}

export function CycleClosedScreen({ ready, onContinue }: CycleClosedScreenProps) {
  // Cascata: linha 1 → linha 2 → (quando ready) botão "ler"
  const [line2Visible, setLine2Visible] = useState(false);
  const [line2Done, setLine2Done] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);

  useEffect(() => {
    if (!line2Done) return;
    if (!ready) return;
    // Fade-in suave do botão depois que a 2ª linha terminou e o engine terminou.
    const t = window.setTimeout(() => setButtonVisible(true), 250);
    return () => window.clearTimeout(t);
  }, [line2Done, ready]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "24px 24px 64px",
      }}
    >
      <div
        style={{
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
        <div style={{ marginBottom: 6 }}>
          <span aria-hidden="true">{"> "}</span>
          <Typewriter
            text={LINE_1}
            onDone={() => {
              window.setTimeout(() => setLine2Visible(true), LINE_PAUSE_MS);
            }}
          />
        </div>
        {line2Visible && (
          <div>
            <span aria-hidden="true">{"> "}</span>
            <Typewriter text={LINE_2} onDone={() => setLine2Done(true)} />
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          opacity: buttonVisible ? 1 : 0,
          transition: "opacity 500ms ease-in",
          paddingTop: 32,
        }}
      >
        <span
          className="r-footer-action"
          onClick={buttonVisible ? onContinue : undefined}
          style={{ cursor: buttonVisible ? "pointer" : "default" }}
        >
          ler
        </span>
      </div>
    </div>
  );
}

export default CycleClosedScreen;
