// src/components/FlowVoice.tsx
// Voz do sistema durante uma transição flowTo() — vive dentro do AppShell.
//
// Sequência:
//   t=0    → diablo1 entra (typewriter)
//   t=2500 → diablo2 entra
//   t=5000 → hint entra (e neste momento navega pra path com state.fromFlow=true)
//   t=8000 → fade-out (300ms) → clearFlow + setFlow=null
//
// As 3 linhas vivem na MESMA posição que a saudação da Home, então quando a
// Home faz fade-out da saudação durante o flow, a voz do flow entra na mesma altura.
// O conteúdo da página alvo entra ABAIXO via outlet (mantém a posição da voz).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFlow } from "@/hooks/useFlow";
import SystemTerminalLine from "./SystemTerminalLine";

const LINE_DELAY_MS = 2500;
const NAVIGATE_DELAY_MS = 5000; // após hint começar a digitar
const HOLD_AFTER_NAVIGATE_MS = 1800; // hint + conteúdo coexistem brevemente
const FADE_OUT_MS = 400;

export default function FlowVoice() {
  const { flow, clearFlow } = useFlow();
  const navigate = useNavigate();
  const [shownCount, setShownCount] = useState(0); // 0..3 (diablo1, diablo2, hint)
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

    // Navega quando o hint começar — conteúdo da página alvo já entra abaixo da voz
    const tNav = window.setTimeout(() => {
      navigate(flow.path, { state: { fromFlow: true }, replace: false });
    }, NAVIGATE_DELAY_MS);

    // Após hold, fade-out e limpa flow
    const tFade = window.setTimeout(
      () => setFadingOut(true),
      NAVIGATE_DELAY_MS + HOLD_AFTER_NAVIGATE_MS
    );
    const tClear = window.setTimeout(
      () => clearFlow(),
      NAVIGATE_DELAY_MS + HOLD_AFTER_NAVIGATE_MS + FADE_OUT_MS
    );

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(tNav);
      window.clearTimeout(tFade);
      window.clearTimeout(tClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  if (!flow) return null;

  return (
    <div
      style={{
        padding: "12px 24px 0",
        flexShrink: 0,
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease`,
        // Reserva espaço fixo durante o fade pra conteúdo abaixo não pular
        // (3 linhas × ~19px line-height + gaps)
        minHeight: 80,
      }}
    >
      {shownCount >= 1 && <SystemTerminalLine text={flow.diablo1} />}
      {shownCount >= 2 && <SystemTerminalLine text={flow.diablo2} />}
      {shownCount >= 3 && <SystemTerminalLine text={flow.hint} />}
    </div>
  );
}
