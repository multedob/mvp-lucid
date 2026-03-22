// ============================================================
// ipe_types.ts — Contratos TypeScript do Subsistema IPE
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.0, §3.3
// Structural Model Version: 3.0
// Invariante: nenhum campo aqui sem existir no schema SQL
// Depende de: 20260321000000_ipe_schema.sql
// ============================================================

// ─────────────────────────────────────────
// 1. ENUMS E UNIONS CANÔNICOS
// ─────────────────────────────────────────

export type PillId = 'PI' | 'PII' | 'PIII' | 'PIV' | 'PV' | 'PVI';

export type IpeCycleStatus = 'pills' | 'questionnaire' | 'complete' | 'abandoned';

export type QuestionnaireStatus = 'planned' | 'in_progress' | 'complete' | 'abandoned';

export type ConfiancaGlobal = 'alta' | 'média' | 'baixa';

export type ILStatus = 'válido' | 'insuficiente' | 'aberto';

// Valores IL válidos — SCORING_SPEC v1.3
// Nota: TypeScript não distingue representação decimal (1.0 === 1).
// Esta union documenta a intenção mas não garante enforcement em runtime.
// Validação real ocorre no scoring (edge function) antes de persistir.
export type ILValue = 1.0 | 2.0 | 3.5 | 4.5 | 5.5 | 6.5 | 7.5 | 8.0 | null;

// Linhas canônicas
export type LineId =
  | 'L1.1' | 'L1.2' | 'L1.3' | 'L1.4'
  | 'L2.1' | 'L2.2' | 'L2.3' | 'L2.4'
  | 'L3.1' | 'L3.2' | 'L3.3' | 'L3.4'
  | 'L4.1' | 'L4.2' | 'L4.3' | 'L4.4';

// Momento da Pill
export type PillMoment = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

// ─────────────────────────────────────────
// 2. TABELAS DO BANCO (row types)
// ─────────────────────────────────────────

// 2.1 ipe_cycles
export interface IpeCycle {
  id: string;
  user_id: string;
  cycle_number: number;
  status: IpeCycleStatus;
  pills_completed: PillId[];
  started_at: string;
  completed_at: string | null;
  prompt_version: string | null;
}

// 2.2 pill_responses
// m2_cal_signals: sinais CAL da Pill (localização, custo, foco, horizonte)
export interface M2CalSignals {
  localizacao: string | null;
  custo: string | null;
  foco: string | null;
  horizonte: string | null;
}

export interface PillResponse {
  id: string;
  ipe_cycle_id: string;
  pill_id: PillId;
  m1_tempo_segundos: number | null;
  m2_resposta: string | null;
  m2_cal_signals: M2CalSignals | null;
  m3_respostas: Record<string, string> | null; // {pergunta_id: resposta}
  m4_resposta: string | null;
  eco_text: string | null;  // M5: persistido para retomada de sessão (P3 do PIPELINE)
  completed_at: string | null;
}

// 2.3 pill_scoring
// Fonte: SCORING_SPEC v1.3, §4 — output do scoring Momento 1
export interface LinhaCorpus {
  IL_sinal: ILValue;
  FD: number;                                          // 0.0–1.0
  GCC_por_corte: Record<string, 'alto' | 'baixo'>;    // {'2↔4': ..., '4↔6': ..., '6↔8': ...}
  faixa_estimada: 'A' | 'B' | 'C' | 'D' | null;
  status_sinal: 'válido' | 'insuficiente' | 'parse_failure';
}

export interface SinaisL24 {
  revisao: string[];
  locus: string[];
  tensao: string[];
  qualidade_M4: string | null;
}

export interface PillScoring {
  id: string;
  ipe_cycle_id: string;
  pill_id: PillId;
  corpus_linhas: Record<LineId, LinhaCorpus> | null;
  corpus_transversal: Partial<Record<LineId, string>> | null;
  sinais_l24: SinaisL24 | null;
  scoring_model: string | null;
  scoring_version: string | null;
  scored_at: string | null;
}

// 2.4 questionnaire_state
export interface ExecutionPlan {
  blocos_ativos: LineId[];
  blocos_skip: LineId[];
  motivos: Record<LineId, string>;
  orcamento_global_inicial: number;
  orcamento_d3_inicial: number;
}

export interface QuestionnaireFlags {
  late_activation_l1_3?: boolean;
  degradacao_pc3?: LineId[];
  fadiga_extrema?: boolean;
  [key: string]: unknown;
}

export interface ResultadoBloco {
  il_canonico: ILValue;
  confianca: ConfiancaGlobal;
  variante_usada: string | null;
  protecao_etica: boolean;
  scoring_version: string | null;
}

export interface QuestionnaireState {
  id: string;
  ipe_cycle_id: string;
  execution_plan: ExecutionPlan | null;
  current_position: number;
  orcamento_global_restante: number | null;
  orcamento_d3_restante: number | null;
  contador_d3_blocos: number;
  resultados_por_bloco: Partial<Record<LineId, ResultadoBloco>>;
  flags: QuestionnaireFlags;
  status: QuestionnaireStatus;
  last_block_completed: LineId | null;
  updated_at: string;
}

// 2.5 block_responses
export interface BlockResponse {
  id: string;
  ipe_cycle_id: string;
  block_id: LineId;
  position: number;
  principal_resposta: string | null;
  variante_servida: string | null;
  variante_resposta: string | null;
  protecao_etica: boolean;
  tempo_resposta_segundos: number | null;
  answered_at: string;
}

// 2.6 canonical_ils
// Interface central: output do IPE → input do engine HAGO
export interface CanonicalILs {
  id: string;
  ipe_cycle_id: string;
  // 16 ILs — null quando linha não foi scorada
  l1_1: ILValue; l1_2: ILValue; l1_3: ILValue; l1_4: ILValue;
  l2_1: ILValue; l2_2: ILValue; l2_3: ILValue; l2_4: ILValue;
  l3_1: ILValue; l3_2: ILValue; l3_3: ILValue; l3_4: ILValue;
  l4_1: ILValue; l4_2: ILValue; l4_3: ILValue; l4_4: ILValue;
  // Status por linha
  il_status: Partial<Record<LineId, ILStatus>>;
  // Dimensões (médias das 4 linhas)
  d1: number | null;
  d2: number | null;
  d3: number | null;
  d4: number | null;
  // Confiança
  confianca_global: ConfiancaGlobal | null;
  confianca_por_linha: Partial<Record<LineId, ConfiancaGlobal>>;
  flags: Record<string, unknown>;
  // Revisão humana
  revisao_necessaria: boolean;
  revisao_motivo: string | null;
  revisado_por: string | null;
  revisado_at: string | null;
  produced_at: string;
}

// 2.7 prompt_versions
export interface PromptVersion {
  id: string;
  component: string;
  version: string;
  prompt_text: string;
  active: boolean;
  created_at: string;
  deprecated_at: string | null;
}

// 2.8 scoring_audit
export interface ScoringAudit {
  id: string;
  ipe_cycle_id: string | null;
  component: string;
  prompt_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  raw_output: string | null;
  parsed_output: unknown | null;
  parse_success: boolean;
  retry_count: number;
  model: string | null;
  scored_at: string;
}

// ─────────────────────────────────────────
// 3. INSERT TYPES (sem id/timestamps auto)
// ─────────────────────────────────────────

export type IpeCycleInsert = Omit<IpeCycle, 'id' | 'started_at' | 'completed_at'>;

export type PillResponseInsert = Omit<PillResponse, 'id'>;

export type PillScoringInsert = Omit<PillScoring, 'id'>;

export type QuestionnaireStateInsert = Omit<QuestionnaireState, 'id' | 'updated_at'>;

export type BlockResponseInsert = Omit<BlockResponse, 'id' | 'answered_at'>;

export type CanonicalILsInsert = Omit<CanonicalILs, 'id' | 'produced_at'>;

export type PromptVersionInsert = Omit<PromptVersion, 'id' | 'created_at'>;

export type ScoringAuditInsert = Omit<ScoringAudit, 'id' | 'scored_at'>;

// ─────────────────────────────────────────
// 4. CONTRATOS DE EDGE FUNCTIONS
// ─────────────────────────────────────────

// 4.1 ipe-pill-session — orquestra M1→M4 de uma Pill
export interface PillSessionInput {
  ipe_cycle_id: string;
  pill_id: PillId;
  moment: PillMoment;
  payload: PillMomentPayload;
}

// PillSessionInput.moment é o discriminador top-level.
// PillMomentPayload contém apenas os dados do momento — sem repetir o campo moment.
export type PillMomentPayload =
  | { tempo_segundos: number }                               // M1
  | { resposta: string; cal_signals: M2CalSignals }          // M2
  | { respostas: Record<string, string> }                    // M3
  | { resposta: string }                                     // M4
  | Record<string, never>;                                   // M5 — sem payload

export interface PillSessionOutput {
  pill_response_id: string;
  next_moment: PillMoment | null; // null = Pill completa
  scoring_triggered: boolean;     // true após M4
}

// 4.2 ipe-scoring — scoring Momento 1 (corpus Pill → ILs)
export interface PillScoringInput {
  ipe_cycle_id: string;
  pill_id: PillId;
}

export interface PillScoringOutput {
  pill_scoring_id: string;
  corpus_linhas: Record<LineId, LinhaCorpus>;
  fd_campo_medio: number;         // média de FD das linhas cobertas
  linhas_validas: number;         // contagem de linhas com status_sinal = 'válido'
}

// 4.3 ipe-questionnaire-engine
// POST /plan
export interface QuestionnairePlanInput {
  ipe_cycle_id: string;
}

export interface QuestionnairePlanOutput {
  questionnaire_state_id: string;
  execution_plan: ExecutionPlan;
  blocos_ativos_count: number;
}

// POST /next-block
export interface NextBlockInput {
  ipe_cycle_id: string;
  // Reutiliza BlockResponseInsert sem ipe_cycle_id (já está no campo acima)
  block_response?: Omit<BlockResponseInsert, 'ipe_cycle_id'>;
}

export interface NextBlockOutput {
  done: boolean;
  next_block: LineId | null;
  variante_a_servir: string | null;
  dimension_transition: string | null;   // ex: 'D1→D2'
  questionnaire_state_id: string;
}

// 4.4 ipe-scoring-block — scoring Momento 2
export interface BlockScoringInput {
  ipe_cycle_id: string;
  block_id: LineId;
  principal_resposta: string | null;
  variante_resposta: string | null;
  protecao_etica: boolean;
}

export interface BlockScoringOutput {
  block_id: LineId;
  il_canonico: ILValue;
  confianca: ConfiancaGlobal;
  scoring_audit_id: string;
}

// 4.5 ipe-eco — geração do Eco M5
export interface EcoInput {
  ipe_cycle_id: string;
  pill_id: PillId;
}

export interface EcoOutput {
  eco_text: string;
  scoring_audit_id: string;
}

// ─────────────────────────────────────────
// 5. INTERFACE IPE → ENGINE HAGO
// Fonte: PIPELINE §8.1 + lucid-engine/types.ts RadarInput
// ─────────────────────────────────────────

// Input esperado pela lucid-engine edge function
export interface LuceRawInput {
  d1: [number, number, number, number];
  d2: [number, number, number, number];
  d3: [number, number, number, number];
  d4: [number, number, number, number];
  user_text: string;
}

// Conversão CanonicalILs → LuceRawInput
// Fonte: PIPELINE §5.3 + §8.1
// Comportamento:
//   - Linhas null dentro de uma dimensão → substituídas pela média da dimensão
//   - Dimensão com ZERO ILs válidos → substituída pela média global de todas as dimensões
//   - Todas as 4 dimensões com ZERO ILs válidos → retorna null (não pode iniciar Luce)
// Nota (R2.6): FD médio para gate IPE1→IPE2 é calculado em shouldRunIPE2 e também
// retornado por ipe-scoring. Manter lógica centralizada em shouldRunIPE2.
export function computeLuceInput(
  ils: CanonicalILs,
  user_text: string
): LuceRawInput | null {
  const toValues = (a: ILValue, b: ILValue, c: ILValue, d: ILValue): number[] =>
    [a, b, c, d].filter((v): v is number => v !== null);

  const d1vals = toValues(ils.l1_1, ils.l1_2, ils.l1_3, ils.l1_4);
  const d2vals = toValues(ils.l2_1, ils.l2_2, ils.l2_3, ils.l2_4);
  const d3vals = toValues(ils.l3_1, ils.l3_2, ils.l3_3, ils.l3_4);
  const d4vals = toValues(ils.l4_1, ils.l4_2, ils.l4_3, ils.l4_4);

  const allVals = [...d1vals, ...d2vals, ...d3vals, ...d4vals];
  if (allVals.length === 0) return null; // zero ILs válidos no ciclo inteiro

  const globalAvg = allVals.reduce((s, v) => s + v, 0) / allVals.length;

  const avg = (vals: number[]): number =>
    vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : globalAvg;

  const toQuad = (
    a: ILValue, b: ILValue, c: ILValue, d: ILValue,
    dimVals: number[]
  ): [number, number, number, number] => {
    const dimAvg = avg(dimVals);
    return [a ?? dimAvg, b ?? dimAvg, c ?? dimAvg, d ?? dimAvg] as [number, number, number, number];
  };

  return {
    d1: toQuad(ils.l1_1, ils.l1_2, ils.l1_3, ils.l1_4, d1vals),
    d2: toQuad(ils.l2_1, ils.l2_2, ils.l2_3, ils.l2_4, d2vals),
    d3: toQuad(ils.l3_1, ils.l3_2, ils.l3_3, ils.l3_4, d3vals),
    d4: toQuad(ils.l4_1, ils.l4_2, ils.l4_3, ils.l4_4, d4vals),
    user_text,
  };
}

// ─────────────────────────────────────────
// 6. CRITÉRIO AUTOMÁTICO DE REVISÃO HUMANA
// Fonte: PIPELINE §8.2
// ─────────────────────────────────────────

export interface RevisaoFlags {
  confianca_baixa: boolean;
  outlier_il: boolean;        // qualquer IL médio < 1.5 ou > 7.8
  fadiga_extrema: boolean;    // >25 perguntas no Questionário
  parse_failures: boolean;    // >20% das chamadas do ciclo com parse_success=false
}

export function computeRevisaoFlags(
  ils: CanonicalILs,
  totalPerguntas: number,
  parseFailureRate: number
): RevisaoFlags {
  const dimensoes = [ils.d1, ils.d2, ils.d3, ils.d4].filter(
    (d): d is number => d !== null
  );
  const outlier = dimensoes.some((d) => d < 1.5 || d > 7.8);

  return {
    confianca_baixa:  ils.confianca_global === 'baixa',
    outlier_il:       outlier,
    fadiga_extrema:   totalPerguntas > 25,
    parse_failures:   parseFailureRate > 0.20,
  };
}

// ─────────────────────────────────────────
// 7. DETERMINAÇÃO IPE1 vs IPE2
// Fonte: Gate F4.5, Decisão 2
// Critério: FD_campo médio ≥ 0.50 E ≥ 10 linhas com IL_status = 'válido'
// ─────────────────────────────────────────

export function shouldRunIPE2(scoring: PillScoring[]): boolean {
  if (scoring.length === 0) return false;

  // NOTA (R2.4): corpus_linhas vem do banco como JSONB → objeto JS genérico.
  // lineId as LineId é um cast em runtime sem garantia de type safety.
  // A edge function deve validar o schema do JSONB antes de chamar esta função.
  const allFDs: number[] = [];
  for (const ps of scoring) {
    if (!ps.corpus_linhas) continue;
    for (const linha of Object.values(ps.corpus_linhas)) {
      allFDs.push(linha.FD);
    }
  }

  const fdMedio = allFDs.length > 0
    ? allFDs.reduce((s, v) => s + v, 0) / allFDs.length
    : 0;

  // Linhas com IL válido: agrega por LineId (evita dupla contagem cross-Pills)
  const linhasValidas = new Set<LineId>();
  for (const ps of scoring) {
    if (!ps.corpus_linhas) continue;
    for (const [lineId, linha] of Object.entries(ps.corpus_linhas)) {
      if (linha.status_sinal === 'válido') {
        linhasValidas.add(lineId as LineId);
      }
    }
  }

  return fdMedio >= 0.50 && linhasValidas.size >= 10;
}
