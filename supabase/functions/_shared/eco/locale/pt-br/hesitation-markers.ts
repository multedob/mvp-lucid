// supabase/functions/_shared/eco/locale/pt-br/hesitation-markers.ts
// Appendix PT-BR v1.0 §1 — Hesitation markers (OP04 Weight).
// Ordem importa: frases mais longas primeiro para evitar captura parcial.

export const HESITATION_CORE_STRONG_PT_BR = [
  'não tenho como saber',
  'não tenho certeza',
  'nao tenho certeza',
  'não faço ideia',
  'nao faço ideia',
  'eu não sei se',
  'mas não sei',
  'mas nao sei',
  'mas sei lá',
  'mas sei la',
  'não sei',
  'nao sei',
  'sei lá',
  'sei la',
];

export const HESITATION_MEDIUM_PT_BR = [
  'sinceramente não',
  'sinceramente nao',
  'pode até ser',
  'quem sabe',
  'pode ser',
  'vai que',
  'talvez',
];

export const HESITATION_WEAK_PT_BR = [
  'mais ou menos',
  'meio estranho',
  'de alguma forma',
  'tipo assim',
  'tipo que',
  'meio que',
  'eu acho',
  'acho que',
  'acho',
];

export const HESITATION_CONDITIONAL_PT_BR = [
  'se bem que',
];

export const HESITATION_MARKERS_PT_BR: ReadonlyArray<string> = [
  ...HESITATION_CORE_STRONG_PT_BR,
  ...HESITATION_MEDIUM_PT_BR,
  ...HESITATION_WEAK_PT_BR,
  ...HESITATION_CONDITIONAL_PT_BR,
].sort((a, b) => b.length - a.length);

export const HESITATION_THRESHOLD_PT_BR = 4;
