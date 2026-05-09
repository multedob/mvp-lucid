// src/hooks/useFlow.tsx
// Provider + hook do flow de transição entre páginas (sem quebra visual).
//
// Usage:
//   const { flowTo, flow } = useFlow();
//   flowTo('/questionnaire')
//
// O FlowVoice (renderizado no AppShell) escuta `flow` e anima a sequência
// diablo1 → diablo2 → hint. Quando termina, navega pra path com state.fromFlow=true.
// Páginas alvo detectam state.fromFlow e pulam seu LoadingScreen.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  PATH_TO_DEST,
  DEST_SECTION,
  DEST_ACTIVE,
  pickFlowVoice,
  type FlowDestination,
} from "@/lib/flowPools";
import { useShellState } from "@/hooks/useShell";

export interface FlowSnapshot {
  /** Destino do flow (pills, questionnaire, reed, context) */
  dest: FlowDestination;
  /** Path final após animação */
  path: string;
  /** 2 frases diablo distintas + hint final, sorteadas no momento do flowTo */
  diablo1: string;
  diablo2: string;
  hint: string;
}

interface FlowContextValue {
  flow: FlowSnapshot | null;
  /** Dispara a transição visual + navegação programática */
  flowTo: (path: string) => void;
  /** Limpa o flow ativo (chamado pelo FlowVoice ao terminar) */
  clearFlow: () => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const shell = useShellState();
  const [flow, setFlow] = useState<FlowSnapshot | null>(null);

  const flowTo = useCallback(
    (path: string) => {
      const dest = PATH_TO_DEST[path];
      if (!dest) {
        // path sem flow registrado — navega normal
        navigate(path);
        return;
      }
      // Já estamos no destino? não faz flow.
      if (window.location.pathname === path) return;

      // Atualiza header + nav imediatamente (não espera animação) — assim o
      // contexto visual já indica pra onde está indo desde o primeiro frame.
      shell.setSection(DEST_SECTION[dest]);
      shell.setActive(DEST_ACTIVE[dest]);

      const voice = pickFlowVoice(dest);
      setFlow({ dest, path, ...voice });
    },
    [navigate, shell]
  );

  const clearFlow = useCallback(() => setFlow(null), []);

  const value = useMemo<FlowContextValue>(
    () => ({ flow, flowTo, clearFlow }),
    [flow, flowTo, clearFlow]
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow deve ser usado dentro de <FlowProvider>");
  return ctx;
}

/** Variante que retorna null se NÃO houver FlowProvider no ancestral.
 *  Útil pra componentes (NavBottom) que podem viver dentro OU fora do AppShell. */
export function useOptionalFlow(): FlowContextValue | null {
  return useContext(FlowContext);
}

/** Helper pras páginas alvo: true se a navegação atual veio de um flowTo */
export function useCameFromFlow(): boolean {
  if (typeof window === "undefined") return false;
  const state = window.history.state;
  return !!(state && state.usr && state.usr.fromFlow);
}
