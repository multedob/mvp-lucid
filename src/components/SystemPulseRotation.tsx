// src/components/SystemPulseRotation.tsx
// Rotação single-target em looping (ONB-7 §1.5 — "se múltiplos caminhos, rotacionam")
//
// Usa <SystemPulse> internamente. A cada `perTargetMs`, troca o targetId pro próximo
// da lista. Quando chega no fim, volta pro começo. Loop infinito.
//
// Caso de uso: marco onboarding completo na Home — pulsa reed → pills → questionnaire
// rotacionando, sugerindo os 3 caminhos principais sem priorizar nenhum.
//
// Componente puro de efeito colateral (não renderiza nada visível). Aplica color +
// pulse via element.style ao destino atual. Restaura quando muda destino ou desmonta.

import { useEffect, useState } from "react";
import SystemPulse from "./SystemPulse";

interface SystemPulseRotationProps {
  targetIds: string[];
  perTargetMs?: number;
  active?: boolean;
}

const DEFAULT_PER_TARGET_MS = 7000;

export default function SystemPulseRotation({
  targetIds,
  perTargetMs = DEFAULT_PER_TARGET_MS,
  active = true,
}: SystemPulseRotationProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!active || targetIds.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((i) => (i + 1) % targetIds.length);
    }, perTargetMs);
    return () => clearInterval(interval);
  }, [targetIds.length, perTargetMs, active]);

  // Reset index se a lista mudar
  useEffect(() => {
    setActiveIdx(0);
  }, [targetIds.join(",")]);

  if (!active || targetIds.length === 0) return null;

  const currentTarget = targetIds[activeIdx];
  return <SystemPulse targetId={currentTarget} active={true} />;
}
