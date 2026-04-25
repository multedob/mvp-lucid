// supabase/functions/_shared/eco/engine.ts
// API pública do engine de Eco (porta Deno). Compõe seleção + renderização +
// quality gate. Consumido pela edge function ipe-eco.

import type {
  EcoInputs,
  EcoPayload,
  Locale,
  OperatorContext,
  Variation,
} from './types.ts';
import { selectOperator } from './selector.ts';
import { renderTemplate, runQualityGate } from './renderer.ts';
import { renderFallbackPtBr } from './locale/pt-br/fallbacks.ts';

export interface GenerateEcoOptions {
  locale?: Locale;
  /**
   * Quando true, pula o quality gate — útil em testes/mocks.
   * Produção sempre false.
   */
  skip_quality_gate?: boolean;
}

/**
 * Gera o Eco para uma Pill. Entrada completa + contexto do usuário; saída
 * pronta para renderizar + persistir em `pill_eco_events`.
 *
 * Protocolo:
 * 1. selectOperator → escolhe operador e variação.
 * 2. renderTemplate → aplica placeholders.
 * 3. runQualityGate → valida output (§7 spec).
 * 4. Em caso de falha dupla, renderFallbackPtBr → fallback canônico da Pill.
 */
export function generateEco(
  inputs: EcoInputs,
  context: OperatorContext = {},
  options: GenerateEcoOptions = {},
): EcoPayload {
  const locale: Locale = options.locale ?? 'pt-BR';
  const t0 = nowMs();

  const userText = [
    inputs.m2 ?? '',
    inputs.m3_2_abre_mao ?? '',
    inputs.m3_1_situacao_oposta ?? '',
    inputs.m3_3_narrativa ?? '',
    inputs.m3_3_condicao ?? '',
    inputs.m4 ?? '',
  ].join(' ');

  const selection = selectOperator(inputs, context, locale);

  if (selection) {
    const rendered = renderTemplate(
      selection.operator,
      selection.variation,
      selection.detection,
    );

    const gate = options.skip_quality_gate
      ? { passed: true, failures: [] }
      : runQualityGate(rendered, userText);

    if (gate.passed) {
      return {
        operator_id: selection.operator,
        variation: selection.variation,
        fragments: rendered.fragments,
        reed_question: rendered.reed_question,
        full_text: rendered.full_text,
        is_fallback: selection.is_fallback,
        latency_ms: nowMs() - t0,
        locale,
        pill_id: inputs.pill_id,
        debug: {
          rejected: selection.rejected,
          detection_metadata: selection.detection.metadata,
        },
      };
    }
    // Quality gate falhou — desce para fallback canônico (§5.4).
    selection.rejected.push({
      operator: selection.operator,
      reason: `quality gate: ${gate.failures.join('; ')}`,
    });
  }

  // Fallback canônico.
  const fb = renderFallbackPtBr(inputs.pill_id);
  return {
    operator_id: 'OP01',
    variation: 'V0' as Variation,
    fragments: [],
    reed_question: fb.reed_question,
    full_text: fb.lines.join('\n'),
    is_fallback: true,
    latency_ms: nowMs() - t0,
    locale,
    pill_id: inputs.pill_id,
    debug: {
      rejected: selection?.rejected ?? [],
    },
  };
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
