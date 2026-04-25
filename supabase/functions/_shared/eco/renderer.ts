// supabase/functions/_shared/eco/renderer.ts
// Renderiza um template localizado em um bloco final de texto.
// Aplica substituição de placeholders + formatação por extenso de count.

import type {
  DetectionResult,
  EcoTemplate,
  OperatorId,
  Variation,
} from './types.ts';
import { TEMPLATES_PT_BR } from './locale/pt-br/templates.ts';

// ─── count → palavra por extenso (PT-BR) ─────────────────────────

const COUNT_WORDS_PT_BR: Record<number, string> = {
  2: 'duas vezes',
  3: 'três vezes',
  4: 'quatro vezes',
  5: 'cinco vezes',
  6: 'seis vezes',
  7: 'sete vezes',
  8: 'oito vezes',
  9: 'nove vezes',
  10: 'dez vezes',
};

export function countWordPtBr(n: number): string {
  return COUNT_WORDS_PT_BR[n] ?? `${n} vezes`;
}

// ─── Substituição de placeholders ────────────────────────────────

function fillPlaceholders(
  source: string,
  vars: Record<string, string>
): string {
  return source.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return vars[key] ?? `{{${key}}}`;
  });
}

// ─── API principal ───────────────────────────────────────────────

export interface RenderedEco {
  operator_id: OperatorId;
  variation: Variation;
  lines: string[];
  reed_question: string;
  full_text: string;
  fragments: string[];
}

/**
 * Renderiza o template do operador + variação selecionada, usando metadata
 * da detecção para preencher placeholders. Idempotente e side-effect-free.
 */
export function renderTemplate(
  operator_id: OperatorId,
  variation: Variation,
  detection: DetectionResult
): RenderedEco {
  const byOp = TEMPLATES_PT_BR[operator_id as keyof typeof TEMPLATES_PT_BR];
  if (!byOp) {
    throw new Error(`no templates for operator ${operator_id} in pt-BR`);
  }
  const template = (byOp as Record<Variation, EcoTemplate | undefined>)[variation];
  if (!template) {
    throw new Error(
      `no template for ${operator_id}/${variation} in pt-BR`,
    );
  }

  const vars = buildVars(operator_id, detection);

  const lines = template.lines.map(line => fillPlaceholders(line, vars));
  const reed_question = fillPlaceholders(template.reed_question, vars);

  return {
    operator_id,
    variation,
    lines,
    reed_question,
    full_text: lines.join('\n'),
    fragments: detection.fragments ?? [],
  };
}

/**
 * Constrói o dicionário de substituição dado o resultado de detecção.
 * Cada operador expõe metadata específica; o renderer conhece as chaves
 * que importam para os templates.
 */
function buildVars(
  operator_id: OperatorId,
  detection: DetectionResult,
): Record<string, string> {
  const md = detection.metadata ?? {};
  const vars: Record<string, string> = {};

  switch (operator_id) {
    case 'OP01': {
      vars.abre_mao = (md.abre_mao as string) ?? detection.fragments?.[0] ?? '';
      break;
    }
    case 'OP03': {
      vars.word = (md.word as string) ?? detection.fragments?.[0] ?? '';
      const count = (md.count as number) ?? 0;
      vars.count = String(count);
      vars.count_word = countWordPtBr(count);
      break;
    }
    case 'OP04': {
      const total = (md.total_hesitations as number) ?? 0;
      vars.count = String(total);
      vars.count_word = countWordPtBr(total);
      vars.dominant_marker = (md.dominant_marker as string) ?? '';
      break;
    }
  }

  return vars;
}

// ─── Quality gate (§7 spec) ──────────────────────────────────────

export interface QualityGateResult {
  passed: boolean;
  failures: string[];
}

const WORD_LIMIT_QUESTION = 20;
const WORD_LIMIT_TOTAL = 60;

export function runQualityGate(
  rendered: RenderedEco,
  userText: string,
): QualityGateResult {
  const failures: string[] = [];

  // 1. fragments são substrings verbatim (case-insensitive).
  const lowerUser = userText.toLowerCase();
  for (const frag of rendered.fragments) {
    if (!lowerUser.includes(frag.toLowerCase())) {
      failures.push(`fragment not verbatim: "${frag}"`);
    }
  }

  // 2. pergunta Reed ≤ 20 palavras.
  const qWords = rendered.reed_question.trim().split(/\s+/).length;
  if (qWords > WORD_LIMIT_QUESTION) {
    failures.push(`question exceeds ${WORD_LIMIT_QUESTION} words: ${qWords}`);
  }

  // 3. total ≤ 60 palavras.
  const totalWords = rendered.full_text.trim().split(/\s+/).length;
  if (totalWords > WORD_LIMIT_TOTAL) {
    failures.push(`total exceeds ${WORD_LIMIT_TOTAL} words: ${totalWords}`);
  }

  // 4. pergunta tem forma interrogativa (heurística: contém "?" ou começa
  //    com palavra de interrogação PT-BR).
  const q = rendered.reed_question.toLowerCase().trim();
  const hasQuestionMark = q.includes('?');
  const qStarters = ['o que', 'onde', 'quem', 'como', 'quando', 'por que',
    'por quê', 'qual', 'há quanto', 'em qual', 'decidiu', 'está', 'era',
    'foi', 'você'];
  const hasQuestionStart = qStarters.some(s => q.startsWith(s));
  if (!hasQuestionMark && !hasQuestionStart) {
    failures.push('reed_question is not in question form');
  }

  return { passed: failures.length === 0, failures };
}
