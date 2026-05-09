// src/components/FlowVoice.tsx
// Voz do sistema durante uma transição flowTo() — overlay absoluto sobre o canvas.
//
// Sequência (do mount):
//   t=0           → hint typewriter começa (no overlay sobre o topo do canvas)
//   t=~1500       → typewriter completa
//   t=~3000       → fade-out 400ms começa
//   t=~3400       → clearFlow + setFlow=null
//
// O overlay é ABSOLUTO — não empurra layout. Página alvo entra com cascade
// próprio (delay ~2000ms) e ambos coexistem brevemente, dando ilusão de continuidade.

import { useEffect, useState } from "react";
import { useFlow } from "@/hooks/useFlow";
import SystemTerminalLine from "./SystemTerminalLine";

const HOLD_AFTER_TYPE_MS = 1500; // tempo que hint fica parada após typewriter
const TYPE_BUFFER_MS = 1500;     // estimativa do tempo de typewriter (50 chars × 30ms)
const FADE_OUT_MS = 400;
const TOTAL_BEFORE_FADE = TYPE_BUFFER_MS + HOLD_AFTER_TYPE_MS; // 3000ms

export default function FlowVoice() {
  const { flow, clearFlow } = useFlow();
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!flow) {
      setFadingOut(false);
      return;
    }

    setFadingOut(false);

    const tFade = window.setTimeout(() => setFadingOut(true), TOTAL_BEFORE_FADE);
    const tClear = window.setTimeout(() => clearFlow(), TOTAL_BEFORE_FADE + FADE_OUT_MS);

    return () => {
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
        pointerEvents: "none", // não bloqueia clicks no conteúdo abaixo
        zIndex: 5,
      }}
    >
      <SystemTerminalLine text={flow.hint} />
    </div>
  );
}
