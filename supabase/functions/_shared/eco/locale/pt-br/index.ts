// supabase/functions/_shared/eco/locale/pt-br/index.ts
// Barrel de locale PT-BR do engine de Eco (porta Deno).

export {
  HESITATION_MARKERS_PT_BR,
  HESITATION_THRESHOLD_PT_BR,
  HESITATION_CORE_STRONG_PT_BR,
  HESITATION_MEDIUM_PT_BR,
  HESITATION_WEAK_PT_BR,
} from './hesitation-markers.ts';

export {
  STOPWORDS_PT_BR,
  HIGH_CHARGE_NOT_STOPWORDS_PT_BR,
  MIN_WORD_LENGTH_PT_BR,
} from './stopwords.ts';

export {
  HIGH_CHARGE_WORDS_PT_BR,
  HIGH_CHARGE_PHRASES_PT_BR,
} from './high-charge-words.ts';

export { TEMPLATES_PT_BR } from './templates.ts';

export { FALLBACKS_PT_BR, renderFallbackPtBr } from './fallbacks.ts';

// Thresholds compostos, exportados junto para conveniência.
export { MIN_WORD_LENGTH_PT_BR as OP03_MIN_WORD_LENGTH } from './stopwords.ts';

/** Threshold de repetição do OP03 (§8 appendix). */
export const OP03_REPETITION_THRESHOLD_PT_BR = 3;

/** Mínimo de palavras em `abre_mao` para OP01 ser elegível (§4.1 spec). */
export const OP01_MIN_ABRE_MAO_WORDS = 3;
