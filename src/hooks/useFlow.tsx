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
  /** Modo A — linha 1 fixa */
  diablo1: string;
  /** Modo A — linha 2 fixa */
  diablo2: string;
  /** Modo A — pool de extras rotacionando na linha 3 */
  extras: string[];
  /** Modo B (questionnaire) — pool consumido em zig-zag */
  pool: string[];
  /** Frase contextual final */
  hint: string;
}

interface FlowContextValue {
  flow: FlowSnapshot | null;
  /** Dispara a transição visual + navegação programática */
  flowTo: (path: string) => void;
  /** Limpa o flow ativo (chamado pelo FlowVoice ao terminar) */
  clearFlow: () => void;
  /** Página alvo chama quando dados estão prontos. FlowVoice troca os pares
   *  alternantes pela hint final na próxima oportunidade de transição. */
  markFlowReady: () => void;
  /** True quando markFlowReady foi chamado. */
  isFlowReady: boolean;
  /** True quando o FlowVoice já mostra a hint (sistema parou de alternar pares).
   *  Páginas alvo armam cascade do conteúdo principal observando isso. */
  hintShown: boolean;
  /** Internal — FlowVoice marca quando passa pra fase de hint. Não usar fora dele. */
  _setHintShown: (v: boolean) => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const shell = useShellState();
  const [flow, setFlow] = useState<FlowSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [hintShown, setHintShown] = useState(false);

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

      // Atualiza header + nav imediatamente.
      shell.setSection(DEST_SECTION[dest]);
      shell.setActive(DEST_ACTIVE[dest]);

      const voice = pickFlowVoice(dest);
      setFlow({ dest, path, ...voice });
      setReady(false);
      setHintShown(false);

      // Navega IMEDIATAMENTE — Home desmonta, página alvo monta com fromFlow=true.
      // FlowVoice (no AppShell) persiste através da navegação e cobre a transição.
      navigate(path, { state: { fromFlow: true } });
    },
    [navigate, shell]
  );

  const clearFlow = useCallback(() => {
    setFlow(null);
    setReady(false);
    setHintShown(false);
  }, []);

  const markFlowReady = useCallback(() => setReady(true), []);
  const _setHintShown = useCallback((v: boolean) => setHintShown(v), []);

  const value = useMemo<FlowContextValue>(
    () => ({ flow, flowTo, clearFlow, markFlowReady, isFlowReady: ready, hintShown, _setHintShown }),
    [flow, flowTo, clearFlow, markFlowReady, ready, hintShown, _setHintShown]
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
