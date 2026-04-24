// supabase/functions/_shared/eco/operators/op01-cost.ts
// OP01 Cost — sempre elegível; fallback canônico.
// Spec §4.1. Determinístico. Rejeita se abre_mao vazio ou < 3 palavras.

import type { EcoInputs, DetectionResult, Operator, Locale } from '../types.ts';
import { OP01_MIN_ABRE_MAO_WORDS } from '../locale/pt-br/index.ts';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const OP01_Cost: Operator = {
  id: 'OP01',
  detect(inputs: EcoInputs, _locale: Locale): DetectionResult {
    const abreMao = (inputs.m3_2_abre_mao ?? '').trim();

    if (!abreMao) {
      return {
        triggered: false,
        rejection_reason: 'abre_mao empty',
      };
    }

    if (countWords(abreMao) < OP01_MIN_ABRE_MAO_WORDS) {
      return {
        triggered: false,
        rejection_reason: `abre_mao has < ${OP01_MIN_ABRE_MAO_WORDS} words`,
      };
    }

    return {
      triggered: true,
      fragments: [abreMao],
      metadata: {
        abre_mao: abreMao,
        is_abstract: isLikelyAbstract(abreMao),
      },
      rejection_reason: null,
    };
  },
};

/**
 * Heurística leve para sinalizar quando `abre_mao` é abstrato (ex: "paz",
 * "liberdade") — consumida pelo selector para preferir V2 ("onde isso
 * aparece na sua semana?").
 */
function isLikelyAbstract(text: string): boolean {
  const abstractTokens = new Set([
    'paz', 'liberdade', 'felicidade', 'amor', 'tranquilidade',
    'segurança', 'seguranca', 'esperança', 'esperanca',
    'identidade', 'clareza', 'sentido',
  ]);
  const words = text
    .toLowerCase()
    .split(/[\s,.;:!?]+/)
    .filter(Boolean);
  // "Abstrato" se ≤ 3 palavras e pelo menos uma delas é da lista.
  return words.length <= 3 && words.some(w => abstractTokens.has(w));
}
