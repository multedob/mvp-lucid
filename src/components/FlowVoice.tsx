// src/components/FlowVoice.tsx
// Voz do sistema durante uma transição flowTo() — overlay absoluto sobre o canvas.
//
// 3 falas empilhadas (cobre loadings de duração variável):
//   1. diablo1 (typewriter)
//   2. diablo2 (typewriter, ~1800ms depois)
//   3. hint    (typewriter, ~3600ms depois)
//
// Após hint completa, hold ~1500ms e fade-out. Total ~7000ms.
// Conteúdo principal da página alvo entra ~3000ms (durante diablo2) — coexiste,
// depois voz some, conteúdo permanece. Espaço reservado no topo do canvas
// (~110px) pelas páginas alvo evita que conteúdo se mova quando voz desaparece.

import { useEffect, useState } from "react";
import { useFlow } from "@/hooks/useFlow";
import SystemTerminalLine from "./SystemTerminalLine";

const LINE_DELAY_MS = 1800;        // intervalo entre starts de cada linha
const HOLD_AFTER_HINT_MS = 1500;   // tempo que hint fica parada após typewriter completar
const TYPE_BUFFER_MS = 1500;       // estimativa do typewriter da hint
const FADE_OUT_MS = 400;
const TOTAL_BEFORE_FADE = LINE_DELAY_MS * 2 + TYPE_BUFFER_MS + HOLD_AFTER_HINT_MS;
// = 1800 + 1800 + 1500 + 1500 = 6600ms

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
