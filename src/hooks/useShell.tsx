// src/hooks/useShell.tsx
// Hook do AppShell — páginas chamam useShell({ section, active }) no mount
// pra setar o estado do header/footer compartilhados.

import { createContext, useContext, useEffect } from "react";
import type { ActivePage } from "@/components/NavBottom";

export interface ShellState {
  section: string | undefined;
  active: ActivePage;
  setSection: (s: string | undefined) => void;
  setActive: (a: ActivePage) => void;
}

export const ShellContext = createContext<ShellState | null>(null);

interface UseShellOptions {
  section?: string;
  active?: ActivePage;
}

/**
 * Páginas dentro do AppShell chamam useShell({ section, active }) pra atualizar
 * header e NavBottom sem remount. Tolerante: fora do shell vira no-op silencioso
 * (cache antigo do bundler ou rota fora do shell não derruba a página).
 */
export function useShell(options: UseShellOptions = {}): void {
  const ctx = useContext(ShellContext);
  const { section, active } = options;

  useEffect(() => {
    if (!ctx) return;
    // Sempre seta section — passar undefined limpa o header (Home).
    // Sem isso, /home herdaria "terceiros" / "contexto" / etc da página anterior.
    ctx.setSection(section);
    if (active !== undefined) ctx.setActive(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, active]);
}

/** Acesso direto ao estado do shell. Lança se chamado fora — só usar em
 *  componentes que SÃO obrigatoriamente filhos do shell (ex: NavBottom no shell). */
export function useShellState(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShellState deve ser usado dentro de <AppShell>");
  return ctx;
}
