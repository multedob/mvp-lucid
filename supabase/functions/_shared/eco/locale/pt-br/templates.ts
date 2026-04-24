// supabase/functions/_shared/eco/locale/pt-br/templates.ts
// Appendix PT-BR v1.0 §4 — Reed questions: templates por operador e variação.

import type { EcoTemplate } from '../../types.ts';

// ─── OP01 Cost ────────────────────────────────────────────────────

const OP01_V0: EcoTemplate = {
  operator_id: 'OP01',
  variation: 'V0',
  lines: [
    '— você disse —',
    '',
    '"{{abre_mao}}"',
    '',
    'é o que você abre mão de.',
    '',
    '— reed —',
    '',
    'está pagando agora, ou depois?',
  ],
  reed_question: 'está pagando agora, ou depois?',
};

const OP01_V1: EcoTemplate = {
  operator_id: 'OP01',
  variation: 'V1',
  lines: [
    '— você disse —',
    '',
    '"{{abre_mao}}"',
    '',
    '— reed —',
    '',
    'você nomeou o custo. decidiu pagar?',
  ],
  reed_question: 'você nomeou o custo. decidiu pagar?',
};

const OP01_V2: EcoTemplate = {
  operator_id: 'OP01',
  variation: 'V2',
  lines: [
    '— você disse —',
    '',
    '"{{abre_mao}}"',
    '',
    '— reed —',
    '',
    'onde isso aparece na sua semana?',
  ],
  reed_question: 'onde isso aparece na sua semana?',
};

// ─── OP03 Repetition ──────────────────────────────────────────────

const OP03_V0: EcoTemplate = {
  operator_id: 'OP03',
  variation: 'V0',
  lines: [
    '— você disse —',
    '',
    '"{{word}}" — {{count_word}}.',
    '',
    '— reed —',
    '',
    '{{count_word}}. por quê?',
  ],
  reed_question: '{{count_word}}. por quê?',
};

const OP03_V1: EcoTemplate = {
  operator_id: 'OP03',
  variation: 'V1',
  lines: [
    '— você disse —',
    '',
    '"{{word}}" voltou.',
    '',
    '— reed —',
    '',
    'o que tem embaixo?',
  ],
  reed_question: 'o que tem embaixo?',
};

const OP03_V2: EcoTemplate = {
  operator_id: 'OP03',
  variation: 'V2',
  lines: [
    '— você disse —',
    '',
    '{{count_word}}: "{{word}}".',
    '',
    '— reed —',
    '',
    'era a palavra certa?',
  ],
  reed_question: 'era a palavra certa?',
};

const OP03_V3: EcoTemplate = {
  operator_id: 'OP03',
  variation: 'V3',
  lines: [
    '— você disse —',
    '',
    '"{{word}}", "{{word}}", "{{word}}".',
    '',
    '— reed —',
    '',
    'o que precisa ser dito {{count_word}} para parecer verdade?',
  ],
  reed_question: 'o que precisa ser dito {{count_word}} para parecer verdade?',
};

// ─── OP04 Weight ──────────────────────────────────────────────────

const OP04_V0: EcoTemplate = {
  operator_id: 'OP04',
  variation: 'V0',
  lines: [
    '— você disse —',
    '',
    '"não sei" — {{count_word}}.',
    '',
    '— reed —',
    '',
    'há quanto tempo você está nesse "não sei"?',
  ],
  reed_question: 'há quanto tempo você está nesse "não sei"?',
};

const OP04_V1: EcoTemplate = {
  operator_id: 'OP04',
  variation: 'V1',
  lines: [
    '— você disse —',
    '',
    '"talvez" — {{count_word}}.',
    '',
    '— reed —',
    '',
    'o que você está protegendo ao não decidir?',
  ],
  reed_question: 'o que você está protegendo ao não decidir?',
};

const OP04_V2: EcoTemplate = {
  operator_id: 'OP04',
  variation: 'V2',
  lines: [
    '— você disse —',
    '',
    '{{count_word}} hesitações.',
    '',
    '— reed —',
    '',
    'o que acontece se você escolher uma delas?',
  ],
  reed_question: 'o que acontece se você escolher uma delas?',
};

const OP04_V3: EcoTemplate = {
  operator_id: 'OP04',
  variation: 'V3',
  lines: [
    '— você disse —',
    '',
    '"acho" — {{count_word}}.',
    '',
    '— reed —',
    '',
    'o que você sabe, mas ainda não está dizendo?',
  ],
  reed_question: 'o que você sabe, mas ainda não está dizendo?',
};

// ─── Export consolidado ───────────────────────────────────────────

export const TEMPLATES_PT_BR = {
  OP01: { V0: OP01_V0, V1: OP01_V1, V2: OP01_V2 },
  OP03: { V0: OP03_V0, V1: OP03_V1, V2: OP03_V2, V3: OP03_V3 },
  OP04: { V0: OP04_V0, V1: OP04_V1, V2: OP04_V2, V3: OP04_V3 },
} as const;
