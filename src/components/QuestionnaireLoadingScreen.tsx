// src/components/QuestionnaireLoadingScreen.tsx
// Wrapper sobre LoadingScreen pro questionário.
// Header `rdwth | ciclo | data` + footer com "ciclo" iluminado.
// Fix UX 06/jun — section trocada de "questionário" pra "ciclo" (vocabulário novo).
// Frases agora são fixas (morph + 2 Diablo + pronto), padrão do LoadingScreen v3.

import { LoadingScreen } from "./LoadingScreen";

interface Props {
  loadComplete?: boolean;
  onDone?: () => void;
}

export function QuestionnaireLoadingScreen({ loadComplete, onDone }: Props) {
  return (
    <LoadingScreen
      loadComplete={loadComplete}
      onDone={onDone}
      section="ciclo"
      active="questionnaire"
    />
  );
}
