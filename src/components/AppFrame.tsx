// src/components/AppFrame.tsx
// Frame persistente do app pós-onboarding (ONB-4 + ONB-7 §1.9).
// Frame nunca some — mesmo durante loading, reveal, erros e modais.
// NavBottom sempre visível, conteúdo da página vive no canvas.
//
// Estrutura:
//   r-screen
//     main (flex 1)
//       canvas (position:relative, overflow:auto) ← children + modais/toasts vivem aqui
//       guidance line (quando modo guiado, no rodapé do canvas)
//     NavBottom
//   SystemPulse (efeito colateral, aplicado ao destino)
//
// O canvas tem `position: relative` para que DecisionModal, TransientToast,
// CatastrophicError (do Bloco 2) possam usar `position: absolute; inset: 0`
// e cobrir apenas o conteúdo, nunca o frame (NavBottom continua acessível).
//
// Modo guiado:
// - Aceita `guidance` vindo do hook useGuidedMode (ou null).
// - Quando ativo: SystemTerminalLine no rodapé do canvas (frase em cinza) +
//   SystemPulse aplicando cor função + opacidade pulsante ao destino.
// - Princípio: voz fala (cinza), cor de função aponta (roxo) — nunca o inverso.

import type { ReactNode } from "react";
import NavBottom from "./NavBottom";
import SystemPulse from "./SystemPulse";
import SystemTerminalLine from "./SystemTerminalLine";
import type { Guidance } from "../hooks/useGuidedMode";

interface AppFrameProps {
  children: ReactNode;
  guidance?: Guidance | null;
}

export default function AppFrame({ children, guidance }: AppFrameProps) {
  return (
    <div className="r-screen">
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
        {guidance && (
          <div style={{ padding: "12px 24px 16px", flexShrink: 0 }}>
            <SystemTerminalLine text={guidance.message} fontSize={13} />
          </div>
        )}
      </main>
      <NavBottom />
      {guidance && <SystemPulse targetId={guidance.target} />}
    </div>
  );
}
