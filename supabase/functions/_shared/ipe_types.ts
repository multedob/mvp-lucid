// ============================================================
// ipe_types.ts — Contratos TypeScript do Subsistema IPE
// Versão: 1.1
// Changelog v1.0 → v1.1:
//   AFC C1/C4 eco_text + m4_resposta JSONB (PIPELINE v1.1)
//   C1 (Fase 3): BlockScoringOutput + corte_pendente + faixa_preliminar
//   C1 derivado: ResultadoBloco + corte_pendente_apos_principal + faixa_final
//   C2/C3 (Fase 3): QuestionnaireState + estado intra-bloco via flags JSONB
//   C2 (Fase 3): NextBlockOutput + aguardando_variante
//   C4 (Fase 3): PillDataAgregado + il_por_pill + agregarDadosPills
//   C4 (2ª rodada): il_por_pill adicionado a PillDataAgregado
//   C5 (Fase 3): StubPersona + STUB_CANONICOS + stubBlockScoring
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.1, §3.3
// PILL_I/II/III/IV/V/VI_Prototipo v0.3
// SCORING_SPEC v1.3 | MAPA_COBERTURA_LINHAS v2.4
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
// Validação real ocorre no scoring (edge function) antes de persistir.
export type ILValue = 1.0 | 2.0 | 3.5 | 4.5 | 5.5 | 6.5 | 7.5 | 8.0 | null;

// Linhas canônicas
export type LineId =
  | 'L1.1' | 'L1.2' | 'L1.3' | 'L1.4'
  | 'L2.1' | 'L2.2' | 'L2.3' | 'L2.4'
  | 'L3.1' | 'L3.2' | 'L3.3' | 'L3.4'
  | 'L4.1' | 'L4.2' | 'L4.3' | 'L4.4';

export type PillMoment = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

// C4: GCCValue union — centralizado aqui (antes espalhado em VALID_GCC das edge functions)
export type GCCValue =
  | 'alto'
  | 'medio'
  | 'baixo'
  | 'insuficiente'
  | 'nao_aplicavel';

// C1: CorteId — cortes canônicos do sistema
export type CorteId = '2_4' | '4_6' | '6_8';

// C1: FaixaValue — faixas de desenvolvimento
export type FaixaValue = 'A' | 'B' | 'C' | 'D' | 'indeterminada';

// ─────────────────────────────────────────
// 2. SCHEMAS M3 E M4 POR PILL
// Fonte: PILL_I–VI_Prototipo v0.3 — Camada B de cada pergunta
// ─────────────────────────────────────────
export interface M3Regua {
  posicao: string;
  duas_palavras: string;
  situacao_oposta: string;
}

export interface M3Escolha {
  opcao: 'A' | 'B' | 'C' | 'D';
  abre_mao: string;
  followup_C: string | null;
  followup_D: string | null;
}

interface M3InventarioBase {
  narrativa: string;
  condicao: string;
  cobertura_L1_3: string;
}

export interface M3InventarioPI extends M3InventarioBase {}
export interface M3InventarioPII extends M3InventarioBase {
  cobertura_L1_4: string;
}
export interface M3InventarioPIII extends M3InventarioBase {
  cobertura_L2_2: string;
}
export interface M3InventarioPIV extends M3InventarioBase {}
export interface M3InventarioPV extends M3InventarioBase {
  cobertura_L4_3: string;
}
export interface M3InventarioPVI {
  narrativa: string;
  condicao: string;
  cobertura_L1_3: null;
  cobertura_L1_3_pvi: string;
  cobertura_L1_4: string;
}

export interface M3ByPill {
  PI:  { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPI };
  PII: { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPII };
  PIII:{ M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPIII };
  PIV: { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPIV };
  PV:  { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPV };
  PVI: { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: M3InventarioPVI };
}

interface M4Base {
  percepcao: string;
}

export interface M4PI extends M4Base {
  presenca_deslocamento: string;
}

export interface M4ComTransversal extends M4Base {
  presenca_para_outros: string;
}

export interface M4PV extends M4Base {
  conhecimento_em_campo: string;
  presenca_para_outros: string;
}

export type M4 = M4PI | M4ComTransversal | M4PV;

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
  started_at: string;
  completed_at: string | null;
  prompt_version: string | null;
}

// 3.2 pill_responses
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
  m3_respostas: Record<string, unknown> | null;
  // AFC C2/C3: JSONB com subchaves Pill-específicas
  //   PI:  { percepcao, presenca_deslocamento } → L4.4 corpus primário
  //   PV:  { percepcao, conhecimento_em_campo, presenca_para_outros }
  //   demais: { percepcao, presenca_para_outros } → L4.4 transversal
  //   Migração: 20260321000001_ipe_m4_jsonb.sql
  m4_resposta: M4 | null;
  // AFC C1/C4: eco_text TEXT — estado server-side M5
  //   Necessário para retomada de sessão M5 sem rechamar ipe-eco (P3)
  //   Migração: 20260321000000_ipe_schema.sql
  eco_text: string | null;
  completed_at: string | null;
}

// 3.3 pill_scoring
export interface LinhaCorpus {
  IL_sinal: {
    numerico: ILValue;
    faixa: FaixaValue;
    faixa_parcial: boolean;
    cortes: {
      '2_4': { decisao: 'SIM' | 'NÃO' | 'INDETERMINADO'; gcc: string; evidencia: string };
      '4_6': { decisao: 'SIM' | 'NÃO' | 'INDETERMINADO'; gcc: string; evidencia: string };
      '6_8': { decisao: 'SIM' | 'NÃO' | 'INDETERMINADO'; gcc: string; evidencia: string };
    };
    confianca_IL: 'alta' | 'media' | 'baixa' | 'nao_aplicavel';
    tipo: 'sinal';
  };
  FD_linha: number;
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
  // C2/C3: estado intra-bloco — armazenado em flags para não exigir nova coluna SQL
  // Ciclo de vida: setado quando principal respondida + corte pendente detectado;
  // limpo após variante recebida ou bloco finalizado sem variante.
  // Invariante: bloco_aguardando_variante !== null ↔ variante_a_servir_pendente !== null
  bloco_aguardando_variante?: LineId | null;
  variante_a_servir_pendente?: string | null;
  // Resposta principal em espera para scoring conjunto (principal + variante)
  // Limpa após scoring final do bloco ser chamado.
  principal_resposta_pendente?: string | null;
  [key: string]: unknown;
}

// C1 derivado: ResultadoBloco — persiste corte e faixa para rastreabilidade RADAR
export interface ResultadoBloco {
  il_canonico: ILValue;
  confianca: ConfiancaGlobal;
  variante_usada: string | null;
  protecao_etica: boolean;
  scoring_version: string | null;
  // C1: persistidos para rastreabilidade e análise downstream (RADAR)
  corte_pendente_apos_principal: CorteId | null;
  faixa_final: FaixaValue | null;
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
  // C2/C3: estado intra-bloco via flags (sem nova coluna SQL)
  // Acessar via flags.bloco_aguardando_variante, flags.variante_a_servir_pendente
  // flags.principal_resposta_pendente
  flags: QuestionnaireFlags;
  status: QuestionnaireStatus;
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
export interface CanonicalILs {
  id: string;
  ipe_cycle_id: string;
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

// 5.1 ipe-pill-session
export interface PillSessionInput {
  ipe_cycle_id: string;
  pill_id: PillId;
  moment: PillMoment;
  payload: PillMomentPayload;
}

export type PillMomentPayload =
  | { tempo_segundos: number }
  | { resposta: string; cal_signals: M2CalSignals }
  | { M3_1_regua: M3Regua; M3_2_escolha: M3Escolha; M3_3_inventario: Record<string, unknown> }
  | { m4: M4 }
  | Record<string, never>;

export interface PillSessionOutput {
  pill_response_id: string;
  next_moment: PillMoment | null;
  scoring_triggered: boolean;
}

// 5.2 ipe-scoring
export interface PillScoringInput {
  ipe_cycle_id: string;
  pill_id: PillId;
}

export interface PillScoringOutput {
  pill_scoring_id: string;
  corpus_linhas: Partial<Record<LineId, LinhaCorpus>>;
  fd_campo_medio: number;
  linhas_validas: number;
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
  block_response?: Omit<BlockResponseInsert, 'ipe_cycle_id'>;
}

// C2: NextBlockOutput — aguardando_variante distingue novo bloco vs variante do bloco atual
// Fluxo:
//   aguardando_variante=false → UI avança para next_block (novo bloco)
//   aguardando_variante=true  → UI serve variante_a_servir do bloco atual
//   done=true                 → Questionário encerrado
export interface NextBlockOutput {
  done: boolean;
  next_block: LineId | null;
  variante_a_servir: string | null;
  aguardando_variante: boolean;    // C2: true = serve variante do bloco atual
  dimension_transition: string | null;
  questionnaire_state_id: string;
}

// 5.4 ipe-scoring-block
export interface BlockScoringInput {
  ipe_cycle_id: string;
  block_id: LineId;
  principal_resposta: string | null;
  variante_resposta: string | null;
  protecao_etica: boolean;
}

// C1: BlockScoringOutput — adicionados corte_pendente e faixa_preliminar
// Necessários para /next-block decidir qual variante servir (§5.2 PIPELINE_EXECUCAO)
// corte_pendente=null → nenhuma variante necessária (resposta foi suficientemente clara)
// faixa_preliminar → usado para decidir variante C/D (somente se C ou D)
export interface BlockScoringOutput {
  block_id: LineId;
  il_canonico: ILValue;
  confianca: ConfiancaGlobal;
  scoring_audit_id: string;
  corte_pendente: CorteId | null;
  faixa_preliminar: FaixaValue;
}

// 5.5 ipe-eco
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
export const M3_INVENTARIO_REQUIRED_KEYS: Record<PillId, string[]> = {
  PI:   ['narrativa', 'condicao', 'cobertura_L1_3'],
  PII:  ['narrativa', 'condicao', 'cobertura_L1_3', 'cobertura_L1_4'],
  PIII: ['narrativa', 'condicao', 'cobertura_L1_3', 'cobertura_L2_2'],
  PIV:  ['narrativa', 'condicao', 'cobertura_L1_3'],
  PV:   ['narrativa', 'condicao', 'cobertura_L1_3', 'cobertura_L4_3'],
  PVI:  ['narrativa', 'condicao', 'cobertura_L1_3_pvi', 'cobertura_L1_4'],
};

export const M4_REQUIRED_KEYS: Record<PillId, string[]> = {
  PI:   ['percepcao', 'presenca_deslocamento'],
  PII:  ['percepcao', 'presenca_para_outros'],
  PIII: ['percepcao', 'presenca_para_outros'],
  PIV:  ['percepcao', 'presenca_para_outros'],
  PV:   ['percepcao', 'conhecimento_em_campo', 'presenca_para_outros'],
  PVI:  ['percepcao', 'presenca_para_outros'],
};

export function validateM3(pillId: PillId, m3: Record<string, unknown>): string | null {
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
  for (const key of M3_INVENTARIO_REQUIRED_KEYS[pillId]) {
    if (inventario[key] === undefined) return `M3_3_inventario.${key} ausente para ${pillId}`;
  }
  return null;
}

export function validateM4(pillId: PillId, m4: Record<string, unknown>): string | null {
  for (const key of M4_REQUIRED_KEYS[pillId]) {
    if (!m4[key]) return `M4.${key} ausente para ${pillId}`;
  }
  return null;
}

// ─────────────────────────────────────────
// 7. INTERFACE IPE → ENGINE HAGO
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.1 §5.3 + §8.1
// ─────────────────────────────────────────
// CORREÇÃO B1: d1/d2/d3/d4 são escalares (médias por dimensão), não arrays de 4.
export interface LuceRawInput {
  d1: number | null;
  d2: number | null;
  d3: number | null;
  d4: number | null;
  user_text: string;
}

export function computeLuceInput(
  ils: CanonicalILs,
  user_text: string
): LuceRawInput | null {
  const avg = (values: ILValue[]): number | null => {
    const valid = values.filter((v): v is number => v !== null);
    return valid.length > 0 ? valid.reduce((s, v) => s + v, 0) / valid.length : null;
  };
  const d1 = avg([ils.l1_1, ils.l1_2, ils.l1_3, ils.l1_4]);
  const d2 = avg([ils.l2_1, ils.l2_2, ils.l2_3, ils.l2_4]);
  const d3 = avg([ils.l3_1, ils.l3_2, ils.l3_3, ils.l3_4]);
  const d4 = avg([ils.l4_1, ils.l4_2, ils.l4_3, ils.l4_4]);
  if (d1 === null && d2 === null && d3 === null && d4 === null) return null;
  return { d1, d2, d3, d4, user_text };
}

// ─────────────────────────────────────────
// 8. CRITÉRIO AUTOMÁTICO DE REVISÃO HUMANA
// Fonte: PIPELINE §8.2
// ─────────────────────────────────────────
export interface RevisaoFlags {
  confianca_baixa: boolean;
  outlier_il: boolean;
  fadiga_extrema: boolean;
  parse_failures: boolean;
}

export function computeRevisaoFlags(
  ils: CanonicalILs,
  totalPerguntas: number,
  parseFailureRate: number
): RevisaoFlags {
  const dimensoes = [ils.d1, ils.d2, ils.d3, ils.d4].filter(
    (d): d is number => d !== null
  );
  return {
    confianca_baixa: ils.confianca_global === 'baixa',
    outlier_il: dimensoes.some(d => d < 1.5 || d > 7.8),
    fadiga_extrema: totalPerguntas > 25,
    parse_failures: parseFailureRate > 0.20,
  };
}

// ─────────────────────────────────────────
// 9. DETERMINAÇÃO IPE1 vs IPE2
// Fonte: Gate F4.5, Decisão 2
// Esta função é a fonte única de cálculo de FD médio no sistema (R2.6).
// ─────────────────────────────────────────
export function shouldRunIPE2(scoring: PillScoring[]): boolean {
  if (scoring.length === 0) return false;
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

// ─────────────────────────────────────────
// 10. DADOS AGREGADOS DE PILLS — MOTOR DE ATIVAÇÃO
// Fonte: PIPELINE_EXECUCAO_QUESTIONARIO §3.1
// C4: fórmula canônica de agregação cross-Pills
// ─────────────────────────────────────────

// PillDataAgregado — dados de Pills agregados por linha para o motor de ativação
// C4 (2ª rodada): il_por_pill adicionado para condicionais que comparam Pills específicas:
//   L1.3 condição (3): divergência PII↔PVI
//   L3.1 condição (2): divergência PI↔PVI
//   L3.2 condição (1): divergência PI↔PIV
export interface PillDataAgregado {
  n_pills_respondidas: number;
  n_pills_com_cobertura: number;
  // ILs individuais — para cálculo de heterogeneidade e divergência
  il_sinais: ILValue[];
  // C4 (2ª rodada): IL por Pill específica — necessário para condicionais cross-pill
  // Apenas Pills com cobertura para esta linha
  il_por_pill: Partial<Record<PillId, ILValue>>;
  // FD: média simples cross-Pills (mesma lógica de shouldRunIPE2)
  fd_linha_agregado: number;
  // GCC: da Pill com maior FD (mais informativa para a linha)
  gcc_por_corte: {
    '2_4': GCCValue | null;
    '4_6': GCCValue | null;
    '6_8': GCCValue | null;
  };
  faixa_estimada: FaixaValue;
  heterogeneidade: 'baixa' | 'media' | 'alta';
  corpus_transversal: string | null; // para L1.3, L3.3, L4.4
}

export type DadosPillsAgregados = Partial<Record<LineId, PillDataAgregado>>;

// agregarDadosPills — fonte única de cálculo de fd_linha_agregado e gcc_agregado
// Fórmula canônica aprovada:
//   fd_linha_agregado = média simples dos FD_linha cross-Pills
//   gcc_por_corte = GCC da Pill com maior FD_linha (mais informativa)
//   il_por_pill = IL_sinal.numerico por PillId com cobertura
// Nota: corpus_transversal populado pela edge function (lineId ∈ {L1.3, L3.3, L4.4})
export function agregarDadosPills(
  scorings: PillScoring[],
  lineId: LineId
): PillDataAgregado {
  const comCobertura = scorings
    .filter(ps => ps.corpus_linhas?.[lineId] != null)
    .map(ps => ({ pill_id: ps.pill_id, linha: ps.corpus_linhas![lineId]! }));

  const empty: PillDataAgregado = {
    n_pills_respondidas: scorings.length,
    n_pills_com_cobertura: 0,
    il_sinais: [],
    il_por_pill: {},
    fd_linha_agregado: 0,
    gcc_por_corte: { '2_4': null, '4_6': null, '6_8': null },
    faixa_estimada: 'indeterminada',
    heterogeneidade: 'baixa',
    corpus_transversal: null,
  };

  if (comCobertura.length === 0) return empty;

  // FD: média simples
  const fds = comCobertura.map(({ linha }) => linha.FD_linha);
  const fd_agregado = fds.reduce((s, v) => s + v, 0) / fds.length;

  // GCC: Pill com maior FD
  const maisInformativa = comCobertura.reduce((best, curr) =>
    curr.linha.FD_linha > best.linha.FD_linha ? curr : best
  );
  const cortes = maisInformativa.linha.IL_sinal?.cortes;

  // IL sinais: numerico por cobertura
  const il_sinais = comCobertura
    .map(({ linha }) => linha.IL_sinal?.numerico ?? null)
    .filter((v): v is ILValue => v !== undefined);

  // C4 (2ª rodada): il_por_pill — mapeia PillId → IL_sinal.numerico
  const il_por_pill: Partial<Record<PillId, ILValue>> = {};
  for (const { pill_id, linha } of comCobertura) {
    il_por_pill[pill_id] = linha.IL_sinal?.numerico ?? null;
  }

  // Faixa: da Pill mais informativa
  const faixa = (maisInformativa.linha.IL_sinal?.faixa ?? 'indeterminada') as FaixaValue;

  // Heterogeneidade: faixas distintas (excluindo indeterminada)
  const faixasUnicas = new Set(
    comCobertura
      .map(({ linha }) => linha.IL_sinal?.faixa)
      .filter(f => f && f !== 'indeterminada')
  );
  const heterogeneidade: 'baixa' | 'media' | 'alta' =
    faixasUnicas.size <= 1 ? 'baixa' :
    faixasUnicas.size === 2 ? 'media' : 'alta';

  return {
    n_pills_respondidas: scorings.length,
    n_pills_com_cobertura: comCobertura.length,
    il_sinais,
    il_por_pill,
    fd_linha_agregado: Math.round(fd_agregado * 100) / 100,
    gcc_por_corte: {
      '2_4': (cortes?.['2_4']?.gcc ?? null) as GCCValue | null,
      '4_6': (cortes?.['4_6']?.gcc ?? null) as GCCValue | null,
      '6_8': (cortes?.['6_8']?.gcc ?? null) as GCCValue | null,
    },
    faixa_estimada: faixa,
    heterogeneidade,
    corpus_transversal: null, // populado pela edge function quando necessário
  };
}

// Helpers de divergência para condicionais cross-pill (C4 2ª rodada)
// Retornam diferença em faixas entre duas Pills específicas

function faixaParaNumero(faixa: FaixaValue): number {
  return faixa === 'A' ? 1 : faixa === 'B' ? 2 : faixa === 'C' ? 3 : faixa === 'D' ? 4 : 0;
}

export function divergenciaFaixas(
  d: PillDataAgregado,
  pillA: PillId,
  pillB: PillId
): number {
  const ilA = d.il_por_pill[pillA];
  const ilB = d.il_por_pill[pillB];
  if (ilA === undefined || ilB === undefined || ilA === null || ilB === null) return 0;
  return Math.abs(ilA - ilB);
}

// ─────────────────────────────────────────
// 11. FASE 3 — MOTOR DE ATIVAÇÃO: CONDICIONAIS
// Fonte: PIPELINE_EXECUCAO_QUESTIONARIO §3.3.2
// C4: tradução direta das regras de ativação para TypeScript
// ─────────────────────────────────────────

// L1.3: ativar se qualquer condição (1)–(5) verdadeira
// Limitação conhecida (C3 2ª rodada): condição (3) "divergência PII↔PVI" agora
// avaliável via il_por_pill. Condição (4) "late activation" avaliada em runtime (§3.4).
export function shouldActivateL13(d: PillDataAgregado): boolean {
  const faixa = d.faixa_estimada;
  // (7) faixa C ou D → NÃO ativar (regra de não-reabertura para perfis altos)
  if (faixa === 'C' || faixa === 'D') return false;
  // (1) faixa A
  if (faixa === 'A') return true;
  // (2) IL = 3.5 E GCC[4↔6] baixo/medio
  if (d.il_sinais.some(il => il === 3.5) &&
      (d.gcc_por_corte['4_6'] === 'baixo' || d.gcc_por_corte['4_6'] === 'medio')) return true;
  // (3) divergência PII↔PVI ≥ 1 faixa (agora avaliável com il_por_pill)
  if (divergenciaFaixas(d, 'PII', 'PVI') >= 1.0) return true;
  // (5) FD < 0.50
  if (d.fd_linha_agregado < 0.50) return true;
  return false;
}

// L2.3: threshold 0.40 — APRENDIZADOS §10.3 (fragilidade: fonte efetivamente única M3.1)
export function shouldActivateL23(d: PillDataAgregado): boolean {
  if (d.n_pills_com_cobertura === 0) return true;           // automático
  if (d.fd_linha_agregado < 0.40) return true;              // primário
  if (d.fd_linha_agregado >= 0.40 &&
      d.gcc_por_corte['4_6'] === 'baixo') return true;     // secundário
  return false;
}

// L3.1 — condição (2) agora avaliável com il_por_pill (divergência PI↔PVI ≥ 2.0)
// Limitação conhecida (C3 2ª rodada): condição (1) "D em M3.2 + follow-up vago"
// requer inspeção de pill_responses — não avaliada no /plan. Documentado.
export function shouldActivateL31(d: PillDataAgregado): boolean {
  if (d.n_pills_com_cobertura === 0) return true;
  // (2) divergência PI↔PVI ≥ 2.0
  if (divergenciaFaixas(d, 'PI', 'PVI') >= 2.0) return true;
  // (3) FD < 0.50
  if (d.fd_linha_agregado < 0.50) return true;
  // (4) 1 Pill E IL limítrofe
  if (d.n_pills_com_cobertura === 1 &&
      (d.il_sinais[0] === 2.0 || d.il_sinais[0] === 4.5)) return true;
  // heterogeneidade alta implica divergência
  if (d.heterogeneidade === 'alta') return true;
  return false;
}

// L3.2 — condição (1) agora avaliável com il_por_pill (divergência PI↔PIV ≥ 2.0)
// Limitação conhecida (C3 2ª rodada): condição (5) "D em M3.2" não avaliada no /plan.
export function shouldActivateL32(d: PillDataAgregado): boolean {
  if (d.n_pills_com_cobertura === 0) return true;
  // (1) divergência PI↔PIV ≥ 2.0
  if (divergenciaFaixas(d, 'PI', 'PIV') >= 2.0) return true;
  // (2) FD < 0.50
  if (d.fd_linha_agregado < 0.50) return true;
  // (3) 1 Pill E IL limítrofe
  if (d.n_pills_com_cobertura === 1 &&
      (d.il_sinais[0] === 2.0 || d.il_sinais[0] === 4.5)) return true;
  // (4) PIV única E dado fraco
  if (d.il_por_pill['PIV'] !== undefined && d.il_por_pill['PI'] === undefined &&
      (d.gcc_por_corte['4_6'] !== 'alto' || d.fd_linha_agregado < 0.50)) return true;
  if (d.heterogeneidade === 'alta') return true;
  return false;
}

// L3.4 condicional (mutex com L3.4_CP)
export function shouldActivateL34Condicional(d: PillDataAgregado): boolean {
  if (d.n_pills_com_cobertura === 0) return true;
  if (d.fd_linha_agregado < 0.50) return true;
  if (d.n_pills_com_cobertura === 1 &&
      (d.il_sinais[0] === 2.0 || d.il_sinais[0] === 4.5)) return true;
  if (d.heterogeneidade !== 'baixa') return true;
  return false;
}

// Late activation L1.3 — condição 2b (avaliada em runtime no /next-block)
// Fonte: PIPELINE_EXECUCAO §3.4
export function checkLateActivationL13(
  resultados: Partial<Record<LineId, ResultadoBloco>>,
  pillDataL13: PillDataAgregado
): boolean {
  const ilL11 = resultados['L1.1']?.il_canonico;
  const ilL12 = resultados['L1.2']?.il_canonico;
  const faixaL13Pills = pillDataL13.faixa_estimada;
  const l11ouL12FaixaA =
    (ilL11 !== null && ilL11 !== undefined && ilL11 <= 2.0) ||
    (ilL12 !== null && ilL12 !== undefined && ilL12 <= 2.0);
  return l11ouL12FaixaA && faixaL13Pills === 'B';
}

// PC3 — orçamento D3 (PIPELINE_EXECUCAO §2.3)
export function calcMaxPerguntasBloco(
  dimensao: 'D1' | 'D2' | 'D3' | 'D4',
  tipo: 'SEMPRE' | 'CONDICIONAL',
  orcamento_global: number,
  orcamento_d3: number,
  contador_d3_blocos: number
): number | 'SKIP' {
  let max = 2;
  if (dimensao === 'D3') {
    if (contador_d3_blocos >= 2) max = 1;      // PC3: cap após 2 blocos D3
    if (orcamento_d3 < max) max = orcamento_d3;
    if (max <= 0) return 'SKIP';
  }
  if (orcamento_global < max) {
    if (tipo === 'CONDICIONAL') return 'SKIP';
    max = 1; // SEMPRE nunca é SKIP por fadiga global (Regra 1 §2.5)
  }
  return max;
}

// ───────────────────────────────────────── //
// 12. FASE 3 — SCORING STUB (C5)           //
// Para testes de sequência sem LLM real    //
// SUBSTITUIR por ipe-scoring-block real    //
// antes do gate de saída Fase 3            //
// ───────────────────────────────────────── //

export type StubPersona = 'P2-B' | 'P3-M' | 'P7-A' | 'P5-B' | 'SC-OPD' | 'P4-C';

// Canônicos aprovados por gate D1–D4 (PROJECT_MANIFEST v1.17.0)
// P5-B: resistente nível baixo — todas Faixa A/B
//   L2.3 e L3.4 null: linhas sem cobertura primária nas Pills de P5-B
// SC-OPD: stress case opção D — corpus comprimido, Faixa B em tudo
// P4-C: caminho limpo — Faixa C convergente, nenhum condicional ativa
export const STUB_CANONICOS: Record<StubPersona, Partial<Record<LineId, ILValue>>> = {
  'P2-B': {
    'L1.1': 3.5, 'L1.2': 3.5, 'L1.3': 2.0, 'L1.4': 3.5,
    'L2.1': 3.5, 'L2.2': 3.5, 'L2.3': null, 'L2.4': 3.5,
    'L3.1': 2.0, 'L3.2': 3.5, 'L3.3': 2.0, 'L3.4': null,
    'L4.1': 3.5, 'L4.2': 3.5, 'L4.3': 3.5, 'L4.4': 2.0,
  },
  'P3-M': {
    'L1.1': 4.5, 'L1.2': 4.5, 'L1.3': 4.5, 'L1.4': 4.5,
    'L2.1': 4.5, 'L2.2': 4.5, 'L2.3': 4.5, 'L2.4': 4.5,
    'L3.1': 4.5, 'L3.2': 4.5, 'L3.3': 5.5, 'L3.4': 5.5,
    'L4.1': 4.5, 'L4.2': 4.5, 'L4.3': 3.5, 'L4.4': 4.5,
  },
  'P7-A': {
    'L1.1': 7.5, 'L1.2': 7.5, 'L1.3': 6.5, 'L1.4': 7.5,
    'L2.1': 6.5, 'L2.2': 7.5, 'L2.3': 6.5, 'L2.4': 7.5,
    'L3.1': null, 'L3.2': 6.5, 'L3.3': 6.5, 'L3.4': 6.5,
    'L4.1': 7.5, 'L4.2': 7.5, 'L4.3': 7.5, 'L4.4': 7.5,
  },
  'P5-B': {
    'L1.1': 2.0, 'L1.2': 2.0, 'L1.3': 2.0, 'L1.4': 2.0,
    'L2.1': 2.0, 'L2.2': 2.0, 'L2.3': null, 'L2.4': 2.0,
    'L3.1': 2.0, 'L3.2': 2.0, 'L3.3': 2.0, 'L3.4': null,
    'L4.1': 2.0, 'L4.2': 2.0, 'L4.3': 2.0, 'L4.4': 2.0,
  },
  'SC-OPD': {
    'L1.1': 3.5, 'L1.2': 3.5, 'L1.3': 3.5, 'L1.4': 3.5,
    'L2.1': 3.5, 'L2.2': 3.5, 'L2.3': 3.5, 'L2.4': 3.5,
    'L3.1': 3.5, 'L3.2': 3.5, 'L3.3': 3.5, 'L3.4': 3.5,
    'L4.1': 3.5, 'L4.2': 3.5, 'L4.3': 3.5, 'L4.4': 3.5,
  },
  'P4-C': {
    'L1.1': 5.5, 'L1.2': 5.5, 'L1.3': 5.5, 'L1.4': 5.5,
    'L2.1': 5.5, 'L2.2': 5.5, 'L2.3': 5.5, 'L2.4': 5.5,
    'L3.1': 5.5, 'L3.2': 5.5, 'L3.3': 5.5, 'L3.4': 5.5,
    'L4.1': 5.5, 'L4.2': 5.5, 'L4.3': 5.5, 'L4.4': 5.5,
  },
};

// stubBlockScoring — retorna BlockScoringOutput com IL canônico da persona
// corte_pendente=null sempre → motor nunca serve variante em testes de sequência
export function stubBlockScoring(
  block_id: LineId,
  persona: StubPersona,
  scoring_audit_id = 'stub-audit-id'
): BlockScoringOutput {
  const il = STUB_CANONICOS[persona][block_id] ?? null;
  const faixa: FaixaValue =
    il === null ? 'indeterminada'
    : il <= 2.0  ? 'A'
    : il <= 4.5  ? 'B'
    : il <= 6.5  ? 'C'
    : 'D';
  return {
    block_id,
    il_canonico: il,
    confianca: il === null ? 'baixa' : 'alta',
    scoring_audit_id,
    corte_pendente: null,   // stub: nunca serve variante
    faixa_preliminar: faixa,
  };
}

// detectStubPersona — convenção de testes por sufixo no ipe_cycle_id
export function detectStubPersona(ipe_cycle_id: string): StubPersona {
  if (ipe_cycle_id.endsWith('-p2b'))   return 'P2-B';
  if (ipe_cycle_id.endsWith('-p7a'))   return 'P7-A';
  if (ipe_cycle_id.endsWith('-p5b'))   return 'P5-B';
  if (ipe_cycle_id.endsWith('-scopd')) return 'SC-OPD';
  if (ipe_cycle_id.endsWith('-p4c'))   return 'P4-C';
  return 'P3-M'; // default
}
