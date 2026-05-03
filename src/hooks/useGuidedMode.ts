// src/hooks/useGuidedMode.ts
// Controla o modo guiado do AppFrame (ONB-7 §1.9 + §1.6).
//
// Estado mínimo: guidance (target + frase + kind) ou null.
// AppFrame consome `active` para entrar em modo guiado, `guidance` para
// renderizar SystemTerminalLine + SystemPulse no destino certo.
//
// Regra de TTL (continuidade §8 / ONB-7 §1.6):
// - kind="continuidade": some sozinha após 60s (sugestão de próximo passo)
// - kind="necessidade": persiste até dismiss() ser chamado pelo caller
//   (tipicamente ao clicar no destino — caller conecta handler → dismiss)

import { useCallback, useEffect, useRef, useState } from "react";

export type GuidanceKind = "continuidade" | "necessidade";

export interface Guidance {
  target: string;
  message: string;
  kind: GuidanceKind;
}

export interface UseGuidedModeReturn {
  active: boolean;
  guidance: Guidance | null;
  show: (g: Guidance) => void;
  dismiss: () => void;
}

const CONTINUIDADE_TTL_MS = 60_000;

export default function useGuidedMode(): UseGuidedModeReturn {
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setGuidance(null);
  }, [clearTimer]);

  const show = useCallback(
    (g: Guidance) => {
      clearTimer();
      setGuidance(g);
      if (g.kind === "continuidade") {
        timerRef.current = setTimeout(() => {
          setGuidance(null);
          timerRef.current = null;
        }, CONTINUIDADE_TTL_MS);
      }
    },
    [clearTimer]
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    active: guidance !== null,
    guidance,
    show,
    dismiss,
  };
}
