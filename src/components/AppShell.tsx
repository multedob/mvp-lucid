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
import ErrorBoundary from "./ErrorBoundary";
import SystemPulse from "./SystemPulse";
import { useUnreadReading } from "@/lib/unreadReading";


interface AppShellProps {
  children?: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [section, setSection] = useState<string | undefined>(undefined);
  const [active, setActive] = useState<ActivePage>("none");
  // Fix UX 06/jun — pulse contínuo no botão "leitura" quando há deep reading
  // novo não-lido. Para quando user abre /context (que faz markReadingRead).
  const unreadReading = useUnreadReading();

  const value = useMemo<ShellState>(
    () => ({ section, active, setSection, setActive }),
    [section, active]
  );

  return (
    <ShellContext.Provider value={value}>
      <FlowProvider>
        <div className="r-screen">
          <AppHeader section={section} />
          {/* main com position relative pra FlowVoice (overlay absoluto) coexistir com Outlet.
              ErrorBoundary wrappa só o conteúdo das rotas — Header e NavBottom continuam
              renderizando caso o conteúdo trave, dando saída pelo Nav. */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
            <FlowVoice />
            <ErrorBoundary boundaryName="appshell">
              {children ?? <Outlet />}
            </ErrorBoundary>
          </div>
          <NavBottom active={active} />
          {/* Pulse global no botão "leitura" enquanto houver leitura não-lida.
              SystemPulse não renderiza visualmente — aplica animação via JS no elemento. */}
          <SystemPulse targetId="nav-context" active={unreadReading} />
        </div>
      </FlowProvider>
    </ShellContext.Provider>
  );
}
