// src/hooks/useOnboardingState.ts
// A2 — Hook que lê/escreve user_onboarding_state via Supabase.
// Substitui leitura/escrita direta de localStorage.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStep =
  | "age_confirmed"
  | "consent_given"
  | "letter_seen"
  | "name_set";

export interface OnboardingState {
  user_id: string;
  age_confirmed_at: string | null;
  consent_given_at: string | null;
  letter_seen_at: string | null;
  name_set_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseOnboardingStateReturn {
  state: OnboardingState | null;
  loading: boolean;
  error: Error | null;
  /** Marca um step como concluído (now()). Idempotente. */
  markStep: (step: OnboardingStep) => Promise<void>;
  /** Recarrega state do banco. */
  refetch: () => Promise<void>;
  // Helpers booleanos
  isAgeConfirmed: boolean;
  isConsentGiven: boolean;
  isLetterSeen: boolean;
  isNameSet: boolean;
  /** True quando todos os 4 steps estão concluídos. */
  isOnboardingComplete: boolean;
}

export function useOnboardingState(): UseOnboardingStateReturn {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setState(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await (supabase
        .from("user_onboarding_state") as any)
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("[useOnboardingState] fetch error:", fetchError);
        setError(fetchError as Error);
        setState(null);
      } else {
        setState(data as OnboardingState | null);
        setError(null);
      }
    } catch (err) {
      console.error("[useOnboardingState] unexpected fetch error:", err);
      setError(err as Error);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const markStep = useCallback(
    async (step: OnboardingStep) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.warn("[useOnboardingState] markStep called without session");
        return;
      }

      const column = `${step}_at`;
      const now = new Date().toISOString();

      // Optimistic update
      setState((prev) =>
        prev
          ? ({ ...prev, [column]: now, updated_at: now } as OnboardingState)
          : prev
      );

      const { error: upsertError } = await (supabase
        .from("user_onboarding_state") as any)
        .upsert(
          { user_id: session.user.id, [column]: now },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error(
          `[useOnboardingState] failed to mark ${step}:`,
          upsertError
        );
        // Rollback: refetch para sincronizar com banco
        await fetchState();
      }
    },
    [fetchState]
  );

  return {
    state,
    loading,
    error,
    markStep,
    refetch: fetchState,
    isAgeConfirmed: !!state?.age_confirmed_at,
    isConsentGiven: !!state?.consent_given_at,
    isLetterSeen: !!state?.letter_seen_at,
    isNameSet: !!state?.name_set_at,
    isOnboardingComplete:
      !!state?.age_confirmed_at &&
      !!state?.consent_given_at &&
      !!state?.letter_seen_at &&
      !!state?.name_set_at,
  };
}

/**
 * Função utilitária — marca um step sem precisar do hook (para uso em handlers
 * onde montar o hook não faz sentido). Não atualiza estado React.
 */
export async function markOnboardingStep(step: OnboardingStep): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;

  const column = `${step}_at`;
  const now = new Date().toISOString();

  const { error } = await (supabase
    .from("user_onboarding_state") as any)
    .upsert(
      { user_id: session.user.id, [column]: now },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error(`[markOnboardingStep] failed to mark ${step}:`, error);
    throw error;
  }
}
