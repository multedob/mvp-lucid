// src/components/AppHeader.tsx
// Header canônico do app — `rdwth | section | YYYY.MM.DD`
// Substitui o <div className="r-header"> inline replicado em ~14 páginas.
//
// Estrutura:
//   ┌──────────────────────────────────────────┐
//   │ rdwth      pergunta 1 de 5      2026.05.09 │
//   │──────────────────────────────────────────│ ← r-line
//   └──────────────────────────────────────────┘
//
// Props:
//   - section: texto do meio (opcional). Sem section, fica vazio.
//   - onLabelClick: handler do label "rdwth". Default: navigate("/home").
//                   Passe noop ou função custom pra ThirdParty/Warmup.
//   - showLine: renderiza <div className="r-line" /> abaixo. Default: true.
//
// Uso típico:
//   <AppHeader section="reed" />
//   <AppHeader section="ajustes" />
//   <AppHeader />  ← só "rdwth | data" (Home, OnboardingLetter, etc)

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

interface AppHeaderProps {
  section?: string;
  onLabelClick?: () => void;
  showLine?: boolean;
}

export default function AppHeader({
  section,
  onLabelClick,
  showLine = true,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const handleLabelClick = onLabelClick ?? (() => navigate("/home"));

  return (
    <>
      <div className="r-header">
        <span
          className="r-header-label"
          onClick={handleLabelClick}
          style={{ cursor: "pointer" }}
        >
          rdwth
        </span>
        {section && <span className="r-header-section">{section}</span>}
        <span className="r-header-date">{getToday()}</span>
      </div>
      {showLine && <div className="r-line" />}
    </>
  );
}
