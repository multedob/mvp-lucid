// supabase/functions/_shared/eco/types.ts
// Porta Deno da biblioteca Eco (origem: src/lib/eco/types.ts).
// Contratos do engine de Eco (M5 das Pills).
// Spec: ECO_OPERATOR_SPEC v1.1 + ECO_OPERATOR_I18N_APPENDIX_PT-BR v1.0.

// ─── Enums do domínio ───────────────────────────────────────────────

export type PillId = 'PI' | 'PII' | 'PIII' | 'PIV' | 'PV' | 'PVI';

export type OperatorId = 'OP01' | 'OP02' | 'OP03' | 'OP04' | 'OP05' | 'OP06';

/** V0 = base canônica; V1/V2/V3 = variações rotacionadas. */
export type Variation = 'V0' | 'V1' | 'V2' | 'V3';

export type Locale = 'pt-BR';

// ─── Inputs da Pill ─────────────────────────────────────────────────

export interface EcoInputs {
  pill_id: PillId;
  m2?: string | null;
  m3_1_situacao_oposta?: string | null;
  m3_2_opcao?: 'A' | 'B' | 'C' | 'D' | null;
  m3_2_abre_mao?: string | null;
  m3_2_option_label?: string | null;
  m3_3_narrativa?: string | null;
  m3_3_condicao?: string | null;
  m4?: string | null;
}

// ─── Contexto do usuário para anti-repetição e rotação ──────────────

export interface OperatorContext {
  previous_operator_in_cycle?: OperatorId | null;
  recent_variations_by_operator?: Partial<Record<OperatorId, Variation[]>>;
}

// ─── Resultado da detecção de um operador ───────────────────────────

export interface DetectionResult {
  triggered: boolean;
  fragments?: string[];
  metadata?: Record<string, unknown>;
  confidence?: number;
  rejection_reason?: string | null;
}

// ─── Interface canônica de um operador ──────────────────────────────

export interface Operator {
  id: OperatorId;
  detect(inputs: EcoInputs, locale: Locale): DetectionResult;
}

// ─── Payload renderizado ────────────────────────────────────────────

export interface EcoPayload {
  operator_id: OperatorId;
  variation: Variation;
  fragments: string[];
  reed_question: string;
  full_text: string;
  is_fallback: boolean;
  latency_ms: number;
  locale: Locale;
  pill_id: PillId;
  debug?: {
    rejected: Array<{ operator: OperatorId; reason: string }>;
    detection_metadata?: Record<string, unknown>;
  };
}

// ─── Templates localizados ──────────────────────────────────────────

export interface EcoTemplate {
  operator_id: OperatorId;
  variation: Variation;
  lines: string[];
  reed_question: string;
}

// ─── Guards ────────────────────────────────────────────────────────

export const ALL_PILL_IDS: readonly PillId[] = [
  'PI', 'PII', 'PIII', 'PIV', 'PV', 'PVI',
] as const;

export const ALL_OPERATOR_IDS: readonly OperatorId[] = [
  'OP01', 'OP02', 'OP03', 'OP04', 'OP05', 'OP06',
] as const;

export const ALL_VARIATIONS: readonly Variation[] = [
  'V0', 'V1', 'V2', 'V3',
] as const;
