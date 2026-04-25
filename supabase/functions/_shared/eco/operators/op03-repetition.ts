// supabase/functions/_shared/eco/operators/op03-repetition.ts
// OP03 Repetition — detecção determinística.
// Spec §4.3. Concatena M2 + M4, tokeniza, filtra stopwords, conta.
// Trigger: alguma palavra substantiva ≥ 3 ocorrências.
// Tiebreak: maior carga (HIGH_CHARGE_WORDS_PT_BR); fallback: maior frequência.

import type { EcoInputs, DetectionResult, Operator, Locale } from '../types.ts';
import {
  STOPWORDS_PT_BR,
  MIN_WORD_LENGTH_PT_BR,
  HIGH_CHARGE_WORDS_PT_BR,
  HIGH_CHARGE_PHRASES_PT_BR,
  OP03_REPETITION_THRESHOLD_PT_BR,
} from '../locale/pt-br/index.ts';

// ─── Tokenização ─────────────────────────────────────────────────

/**
 * Normaliza para lowercase e separa por espaços/pontuação.
 * Preserva acentos (português tem pares como "para"/"pára").
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/["'`]/g, '')            // remove aspas
    .split(/[\s,.;:!?()\-—–/]+/)      // divide em separadores
    .filter(Boolean);
}

function isCountable(token: string): boolean {
  if (token.length < MIN_WORD_LENGTH_PT_BR) return false;
  if (STOPWORDS_PT_BR.has(token)) return false;
  if (/^\d+$/.test(token)) return false;
  return true;
}

// ─── Contagem multi-word (expressões) ────────────────────────────

function countPhraseOccurrences(text: string, phrase: string): number {
  const lower = text.toLowerCase();
  const normalized = phrase.toLowerCase();
  if (!normalized) return 0;
  let count = 0;
  let pos = lower.indexOf(normalized);
  while (pos !== -1) {
    count++;
    pos = lower.indexOf(normalized, pos + normalized.length);
  }
  return count;
}

// ─── Detector principal ──────────────────────────────────────────

export const OP03_Repetition: Operator = {
  id: 'OP03',
  detect(inputs: EcoInputs, _locale: Locale): DetectionResult {
    const combined = [inputs.m2 ?? '', inputs.m4 ?? ''].join(' ').trim();
    if (!combined) {
      return { triggered: false, rejection_reason: 'empty m2 + m4' };
    }

    // 1. Contagem de expressões multi-word de alta carga (§3.4 etc.)
    //    Essas têm prioridade absoluta no tiebreak quando acima do threshold.
    const phraseHits: Array<{ phrase: string; count: number }> = [];
    for (const phrase of HIGH_CHARGE_PHRASES_PT_BR) {
      const count = countPhraseOccurrences(combined, phrase);
      if (count >= OP03_REPETITION_THRESHOLD_PT_BR) {
        phraseHits.push({ phrase, count });
      } else if (count >= 2) {
        // Apêndice §6.1 worked example: "tá tudo bem" ×2 dispara via high-charge.
        phraseHits.push({ phrase, count });
      }
    }

    // 2. Contagem de tokens únicos (palavras substantivas).
    const tokens = tokenize(combined).filter(isCountable);
    const frequency = new Map<string, number>();
    for (const t of tokens) {
      frequency.set(t, (frequency.get(t) ?? 0) + 1);
    }

    const eligibleTokens = [...frequency.entries()]
      .filter(([, count]) => count >= OP03_REPETITION_THRESHOLD_PT_BR)
      .map(([word, count]) => ({ word, count }));

    // 3. Decisão.
    //    Priorizar phrase hit se existe (mais específico e mais carregado).
    if (phraseHits.length > 0) {
      const winner = phraseHits.sort((a, b) => b.count - a.count)[0];
      return {
        triggered: true,
        fragments: [winner.phrase],
        metadata: {
          word: winner.phrase,
          count: winner.count,
          hit_type: 'phrase',
        },
        rejection_reason: null,
      };
    }

    if (eligibleTokens.length === 0) {
      return {
        triggered: false,
        rejection_reason: 'no word reached threshold',
      };
    }

    // 4. Tiebreak: high-charge word vence.
    const charged = eligibleTokens.filter(e => HIGH_CHARGE_WORDS_PT_BR.has(e.word));
    const pool = charged.length > 0 ? charged : eligibleTokens;
    const winner = pool.sort((a, b) => b.count - a.count)[0];

    return {
      triggered: true,
      fragments: [winner.word],
      metadata: {
        word: winner.word,
        count: winner.count,
        hit_type: charged.length > 0 ? 'charged_token' : 'token',
      },
      rejection_reason: null,
    };
  },
};
