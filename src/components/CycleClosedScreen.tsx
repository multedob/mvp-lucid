// ============================================================
// CycleClosedScreen
// Tela curta de transição entre o último envio do questionário
// e a leitura profunda (Context). Mesma estética do EcoLoadingScreen.
//
// Fix UX 06/jun:
//  - Botão "ler" removido (era visualmente solto no canto direito).
//  - Sinal de "tem leitura pra ler" agora vem pelo pulse do botão
//    "leitura" no NavBottom (controlado por localStorage flag).
//  - Quando esta tela monta com ready=true, seta a flag.
//  - Context.tsx (ao montar) limpa a flag.
//
// Props:
//  - ready: quando true, lucid-engine terminou; seta flag de unread.
//  - onContinue: mantido pra back-compat (não usado mais — pulse guia o user).
// ============================================================

import { useEffect, useRef, useState } from "react";
import { markReadingUnread } from "@/lib/unreadReading";

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
  /** @deprecated Mantido pra back-compat. Não usado mais — pulse no NavBottom guia o user. */
  onContinue?: () => void;
}

export function CycleClosedScreen({ ready }: CycleClosedScreenProps) {
  const [line2Visible, setLine2Visible] = useState(false);

  // Fix UX 06/jun — quando o engine termina (ready=true), seta flag de unread.
  // O sinal de "tem leitura nova" agora é o pulse do botão "leitura" no menu.
  useEffect(() => {
    if (ready) markReadingUnread();
  }, [ready]);

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
            <Typewriter text={LINE_2} />
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />
    </div>
  );
}

export default CycleClosedScreen;
