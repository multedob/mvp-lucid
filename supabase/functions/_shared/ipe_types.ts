// ============================================================
// ipe_types.ts — Contratos TypeScript do Subsistema IPE
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.0, §3.3
//        PILL_I/II/III/IV/V/VI_Prototipo v0.3
//        SCORING_SPEC v1.3 | MAPA_COBERTURA_LINHAS v2.4
// Structural Model Version: 3.0
// Invariante: nenhum campo aqui sem existir no schema SQL
// Depende de: 20260321000000_ipe_schema.sql + 20260321000001_ipe_m4_jsonb.sql
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
// 2. SCHEMAS M3 E M4 POR PILL
// Fonte: PILL_I–VI_Prototipo v0.3 — Camada B de cada pergunta
// Estes tipos governam o que a UI persiste e o que o scorer recebe.
// ─────────────────────────────────────────

// M3 — subtipos compartilhados
export interface M3Regua {
  posicao: string;           // ex: 'ajusto'|'neutro'|'sustento' (PI/PII/PIII/PV/PVI)
                             //     'para_dentro'|'para_fora' + gradações (PIV)
  duas_palavras: string;
  situacao_oposta: string;
}

export interface M3Escolha {
  opcao: 'A' | 'B' | 'C' | 'D';
  abre_mao: string;
  followup_C: string | null;   // apenas se opcao = C
  followup_D: string | null;   // apenas se opcao = D
}

// M3_3 inventario — base comum
interface M3InventarioBase {
  narrativa: string;
  condicao: string;
  cobertura_L1_3: string;    // pergunta transversal fixa: "Como sabia que era suficientemente bom?"
                              // null em PVI (Opção A: PVI tem cobertura primária de L1.3)
}

// Inventários Pill-específicos (subchaves adicionais)
export interface M3InventarioPI  extends M3InventarioBase {}

export interface M3InventarioPII extends M3InventarioBase {
  cobertura_L1_4: string;    // PII-específico: L1.4 primária em PII
}

export interface M3InventarioPIII extends M3InventarioBase {
  cobertura_L2_2: string;    // PIII-específico: L2.2 — o que a distância permite ver
}

export interface M3InventarioPIV extends M3InventarioBase {}

export interface M3InventarioPV extends M3InventarioBase {
  cobertura_L4_3: string;    // PV-específico: âncora L4.3 — como o conhecimento funcionou
}

export interface M3InventarioPVI {
  narrativa: string;
  condicao: string;
  cobertura_L1_3: null;      // null em PVI (Opção A)
  cobertura_L1_3_pvi: string; // PVI-específico: padrão de suficiência no que está construindo
  cobertura_L1_4: string;    // PVI-específico: o que o processo de construir mudou no modo de operar
}

// M3 completo por Pill
export interface M3ByPill {
  PI:   { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPI };
  PII:  { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPII };
  PIII: { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPIII };
  PIV:  { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPIV };
  PV:   { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPV };
  PVI:  { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPVI };
}

// M4 — base comum
interface M4Base {
  percepcao: string;           // todas as Pills — "O que você percebeu sobre si mesmo?"
}

// M4 Pill-específicos
// Fonte: PILL_I_Prototipo v0.3 — presenca_deslocamento = corpus primário L4.4 (Opção A)
export interface M4PI extends M4Base {
  presenca_deslocamento: string; // "Quando não sabe quem é no lugar, o que muda em como fica presente?"
                                  // → corpus primário de L4.4 em PI
}

// PII/PIII/PIV/PVI: presenca_para_outros = corpus_transversal["L4.4"]
export interface M4ComTransversal extends M4Base {
  presenca_para_outros: string; // "O que o seu estado diz sobre como costuma estar presente para outros?"
                                 // → corpus_transversal["L4.4"]
}

// PV: tem L4.3 primário em M4 + L4.4 transversal
// Fonte: PILL_V_Prototipo v0.3 — "M4 entra em corpus_linhas de L4.3"
export interface M4PV extends M4Base {
  conhecimento_em_campo: string; // PV-específico → corpus primário de L4.3
  presenca_para_outros: string;  // → corpus_transversal["L4.4"]
}

// Union de todos os M4
export type M4 = M4PI | M4ComTransversal | M4PV;

// Helper: tipo M4 por PillId
export type M4ByPill = {
  PI:   M4PI;
  PII:  M4ComTransversal;
  PIII: M4ComTransversal;
  PIV:  M4ComTransversal;
  PV:   M4PV;
  PVI:  M4ComTransversal;
};

// ─────────────────────────────────────────
// 3. TABELAS DO BANCO (row types)
// ─────────────────────────────────────────

// 3.1 ipe_cycles
export interface IpeCycle {
  id: string;
  user_id: string;
  cycle_number: number;
  status: IpeCycleStatus;
  pills_completed: PillId[];
  // Valores válidos: 'PI'|'PII'|'PIII'|'PIV'|'PV'|'PVI'
  // Validação ocorre na edge function (CHECK em array TEXT[] exige função no Postgres)
  started_at: string;
  completed_at: string | null;
  prompt_version: string | null;
}

// 3.2 pill_responses
export interface M2CalSignals {
  localizacao: string | null;
  custo:       string | null;
  foco:        string | null;
  horizonte:   string | null;
}

export interface PillResponse {
  id: string;
  ipe_cycle_id: string;
  pill_id: PillId;
  m1_tempo_segundos: number | null;
  m2_resposta: string | null;
  m2_cal_signals: M2CalSignals | null;
  m3_respostas: Record<string, unknown> | null;
  // Estrutura: { M3_1_regua: M3Regua, M3_2_escolha: M3Escolha, M3_3_inventario: M3InventarioXX }
  // Chaves e subchaves variam por Pill — ver M3ByPill acima
  m4_resposta: M4 | null;
  // JSONB: { percepcao, [pill_specific_field] } — ver M4ByPill acima
  // NOTA AFC-PENDING C1/C4: eco_text não consta em PIPELINE v1.0 §3.1.
  // Adição justificada por P3 (estado server-side) — necessário para retomada de sessão M5
  // sem rechamar ipe-eco. AFC formal pendente de registro no PIPELINE antes de Fase 3.
  eco_text: string | null;
  completed_at: string | null;
}

// 3.3 pill_scoring
// Fonte: SCORING_SPEC v1.3, §4 — output do scoring Momento 1
export interface LinhaCorpus {
  IL_sinal: {
    numerico: ILValue;
    faixa: 'A' | 'B' | 'C' | 'D' | 'indeterminada';
    faixa_parcial: boolean;
    cortes: {
      '2_4': { decisao: 'SIM' | 'NÃO' | 'INDETERMINADO'; gcc: string; evidencia: string };
      '4_6': { decisao: 'SIM' | 'NÃO' | 'INDETERMINADO'; gcc: string; evidencia: string };
      '6_8': { decisao: 'SIM' | 'NÃO' | 'INDETERMINADO'; gcc: string; evidencia: string };
    };
    confianca_IL: 'alta' | 'media' | 'baixa' | 'nao_aplicavel';
    tipo: 'sinal';
  };
  FD_linha: number;           // 0.0–1.0
  status_sinal: 'completo' | 'incompleto';
  corpus_linhas: ('M3' | 'M4')[];
  flags: Record<string, boolean>;
}

export interface SinaisL24 {
  pills_contribuintes: PillId[];
  SINAL_L24_revisao: {
    detectado: boolean;
    de: string | null;
    para: string | null;
    movimento: 'ampliacao' | 'restricao' | 'contradicao' | null;
  };
  SINAL_L24_locus: {
    por_pill: Partial<Record<PillId, { interno: number; externo: number; misto: number }>>;
    agregado: { interno: number; externo: number; misto: number };
  };
  SINAL_L24_tensao: {
    detectado: boolean;
    natureza: 'entre_posicoes' | 'entre_posicao_e_acao' | 'entre_valores' | null;
  };
  qualidade_M4: {
    nivel: 'comportamento' | 'padrao' | 'estrutura_tensao';
    texto_verbatim: string | null;
  };
}

export interface PillScoring {
  id: string;
  ipe_cycle_id: string;
  pill_id: PillId;
  corpus_linhas: Partial<Record<LineId, LinhaCorpus>> | null;
  // NOTA (R2.4): corpus_linhas vem do banco como JSONB → objeto JS genérico.
  // lineId as LineId é um cast em runtime sem garantia de type safety.
  // A edge function deve validar o schema do JSONB antes de chamar funções que dependem dele.
  corpus_transversal: Partial<Record<LineId, {
    texto: string;
    FD: number;
    IPE: number;
    qualidade?: string;
  }>> | null;
  sinais_l24: SinaisL24 | null;
  scoring_model: string | null;
  scoring_version: string | null;
  scored_at: string | null;
}

// 3.4 questionnaire_state
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
  // RISCO: questionnaire_state.status e ipe_cycles.status devem ser atualizados
  // atomicamente pela edge function. Não há trigger garantindo sincronia.
  // Protocolo: sempre atualizar ipe_cycles.status APÓS questionnaire_state.status = 'complete'.
  last_block_completed: LineId | null;
  updated_at: string;
}

// 3.5 block_responses
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

// 3.6 canonical_ils
// Interface central: output do IPE → input do engine HAGO
export interface CanonicalILs {
  id: string;
  ipe_cycle_id: string;
  // 16 ILs — null quando linha não foi scorada
  l1_1: ILValue; l1_2: ILValue; l1_3: ILValue; l1_4: ILValue;
  l2_1: ILValue; l2_2: ILValue; l2_3: ILValue; l2_4: ILValue;
  l3_1: ILValue; l3_2: ILValue; l3_3: ILValue; l3_4: ILValue;
  l4_1: ILValue; l4_2: ILValue; l4_3: ILValue; l4_4: ILValue;
  il_status: Partial<Record<LineId, ILStatus>>;
  d1: number | null;
  d2: number | null;
  d3: number | null;
  d4: number | null;
  confianca_global: ConfiancaGlobal | null;
  confianca_por_linha: Partial<Record<LineId, ConfiancaGlobal>>;
  flags: Record<string, unknown>;
  revisao_necessaria: boolean;
  revisao_motivo: string | null;
  revisado_por: string | null;
  revisado_at: string | null;
  produced_at: string;
}

// 3.7 prompt_versions
export interface PromptVersion {
  id: string;
  component: string;
  version: string;
  prompt_text: string;
  active: boolean;
  created_at: string;
  deprecated_at: string | null;
}

// 3.8 scoring_audit
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
// 4. INSERT TYPES (sem id/timestamps auto)
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
// 5. CONTRATOS DE EDGE FUNCTIONS
// ─────────────────────────────────────────

// 5.1 ipe-pill-session — orquestra M1→M5 por Pill
export interface PillSessionInput {
  ipe_cycle_id: string;
  pill_id: PillId;
  moment: PillMoment;
  // PillMomentPayload contém apenas os dados do momento.
  // PillSessionInput.moment é o discriminador top-level — sem repetição no payload.
  payload: PillMomentPayload;
}

export type PillMomentPayload =
  | { tempo_segundos: number }                                       // M1
  | { resposta: string; cal_signals: M2CalSignals }                  // M2
  | { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: Record<string, unknown> }  // M3
  | { m4: M4 }                                                       // M4
  | Record<string, never>;                                           // M5 — sem payload

export interface PillSessionOutput {
  pill_response_id: string;
  next_moment: PillMoment | null; // null = Pill completa
  scoring_triggered: boolean;     // true após M4 — UI deve aguardar eco antes de M5
}

// 5.2 ipe-scoring — scoring Momento 1 (corpus Pill → ILs via Claude)
export interface PillScoringInput {
  ipe_cycle_id: string;
  pill_id: PillId;
}

export interface PillScoringOutput {
  pill_scoring_id: string;
  corpus_linhas: Partial<Record<LineId, LinhaCorpus>>;
  fd_campo_medio: number;     // média FD das linhas cobertas — fonte única para gate IPE1→IPE2
  linhas_validas: number;     // linhas com status_sinal = 'completo'
  parse_success: boolean;
  scoring_version: string;
}

// 5.3 ipe-questionnaire-engine
export interface QuestionnairePlanInput {
  ipe_cycle_id: string;
}

export interface QuestionnairePlanOutput {
  questionnaire_state_id: string;
  execution_plan: ExecutionPlan;
  blocos_ativos_count: number;
}

export interface NextBlockInput {
  ipe_cycle_id: string;
  // Reutiliza BlockResponseInsert sem ipe_cycle_id (já está no campo acima)
  block_response?: Omit<BlockResponseInsert, 'ipe_cycle_id'>;
}

export interface NextBlockOutput {
  done: boolean;
  next_block: LineId | null;
  variante_a_servir: string | null;
  dimension_transition: string | null; // ex: 'D1→D2'
  questionnaire_state_id: string;
}

// 5.4 ipe-scoring-block — scoring Momento 2
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

// 5.5 ipe-eco — geração do Eco M5
export interface EcoInput {
  ipe_cycle_id: string;
  pill_id: PillId;
}

export interface EcoOutput {
  eco_text: string;
  scoring_audit_id: string;
}

// ─────────────────────────────────────────
// 6. VALIDAÇÃO M3/M4 POR PILL (runtime)
// Fonte: PILL_I–VI_Prototipo v0.3
// ─────────────────────────────────────────

// Chaves obrigatórias de M3_3_inventario por Pill
export const M3_INVENTARIO_REQUIRED_KEYS: Record<PillId, string[]> = {
  PI:   ['narrativa', 'condicao', 'cobertura_L1_3'],
  PII:  ['narrativa', 'condicao', 'cobertura_L1_3', 'cobertura_L1_4'],
  PIII: ['narrativa', 'condicao', 'cobertura_L1_3', 'cobertura_L2_2'],
  PIV:  ['narrativa', 'condicao', 'cobertura_L1_3'],
  PV:   ['narrativa', 'condicao', 'cobertura_L1_3', 'cobertura_L4_3'],
  PVI:  ['narrativa', 'condicao', 'cobertura_L1_3_pvi', 'cobertura_L1_4'],
  // Nota: PVI tem cobertura_L1_3 = null (Opção A — cobertura primária)
  // A chave cobertura_L1_3_pvi é a pergunta própria de PVI para L1.3
};

// Chaves obrigatórias de M4 por Pill
export const M4_REQUIRED_KEYS: Record<PillId, string[]> = {
  PI:   ['percepcao', 'presenca_deslocamento'],
  PII:  ['percepcao', 'presenca_para_outros'],
  PIII: ['percepcao', 'presenca_para_outros'],
  PIV:  ['percepcao', 'presenca_para_outros'],
  PV:   ['percepcao', 'conhecimento_em_campo', 'presenca_para_outros'],
  PVI:  ['percepcao', 'presenca_para_outros'],
};

// Validação runtime de M3
export function validateM3(pillId: PillId, m3: Record<string, unknown>): string | null {
  // Verifica estrutura de alto nível
  if (!m3.M3_1_regua || typeof m3.M3_1_regua !== 'object') return 'M3_1_regua ausente';
  if (!m3.M3_2_escolha || typeof m3.M3_2_escolha !== 'object') return 'M3_2_escolha ausente';
  if (!m3.M3_3_inventario || typeof m3.M3_3_inventario !== 'object') return 'M3_3_inventario ausente';

  const regua = m3.M3_1_regua as Record<string, unknown>;
  if (!regua.posicao) return 'M3_1_regua.posicao ausente';
  if (!regua.duas_palavras) return 'M3_1_regua.duas_palavras ausente';
  if (!regua.situacao_oposta) return 'M3_1_regua.situacao_oposta ausente';

  const escolha = m3.M3_2_escolha as Record<string, unknown>;
  if (!['A', 'B', 'C', 'D'].includes(escolha.opcao as string)) return 'M3_2_escolha.opcao inválido';
  if (!escolha.abre_mao) return 'M3_2_escolha.abre_mao ausente';

  const inventario = m3.M3_3_inventario as Record<string, unknown>;
  const requiredKeys = M3_INVENTARIO_REQUIRED_KEYS[pillId];
  for (const key of requiredKeys) {
    if (inventario[key] === undefined) return `M3_3_inventario.${key} ausente para ${pillId}`;
  }

  return null; // válido
}

// Validação runtime de M4
export function validateM4(pillId: PillId, m4: Record<string, unknown>): string | null {
  const requiredKeys = M4_REQUIRED_KEYS[pillId];
  for (const key of requiredKeys) {
    if (!m4[key]) return `M4.${key} ausente para ${pillId}`;
  }
  return null; // válido
}

// ─────────────────────────────────────────
// 7. INTERFACE IPE → ENGINE HAGO
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.0 §5.3 + §8.1
// ─────────────────────────────────────────

// LuceRawInput — input da integração IPE → Engine HAGO (Fase 6)
// CORREÇÃO B1: d1/d2/d3/d4 são escalares (médias por dimensão), não arrays de 4.
// Fonte canônica: PIPELINE §5.3 — computeDimensions retorna number | null por dimensão.
// O engine HAGO recebe as 4 médias dimensionais, não os 16 ILs individuais.
export interface LuceRawInput {
  d1: number | null;
  d2: number | null;
  d3: number | null;
  d4: number | null;
  user_text: string;
}

// Conversão CanonicalILs → LuceRawInput
// Fonte: PIPELINE §5.3
// Comportamento:
//   - Dimensão com ZERO ILs válidos → null
//   - Se ≥2 nulls na mesma dimensão → confianca_por_dimensao = 'baixa' (flag externo)
//   - Todas as 4 dimensões null → retorna null (inválido para o engine)
// Nota: FD médio para gate IPE1→IPE2 é calculado em shouldRunIPE2.
// Nota: Se qualquer dimensão null → flag 'dimensao_incompleta' antes de passar à Luce
//       (responsabilidade do caller — ver PIPELINE §8.1)
export function computeLuceInput(
  ils: CanonicalILs,
  user_text: string
): LuceRawInput | null {
  const avg = (values: (ILValue)[]): number | null => {
    const valid = values.filter((v): v is number => v !== null);
    return valid.length > 0
      ? valid.reduce((s, v) => s + v, 0) / valid.length
      : null;
  };

  const d1 = avg([ils.l1_1, ils.l1_2, ils.l1_3, ils.l1_4]);
  const d2 = avg([ils.l2_1, ils.l2_2, ils.l2_3, ils.l2_4]);
  const d3 = avg([ils.l3_1, ils.l3_2, ils.l3_3, ils.l3_4]);
  const d4 = avg([ils.l4_1, ils.l4_2, ils.l4_3, ils.l4_4]);

  // Todas as dimensões null → sem dados suficientes para o engine
  if (d1 === null && d2 === null && d3 === null && d4 === null) return null;

  return { d1, d2, d3, d4, user_text };
}

// ─────────────────────────────────────────
// 8. CRITÉRIO AUTOMÁTICO DE REVISÃO HUMANA
// Fonte: PIPELINE §8.2
// ─────────────────────────────────────────

export interface RevisaoFlags {
  confianca_baixa: boolean;
  outlier_il: boolean;       // qualquer IL médio < 1.5 ou > 7.8
  fadiga_extrema: boolean;   // >25 perguntas no Questionário
  parse_failures: boolean;   // >20% das chamadas do ciclo com parse_success=false
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
// 9. DETERMINAÇÃO IPE1 vs IPE2
// Fonte: Gate F4.5, Decisão 2
// Critério: FD_campo médio ≥ 0.50 E ≥ 10 linhas com IL_status = 'válido'
// Esta função é a fonte única de cálculo de FD médio no sistema (R2.6).
// ipe-scoring retorna fd_campo_medio por Pill; este agregador combina cross-Pills.
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
      if (linha && typeof linha.FD_linha === 'number') allFDs.push(linha.FD_linha);
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
      if (linha && linha.status_sinal === 'completo') {
        linhasValidas.add(lineId as LineId);
      }
    }
  }

  return fdMedio >= 0.50 && linhasValidas.size >= 10;
}
