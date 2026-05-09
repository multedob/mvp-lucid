// src/components/FlowVoice.tsx
// Voz do sistema durante uma transição flowTo() — overlay absoluto sobre o canvas.
//
// SEQUÊNCIA — sistema fala TUDO antes do conteúdo entrar:
//   t=0      → diablo1 typewriter
//   t=1800   → diablo2 typewriter
//   t=3600   → hint typewriter
//   t=5100   → hint completa (sistema PARA de falar)
//   t=5300   → conteúdo principal da página entra (fade-in)
//   t=6500   → sistema começa fade-out (~1.2s depois do conteúdo aparecer)
//   t=6900   → sistema sumiu, conteúdo permanece
//
// Páginas alvo importam FLOW_CONTENT_DELAY_MS pra sincronizar o cascade do
// conteúdo principal com o fim da voz.

import { useEffect, useState } from "react";
import { useFlow } from "@/hooks/useFlow";
import SystemTerminalLine from "./SystemTerminalLine";

const LINE_DELAY_MS = 1800;        // intervalo entre starts de cada linha
const TYPE_BUFFER_MS = 1500;       // estimativa do typewriter da hint
const HINT_COMPLETE_AT = LINE_DELAY_MS * 2 + TYPE_BUFFER_MS; // 5100ms
const CONTENT_AFTER_HINT_MS = 200; // gap entre hint completar e conteúdo entrar
const HOLD_AFTER_CONTENT_MS = 1200; // sistema permanece visível com conteúdo já entrando
const FADE_OUT_MS = 400;
const TOTAL_BEFORE_FADE = HINT_COMPLETE_AT + CONTENT_AFTER_HINT_MS + HOLD_AFTER_CONTENT_MS;
// = 5100 + 200 + 1200 = 6500ms

/** Quanto tempo após o início do flow o conteúdo principal deve entrar.
 *  Páginas alvo importam isso pra sincronizar o cascade. */
export const FLOW_CONTENT_DELAY_MS = HINT_COMPLETE_AT + CONTENT_AFTER_HINT_MS; // 5300ms

export default function FlowVoice() {
  const { flow, clearFlow } = useFlow();
  const [shownCount, setShownCount] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!flow) {
      setShownCount(0);
      setFadingOut(false);
      return;
    }

    setShownCount(1);
    setFadingOut(false);

    const t1 = window.setTimeout(() => setShownCount(2), LINE_DELAY_MS);
    const t2 = window.setTimeout(() => setShownCount(3), LINE_DELAY_MS * 2);
    const tFade = window.setTimeout(() => setFadingOut(true), TOTAL_BEFORE_FADE);
    const tClear = window.setTimeout(() => clearFlow(), TOTAL_BEFORE_FADE + FADE_OUT_MS);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(tFade);
      window.clearTimeout(tClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  if (!flow) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "10px 24px 0",
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {shownCount >= 1 && <SystemTerminalLine text={flow.diablo1} />}
      {shownCount >= 2 && <SystemTerminalLine text={flow.diablo2} />}
      {shownCount >= 3 && <SystemTerminalLine text={flow.hint} />}
    </div>
  );
}
