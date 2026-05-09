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
 * header e NavBottom sem remount. Reseta pra "none"/undefined no unmount? Não —
 * fica como estava até a próxima página chamar (evita flicker de transição).
 */
export function useShell(options: UseShellOptions = {}): void {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell deve ser usado dentro de <AppShell>");
  }

  const { section, active } = options;

  useEffect(() => {
    if (section !== undefined) ctx.setSection(section);
    if (active !== undefined) ctx.setActive(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, active]);
}

/** Acesso direto ao estado do shell (raro — preferir useShell pra setar). */
export function useShellState(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShellState deve ser usado dentro de <AppShell>");
  return ctx;
}
