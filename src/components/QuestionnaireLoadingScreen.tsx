// src/components/QuestionnaireLoadingScreen.tsx
// Wrapper sobre LoadingScreen com frases do questionário.

import { LoadingScreen } from "./LoadingScreen";

interface Props {
  loadComplete?: boolean;
  onDone?: () => void;
}

const PHRASES: [string, string, string] = [
  "ajustando ao seu ciclo...",
  "revisando o que ainda faz sentido perguntar...",
  "pronto.",
];

export function QuestionnaireLoadingScreen({ loadComplete, onDone }: Props) {
  return <LoadingScreen phrases={PHRASES} loadComplete={loadComplete} onDone={onDone} />;
}
