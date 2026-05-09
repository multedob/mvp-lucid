// src/components/AppShell.tsx
// Shell persistente para rotas autenticadas (Home, Pills, Questionnaire, Reed, Context, Settings).
// Header e NavBottom não remontam entre rotas → transição entre páginas é fluida.
//
// Conteúdo das páginas vive no <Outlet />. Páginas controlam header.section + nav.active
// via hook useShell(), que escreve em ShellContext.
//
// FlowVoice é renderizado aqui também — ocupa o canvas durante uma transição flowTo()
// (sequência diablo1 → diablo2 → hint), depois fade-out. Páginas alvo detectam fromFlow
// e pulam seu LoadingScreen.

import { useState, useMemo, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import NavBottom, { type ActivePage } from "./NavBottom";
import { ShellContext, type ShellState } from "@/hooks/useShell";
import { FlowProvider } from "@/hooks/useFlow";
import FlowVoice from "./FlowVoice";

interface AppShellProps {
  children?: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [section, setSection] = useState<string | undefined>(undefined);
  const [active, setActive] = useState<ActivePage>("none");

  const value = useMemo<ShellState>(
    () => ({ section, active, setSection, setActive }),
    [section, active]
  );

  return (
    <ShellContext.Provider value={value}>
      <FlowProvider>
        <div className="r-screen">
          <AppHeader section={section} />
          {/* main com position relative pra FlowVoice (overlay absoluto) coexistir com Outlet */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
            <FlowVoice />
            {children ?? <Outlet />}
          </div>
          <NavBottom active={active} />
        </div>
      </FlowProvider>
    </ShellContext.Provider>
  );
}
