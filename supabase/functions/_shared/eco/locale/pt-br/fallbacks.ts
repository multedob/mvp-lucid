// supabase/functions/_shared/eco/locale/pt-br/fallbacks.ts
// Appendix PT-BR v1.0 §5 — Fallback canônico por Pill.
// Usado apenas quando NENHUM operador dispara (raro — OP01 é sempre elegível
// se m3_2.abre_mao ≥ 3 palavras). Sem mirror fragment: o usuário não deu
// material suficiente para refletir.

import type { PillId } from '../../types.ts';

export const FALLBACKS_PT_BR: Readonly<Record<PillId, string>> = {
  PI:   'o que se moveu, e o que ficou?',
  PII:  'quem está fazendo o trabalho que você descreveu?',
  PIII: 'qual é a distância, em passos, agora?',
  PIV:  'o que você sabe e ainda não fez?',
  PV:   'o que está mudando e ainda não tem nome?',
  PVI:  'qual é o custo do ritmo?',
};

/** Bloco completo renderizado do fallback (com marcador `— reed —`). */
export function renderFallbackPtBr(pillId: PillId): {
  lines: string[];
  reed_question: string;
} {
  const question = FALLBACKS_PT_BR[pillId];
  return {
    lines: ['— reed —', '', question],
    reed_question: question,
  };
}
