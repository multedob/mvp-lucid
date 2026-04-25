// supabase/functions/_shared/eco/locale/pt-br/high-charge-words.ts
// Appendix PT-BR v1.0 §3 — Lista de palavras de alta carga para OP03 tiebreaking.

export const CHARGE_FATIGUE_PT_BR = [
  'cansado', 'cansada', 'cansaço', 'cansaco',
  'exausto', 'exausta',
  'esgotado', 'esgotada',
  'morto', 'morta',
  'pesado', 'pesada', 'peso',
  'sobrecarregado', 'sobrecarregada',
];

export const CHARGE_FEAR_PT_BR = [
  'medo',
  'assustado', 'assustada',
  'ansioso', 'ansiosa', 'ansiedade',
  'preocupado', 'preocupada',
  'aflito', 'aflita',
  'nervoso', 'nervosa',
];

export const CHARGE_EXISTENTIAL_PT_BR = [
  'perdido', 'perdida',
  'sozinho', 'sozinha', 'solidão', 'solidao',
  'vazio', 'vazia',
];

export const CHARGE_CONFORMITY_PT_BR = [
  'normal',
  'tranquilo', 'tranquila',
];

export const CHARGE_CONFORMITY_PHRASES_PT_BR = [
  'tá tudo bem',
  'ta tudo bem',
  'tudo bem',
  'tá bom',
  'ta bom',
  'tá tranquilo',
  'ta tranquilo',
  'tá de boa',
  'ta de boa',
  'tô bem',
  'to bem',
  'tô de boa',
  'to de boa',
  'é normal',
  'e normal',
  'está normal',
  'esta normal',
];

export const CHARGE_OBLIGATION_PHRASES_PT_BR = [
  'tenho que',
  'não posso deixar',
  'nao posso deixar',
  'tenho obrigação',
  'tenho obrigacao',
  'não tenho escolha',
  'nao tenho escolha',
  'sou obrigado',
  'sou obrigada',
];

export const CHARGE_OBLIGATION_PT_BR = [
  'preciso',
  'devia',
  'deveria',
];

export const CHARGE_IMPOTENCE_PHRASES_PT_BR = [
  'não consigo',
  'nao consigo',
  'não tem jeito',
  'nao tem jeito',
  'não dá',
  'nao da',
  'não adianta',
  'nao adianta',
  'não vale a pena',
  'nao vale a pena',
];

export const CHARGE_IMPOTENCE_PT_BR = [
  'impossível',
  'impossivel',
];

export const CHARGE_BR_INTENSITY_PT_BR = [
  'chato', 'chatice',
  'saco',
  'foda', 'fodido', 'fodida',
  'merda',
  'porra',
];

export const HIGH_CHARGE_WORDS_PT_BR: ReadonlySet<string> = new Set([
  ...CHARGE_FATIGUE_PT_BR,
  ...CHARGE_FEAR_PT_BR,
  ...CHARGE_EXISTENTIAL_PT_BR,
  ...CHARGE_CONFORMITY_PT_BR,
  ...CHARGE_OBLIGATION_PT_BR,
  ...CHARGE_IMPOTENCE_PT_BR,
  ...CHARGE_BR_INTENSITY_PT_BR,
]);

export const HIGH_CHARGE_PHRASES_PT_BR: ReadonlyArray<string> = [
  ...CHARGE_CONFORMITY_PHRASES_PT_BR,
  ...CHARGE_OBLIGATION_PHRASES_PT_BR,
  ...CHARGE_IMPOTENCE_PHRASES_PT_BR,
].sort((a, b) => b.length - a.length);
