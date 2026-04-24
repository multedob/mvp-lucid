// supabase/functions/_shared/eco/selector.ts
// Seleciona o operador vencedor e a variação a renderizar.
// Spec §5. Ordem de prioridade (Fase 1 — só determinísticos):
//   1. OP03 Repetition (cheap, deterministic, high hit rate)
//   2. OP04 Weight (cheap, deterministic)
//   3. OP01 Cost (fallback sempre disponível)
// OP02/OP05/OP06 entram na Fase 2 (condicional pós-Checkpoint C-1).
//
// Regras aplicadas:
//   §5.2 Anti-repetição entre Pills (mesmo ciclo, mesmo usuário).
//   §5.3 Rotação de variações V0/V1/V2/V3 por (user, operator).

import type {
  DetectionResult,
  EcoInputs,
  Locale,
  Operator,
  OperatorContext,
  OperatorId,
  Variation,
} from './types.ts';
import { ALL_VARIATIONS } from './types.ts';
import { OP01_Cost } from './operators/op01-cost.ts';
import { OP03_Repetition } from './operators/op03-repetition.ts';
import { OP04_Weight } from './operators/op04-weight.ts';
import { TEMPLATES_PT_BR } from './locale/pt-br/templates.ts';

// ─── Ordem canônica (Fase 1) ─────────────────────────────────────

const PRIORITY_ORDER_FASE_1: Operator[] = [
  OP03_Repetition,
  OP04_Weight,
  OP01_Cost,
];

// ─── Resultado da seleção ────────────────────────────────────────

export interface SelectionResult {
  operator: OperatorId;
  variation: Variation;
  detection: DetectionResult;
  is_fallback: boolean;
  /** Operadores avaliados e rejeitados (para telemetria/debug). */
  rejected: Array<{ operator: OperatorId; reason: string }>;
}

// ─── Motor de seleção ────────────────────────────────────────────

export function selectOperator(
  inputs: EcoInputs,
  context: OperatorContext,
  locale: Locale = 'pt-BR',
): SelectionResult | null {
  const rejected: Array<{ operator: OperatorId; reason: string }> = [];

  for (const op of PRIORITY_ORDER_FASE_1) {
    // §5.2 anti-repetição — pular operador usado na Pill anterior do ciclo.
    // Exceção: OP01 pode repetir (é a rede de segurança).
    if (
      op.id !== 'OP01' &&
      context.previous_operator_in_cycle === op.id
    ) {
      rejected.push({ operator: op.id, reason: 'used in previous pill (§5.2)' });
      continue;
    }

    const detection = op.detect(inputs, locale);
    if (!detection.triggered) {
      rejected.push({
        operator: op.id,
        reason: detection.rejection_reason ?? 'not triggered',
      });
      continue;
    }

    const variation = pickVariation(op.id, detection, context);

    return {
      operator: op.id,
      variation,
      detection,
      is_fallback: op.id === 'OP01' && rejected.length > 0,
      rejected,
    };
  }

  return null;
}

// ─── Rotação de variações (§5.3) ─────────────────────────────────

/**
 * Regras por operador:
 *  - OP01: V2 se abre_mao abstrato; senão rotaciona V0→V1→V2.
 *  - OP03: rotaciona V0→V1→V2→V3 respeitando regra §3.7 (não repetir imediata).
 *  - OP04: V1 se marcador dominante é "talvez"; V3 se é "acho"; V0 se "não sei";
 *          V2 se não houver dominante claro. Respeita não-repetição.
 */
export function pickVariation(
  operator_id: OperatorId,
  detection: DetectionResult,
  context: OperatorContext,
): Variation {
  const recent =
    context.recent_variations_by_operator?.[operator_id] ?? [];
  const lastUsed = recent[0];

  const availableForOp = Object.keys(
    TEMPLATES_PT_BR[operator_id as keyof typeof TEMPLATES_PT_BR] ?? {},
  ) as Variation[];

  if (operator_id === 'OP01') {
    const md = detection.metadata ?? {};
    const preferred: Variation = md.is_abstract ? 'V2' : 'V0';
    return pickAvoidingLast(availableForOp, [preferred, 'V0', 'V1', 'V2'], lastUsed);
  }

  if (operator_id === 'OP04') {
    const md = detection.metadata ?? {};
    const dominant = String(md.dominant_marker ?? '');
    let preferred: Variation = 'V0';
    if (dominant.includes('talvez')) preferred = 'V1';
    else if (dominant === 'acho' || dominant === 'eu acho' || dominant === 'acho que') preferred = 'V3';
    else if (dominant === 'não sei' || dominant === 'nao sei') preferred = 'V0';
    else preferred = 'V2';
    return pickAvoidingLast(availableForOp, [preferred, 'V0', 'V1', 'V2', 'V3'], lastUsed);
  }

  if (operator_id === 'OP03') {
    // Rotação pura entre V0/V1/V2/V3.
    return pickAvoidingLast(availableForOp, ['V0', 'V1', 'V2', 'V3'], lastUsed);
  }

  // Default seguro.
  return pickAvoidingLast(availableForOp, [...ALL_VARIATIONS], lastUsed);
}

/**
 * Dado uma lista ordenada de preferências, retorna a primeira que:
 *  - existe no template (`available`);
 *  - NÃO é a última usada.
 * Se todas forem a última usada, retorna a primeira disponível.
 */
function pickAvoidingLast(
  available: Variation[],
  preferenceOrder: Variation[],
  lastUsed?: Variation,
): Variation {
  for (const v of preferenceOrder) {
    if (available.includes(v) && v !== lastUsed) return v;
  }
  // fallback: pega qualquer disponível
  return available[0] ?? 'V0';
}
