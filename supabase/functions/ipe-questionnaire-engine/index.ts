// ============================================================
// ipe-questionnaire-engine/index.ts
// Fonte: PIPELINE_EXECUCAO_QUESTIONARIO_IPE1 v1.1
//        PIPELINE_IMPLEMENTACAO_IPE_MVP v1.1 §5
// Responsabilidade: motor de execução do Questionário IPE1
// Endpoints:
//   POST /plan      — calcula plano inicial (uma vez por ciclo)
//   POST /next-block — avança execução (por bloco/variante)
// Chamadas LLM: 0 (determinístico) — delega scoring a ipe-scoring-block
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type LineId,
  type PillScoring,
  type QuestionnaireState,
  type QuestionnaireFlags,
  type ExecutionPlan,
  type ResultadoBloco,
  type BlockScoringOutput,
  type BlockScoringOutputFull,
  type BlockScoringInputFull,
  type PillDataAgregado,
  type NextBlockOutput,
  type FaixaValue,
  type CorteId,
  agregarDadosPills,
  defaultPillData,
  shouldActivateL13,
  shouldActivateL23,
  shouldActivateL31,
  shouldActivateL32,
  shouldActivateL34Condicional,
  checkLateActivationL13,
  calcMaxPerguntasBloco,
} from "../_shared/ipe_types.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────
// SEQUÊNCIA CANÔNICA DE BLOCOS
// Fonte: PIPELINE_EXECUCAO §1.5
// ─────────────────────────────────────────
interface BlocoConfig {
  line_id: LineId;
  dimensao: "D1" | "D2" | "D3" | "D4";
  tipo: "SEMPRE" | "CONDICIONAL";
  posicao: number;
}

const SEQUENCIA_BLOCOS: BlocoConfig[] = [
  { line_id: "L2.4", dimensao: "D2", tipo: "SEMPRE",      posicao: 1 },
  { line_id: "L1.1", dimensao: "D1", tipo: "SEMPRE",      posicao: 2 },
  { line_id: "L1.2", dimensao: "D1", tipo: "SEMPRE",      posicao: 3 },
  { line_id: "L1.3", dimensao: "D1", tipo: "CONDICIONAL", posicao: 4 },
  { line_id: "L1.4", dimensao: "D1", tipo: "SEMPRE",      posicao: 5 },
  { line_id: "L2.1", dimensao: "D2", tipo: "SEMPRE",      posicao: 6 },
  { line_id: "L2.2", dimensao: "D2", tipo: "SEMPRE",      posicao: 7 },
  { line_id: "L2.3", dimensao: "D2", tipo: "CONDICIONAL", posicao: 8 },
  { line_id: "L3.3", dimensao: "D3", tipo: "SEMPRE",      posicao: 9 },
  { line_id: "L3.1", dimensao: "D3", tipo: "CONDICIONAL", posicao: 10 },
  { line_id: "L3.2", dimensao: "D3", tipo: "CONDICIONAL", posicao: 11 },
  // L3.4 / L3.4_CP: mutex — resolvido em buildExecutionPlan
  // Representado como posição 12, substituído conforme avaliação
  { line_id: "L3.4", dimensao: "D3", tipo: "CONDICIONAL", posicao: 12 },
  { line_id: "L4.1", dimensao: "D4", tipo: "SEMPRE",      posicao: 13 },
  { line_id: "L4.2", dimensao: "D4", tipo: "SEMPRE",      posicao: 14 },
  { line_id: "L4.3", dimensao: "D4", tipo: "SEMPRE",      posicao: 15 },
  { line_id: "L4.4", dimensao: "D4", tipo: "SEMPRE",      posicao: 16 },
];

// ─────────────────────────────────────────
// MAPA DE VARIANTES POR BLOCO
// Fonte: PIPELINE_EXECUCAO §5.1 (39 variantes — 1 canônica por corte/tipo)
// Hardcoded para piloto — revisar após Fase 5 com dados reais
// ─────────────────────────────────────────
interface VariantesBloco {
  calibracao_2_4: string | null;
  calibracao_4_6: string | null;
  cd: string | null; // variante C/D (corte 6↔8 ou faixa C+)
}

const VARIANTES_POR_BLOCO: Partial<Record<LineId, VariantesBloco>> = {
  "L2.4": { calibracao_2_4: "Adaptativa 2↔4",    calibracao_4_6: "Adaptativa 4↔6", cd: null },
  "L1.1": { calibracao_2_4: null,                 calibracao_4_6: null,             cd: "Origem" },
  "L1.2": { calibracao_2_4: null,                 calibracao_4_6: "Continuidade",   cd: null },
  "L1.3": { calibracao_2_4: null,                 calibracao_4_6: "Origem Padrão",  cd: "C-D Invisibilidade" },
  "L1.4": { calibracao_2_4: "Sustentação",        calibracao_4_6: "Profundidade",   cd: "Transferência" },
  "L2.1": { calibracao_2_4: null,                 calibracao_4_6: "C",              cd: "D" },
  "L2.2": { calibracao_2_4: "Corte 2↔4",         calibracao_4_6: "Corte 4↔6",     cd: "Meta-padrão C/D" },
  "L2.3": { calibracao_2_4: "Semana Recente",     calibracao_4_6: "Autodireção",    cd: "C-D Limite Gestão" },
  "L3.3": { calibracao_2_4: null,                 calibracao_4_6: null,             cd: "C/D" },
  "L3.1": { calibracao_2_4: null,                 calibracao_4_6: "Estrutura Ausente", cd: null },
  "L3.2": { calibracao_2_4: null,                 calibracao_4_6: "Visibilidade Posição", cd: null },
  "L3.4": { calibracao_2_4: "Calibração 2↔4",    calibracao_4_6: "Calibração 4↔6", cd: "C/D" },
  "L4.1": { calibracao_2_4: null,                 calibracao_4_6: "Articulação",    cd: "Transferência" },
  "L4.2": { calibracao_2_4: null,                 calibracao_4_6: "Persistência",   cd: "Meta-observação" },
  "L4.3": { calibracao_2_4: "Corte 2↔4",         calibracao_4_6: "Corte 4↔6",     cd: "Meta-padrão C/D" },
  "L4.4": { calibracao_2_4: "Adaptativa 2↔4",    calibracao_4_6: "Adaptativa 4↔6", cd: "Adaptativa C/D" },
};

// L3.4_CP usa as mesmas variantes que L3.4
const VARIANTES_L34CP: VariantesBloco = {
  calibracao_2_4: "Calibração 2↔4",
  calibracao_4_6: "Calibração 4↔6",
  cd: "C/D",
};

// ─────────────────────────────────────────
// SELEÇÃO DE VARIANTE (§5.2 PIPELINE_EXECUCAO)
// Prioridade: calibração 2↔4 > 4↔6 > C/D
// ─────────────────────────────────────────
function selecionarVariante(
  line_id: LineId,
  corte_pendente: CorteId | null,
  faixa_preliminar: FaixaValue,
  orcamento_restante: number
): string | null {
  if (orcamento_restante <= 0) return null;

  const isL34CP = (line_id as string) === "L3.4_CP";
  const variantes = isL34CP
    ? VARIANTES_L34CP
    : VARIANTES_POR_BLOCO[line_id];

  if (!variantes) return null;

  // Calibração pelo corte pendente (maior prioridade)
  if (corte_pendente === "2_4" && variantes.calibracao_2_4) return variantes.calibracao_2_4;
  if (corte_pendente === "4_6" && variantes.calibracao_4_6) return variantes.calibracao_4_6;

  // C/D quando faixa preliminar é C ou D (corte 6↔8)
  if ((faixa_preliminar === "C" || faixa_preliminar === "D") && variantes.cd) {
    return variantes.cd;
  }

  return null;
}

// ─────────────────────────────────────────
// CONSTRUÇÃO DO PLANO DE EXECUÇÃO
// Fonte: PIPELINE_EXECUCAO §3.2 + §3.3
// ─────────────────────────────────────────
function buildExecutionPlan(
  scorings: PillScoring[],
  semPills: boolean
): ExecutionPlan {
  const blocos_ativos: LineId[] = [];
  const blocos_skip: LineId[] = [];
  const motivos: Partial<Record<LineId, string>> = {};

  if (semPills) {
    // Modo sem_pills: todos os 16 blocos ativam (standalone)
    // L3.4 condicional ativa; L3.4_CP skip
    for (const bloco of SEQUENCIA_BLOCOS) {
      if (bloco.line_id === "L3.4") {
        // No modo sem_pills, L3.4 condicional ativa (sem dados de Pill)
        blocos_ativos.push("L3.4");
        motivos["L3.4"] = "sem_pills: L3.4 condicional ativa";
      } else {
        blocos_ativos.push(bloco.line_id);
        motivos[bloco.line_id] = "sem_pills: todos os blocos ativam";
      }
    }
    return {
      blocos_ativos,
      blocos_skip,
      motivos: motivos as Record<LineId, string>,
      orcamento_global_inicial: 30,
      orcamento_d3_inicial: 5,
    };
  }

  // Agregar dados de Pills para todas as linhas relevantes
  const allLineIds: LineId[] = [
    "L1.1","L1.2","L1.3","L1.4",
    "L2.1","L2.2","L2.3","L2.4",
    "L3.1","L3.2","L3.3","L3.4",
    "L4.1","L4.2","L4.3","L4.4",
  ];
  const dadosPills = Object.fromEntries(
    allLineIds.map(lid => [lid, agregarDadosPills(scorings, lid as LineId)])
  ) as Record<LineId, ReturnType<typeof agregarDadosPills>>;

  // Avaliar L3.4 mutex primeiro
  const l34Ativa = shouldActivateL34Condicional(dadosPills["L3.4"]);

  for (const bloco of SEQUENCIA_BLOCOS) {
    const lid = bloco.line_id;

    if (bloco.tipo === "SEMPRE") {
      blocos_ativos.push(lid);
      motivos[lid] = "SEMPRE";
      continue;
    }

    // Condicionais
    let ativa = false;
    let motivo = "";

    switch (lid) {
      case "L1.3":
        ativa = shouldActivateL13(dadosPills["L1.3"]);
        // condição (4) late activation — avaliada em runtime no /next-block
        motivo = ativa ? "pré-Q: condição L1.3 satisfeita" : "pré-Q: L1.3 não ativa (late activation possível)";
        break;
      case "L2.3":
        ativa = shouldActivateL23(dadosPills["L2.3"]);
        motivo = ativa ? "pré-Q: FD<0.40 ou GCC baixo ou sem cobertura" : "FD≥0.40 e GCC médio/alto";
        break;
      case "L3.1":
        ativa = shouldActivateL31(dadosPills["L3.1"]);
        motivo = ativa ? "pré-Q: condição L3.1 satisfeita" : "convergente e FD≥0.50";
        break;
      case "L3.2":
        ativa = shouldActivateL32(dadosPills["L3.2"]);
        motivo = ativa ? "pré-Q: condição L3.2 satisfeita" : "convergente e FD≥0.50";
        break;
      case "L3.4":
        // Mutex: se L3.4 condicional ativa → servir L3.4; L3.4_CP é skip (tratado à parte)
        ativa = l34Ativa;
        motivo = ativa ? "L3.4 condicional ativa" : "L3.4 não ativa → L3.4_CP será servido";
        break;
    }

    if (ativa) {
      blocos_ativos.push(lid);
    } else {
      blocos_skip.push(lid);
    }
    motivos[lid] = motivo;
  }

  // Mutex L3.4_CP: adicionar se L3.4 não ativou
  // B3 FIX: usar L3.3 como âncora mínima para garantir posição correta
  // quando L3.1 e L3.2 ambos estão no skip (Math.max(-1,-1) = -1 → inseria após D4)
  const l34SkipPos = blocos_skip.indexOf("L3.4");
  if (l34SkipPos !== -1) {
    // L3.4 não ativou → L3.4_CP entra após o último bloco D3 presente
    const l33Pos = blocos_ativos.indexOf("L3.3"); // sempre presente (SEMPRE)
    const l32Pos = blocos_ativos.indexOf("L3.2"); // pode estar no skip
    const l31Pos = blocos_ativos.indexOf("L3.1"); // pode estar no skip
    // insertAfter = maior posição entre L3.3, L3.1, L3.2 que estiver no plano
    // L3.3 é âncora garantida (tipo SEMPRE) — nunca -1
    const insertAfter = Math.max(l33Pos, l32Pos, l31Pos);
    blocos_ativos.splice(insertAfter + 1, 0, "L3.4_CP" as LineId);
    motivos["L3.4_CP" as LineId] = "L3.4 não ativou → L3.4_CP ativa (default)";
  }

  return {
    blocos_ativos,
    blocos_skip,
    motivos: motivos as Record<LineId, string>,
    orcamento_global_inicial: 30,
    orcamento_d3_inicial: 5,
  };
}

// ─────────────────────────────────────────
// HELPER: dimensão de um bloco
// ─────────────────────────────────────────
function getDimensao(line_id: LineId | string): "D1" | "D2" | "D3" | "D4" {
  if (line_id.startsWith("L1")) return "D1";
  if (line_id.startsWith("L2")) return "D2";
  if (line_id.startsWith("L3")) return "D3";
  return "D4";
}

function getTipo(line_id: LineId | string, plan: ExecutionPlan): "SEMPRE" | "CONDICIONAL" {
  const cfg = SEQUENCIA_BLOCOS.find(b => b.line_id === line_id);
  if (cfg) return cfg.tipo;
  // L3.4_CP é SEMPRE dentro do plano (é o default D3)
  if ((line_id as string) === "L3.4_CP") return "SEMPRE";
  return "SEMPRE";
}

// ─────────────────────────────────────────
// HANDLER: POST /plan
// ─────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function handlePlan(
  supabase: any,
  user_id: string,
  ipe_cycle_id: string
): Promise<Response> {
  // Verificar ciclo
  const { data: cycle, error: cycleErr } = await supabase
    .from("ipe_cycles")
    .select("id, status, user_id")
    .eq("id", ipe_cycle_id)
    .eq("user_id", user_id)
    .single();

  if (cycleErr || !cycle) return json({ error: "NOT_FOUND", message: "Cycle not found" }, 404);
  if (cycle.status === "complete" || cycle.status === "abandoned") {
    return json({ error: "INVALID_INPUT", message: `Cycle is ${cycle.status}` }, 400);
  }

  // Verificar se plano já existe (idempotência)
  const { data: existingState } = await supabase
    .from("questionnaire_state")
    .select("id, execution_plan, status")
    .eq("ipe_cycle_id", ipe_cycle_id)
    .maybeSingle();

  if (existingState && existingState.status !== "abandoned") {
    return json({
      questionnaire_state_id: existingState.id,
      execution_plan: existingState.execution_plan,
      blocos_ativos_count: (existingState.execution_plan as ExecutionPlan)?.blocos_ativos?.length ?? 0,
    }, 200);
  }

  // Carregar pill_scoring do ciclo
  const { data: scorings } = await supabase
    .from("pill_scoring")
    .select("*")
    .eq("ipe_cycle_id", ipe_cycle_id);

  const semPills = !scorings || scorings.length === 0;
  const plan = buildExecutionPlan((scorings ?? []) as PillScoring[], semPills);

  // Persistir questionnaire_state
  const stateId = crypto.randomUUID();
  const { error: insertErr } = await supabase
    .from("questionnaire_state")
    .insert({
      id: stateId,
      ipe_cycle_id,
      execution_plan: plan,
      current_position: 0,
      orcamento_global_restante: plan.orcamento_global_inicial,
      orcamento_d3_restante: plan.orcamento_d3_inicial,
      contador_d3_blocos: 0,
      resultados_por_bloco: {},
      flags: {
        sem_dados_pills: semPills,
        bloco_aguardando_variante: null,
        variante_a_servir_pendente: null,
        principal_resposta_pendente: null,
      } as QuestionnaireFlags,
      status: "planned",
      last_block_completed: null,
    });

  if (insertErr) {
    console.error("QUESTIONNAIRE_STATE_INSERT_ERROR:", insertErr);
    return json({ error: "INTERNAL_ERROR", message: "Failed to persist plan" }, 500);
  }

  // Atualizar ciclo para status questionnaire
  await supabase
    .from("ipe_cycles")
    .update({ status: "questionnaire" })
    .eq("id", ipe_cycle_id);

  return json({
    questionnaire_state_id: stateId,
    execution_plan: plan,
    blocos_ativos_count: plan.blocos_ativos.length,
  }, 200);
}

// ─────────────────────────────────────────
// HANDLER: POST /next-block
// ─────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function handleNextBlock(
  supabase: any,
  user_id: string,
  ipe_cycle_id: string,
  block_response?: Record<string, unknown>
): Promise<Response> {
  // B4 FIX: verificar ownership do ciclo antes de carregar estado
  // Sem isso, qualquer token válido com ipe_cycle_id conhecido pode avançar
  // o questionário de outro usuário (service_role bypassa RLS)
  const { data: cycleCheck, error: cycleCheckErr } = await supabase
    .from("ipe_cycles")
    .select("id")
    .eq("id", ipe_cycle_id)
    .eq("user_id", user_id)
    .single();

  if (cycleCheckErr || !cycleCheck) {
    return json({ error: "NOT_FOUND", message: "Cycle not found" }, 404);
  }

  // Carregar estado atual
  const { data: state, error: stateErr } = await supabase
    .from("questionnaire_state")
    .select("*")
    .eq("ipe_cycle_id", ipe_cycle_id)
    .single();

  if (stateErr || !state) {
    return json({ error: "NOT_FOUND", message: "questionnaire_state not found — call /plan first" }, 404);
  }
  if (state.status === "complete") {
    return json({ done: true, next_block: null, variante_a_servir: null,
                  aguardando_variante: false, dimension_transition: null,
                  questionnaire_state_id: state.id }, 200);
  }

  const plan = state.execution_plan as ExecutionPlan;
  const flags = (state.flags ?? {}) as QuestionnaireFlags;
  const resultados = (state.resultados_por_bloco ?? {}) as Record<string, ResultadoBloco>;
  let orcamento_global = state.orcamento_global_restante ?? plan.orcamento_global_inicial;
  let orcamento_d3 = state.orcamento_d3_restante ?? plan.orcamento_d3_inicial;
  let contador_d3 = state.contador_d3_blocos ?? 0;
  let current_position = state.current_position ?? 0;

  // E4: Carregar pill_scorings para passar ao scoring-block (lazy — só carrega quando necessário)
  // O engine real precisa de pill_data por bloco (DESIGN_ENGINE v1.0 §2.1, §3.2)
  let _pillScoringsCache: PillScoring[] | null = null;
  async function loadPillScorings(): Promise<PillScoring[]> {
    if (_pillScoringsCache !== null) return _pillScoringsCache;
    const { data } = await supabase
      .from("pill_scoring")
      .select("*")
      .eq("ipe_cycle_id", ipe_cycle_id);
    _pillScoringsCache = (data ?? []) as PillScoring[];
    return _pillScoringsCache;
  }

  /** Retorna PillDataAgregado para um bloco — nunca null (convenção §2.1) */
  async function getPillData(blockId: LineId): Promise<PillDataAgregado> {
    const scorings = await loadPillScorings();
    if (scorings.length === 0) return defaultPillData();
    return agregarDadosPills(scorings, blockId);
  }

  // ── Processar block_response (se presente) ──────────────────
  if (block_response) {
    const block_id = block_response.block_id as string;
    const principal = block_response.principal_resposta as string | null;
    const variante = block_response.variante_resposta as string | null;
    const protecao = block_response.protecao_etica as boolean ?? false;
    const tempo = block_response.tempo_resposta_segundos as number | null;

    const aguardandoVariante = flags.bloco_aguardando_variante;

    if (aguardandoVariante && aguardandoVariante === block_id) {
      // ── C2/C3: chegou resposta de variante — scoring final do bloco ──
      const principalPendente = flags.principal_resposta_pendente ?? null;

      // Persistir block_response com variante
      await supabase.from("block_responses").upsert({
        ipe_cycle_id,
        block_id,
        position: current_position,
        principal_resposta: principalPendente,
        variante_servida: flags.variante_a_servir_pendente ?? null,
        variante_resposta: variante,
        protecao_etica: protecao,
        tempo_resposta_segundos: tempo,
      }, { onConflict: "ipe_cycle_id,block_id" });

      // Chamar ipe-scoring-block com principal + variante
      // E4: agora passa pill_data e variante_servida (DESIGN_ENGINE v1.0 §2.1)
      const scoringResult = await callScoringBlock(supabase, {
        ipe_cycle_id,
        block_id: block_id as LineId,
        principal_resposta: principalPendente,
        variante_resposta: variante,
        variante_servida: (['Origem', 'Custo', 'C_D'].includes(flags.variante_a_servir_pendente as string)
          ? flags.variante_a_servir_pendente as 'Origem' | 'Custo' | 'C_D'
          : null),
        protecao_etica: protecao,
        pill_data: await getPillData(block_id as LineId),
      });

      // Persistir resultado final do bloco
      // R1.1 FIX: usar faixa_final (pós-integração pill↔questionário), não faixa_preliminar
      const resultado: ResultadoBloco = {
        il_canonico: scoringResult.il_canonico,
        confianca: scoringResult.confianca,
        variante_usada: flags.variante_a_servir_pendente ?? null,
        protecao_etica: protecao,
        scoring_version: null,
        corte_pendente_apos_principal: flags.bloco_aguardando_variante
          ? (scoringResult.corte_pendente ?? null) : null,
        faixa_final: scoringResult.faixa_final,
      };
      resultados[block_id] = resultado;

      // Decrementar orçamentos (variante = +1 pergunta)
      orcamento_global -= 1;
      const dim = getDimensao(block_id);
      if (dim === "D3") {
        orcamento_d3 -= 1;
        contador_d3 += 1; // B2 FIX: incrementar aqui também — bloco D3 completo com variante
      }

      // Limpar estado intra-bloco
      flags.bloco_aguardando_variante = null;
      flags.variante_a_servir_pendente = null;
      flags.principal_resposta_pendente = null;

      // I1 FIX: atualizar last_block_completed com o bloco finalizado
      state.last_block_completed = block_id as LineId;
      // N2 FIX: manter último bloco para cálculo de dimension_transition
      flags.last_block_for_transition = block_id as LineId;

      // Avançar posição
      current_position += 1;

    } else {
      // ── Chegou resposta de pergunta principal ──
      // Idempotência: verificar se já processado
      const jaProcessado = resultados[block_id];
      if (!jaProcessado) {
        // Persistir block_response (principal apenas por ora)
        await supabase.from("block_responses").upsert({
          ipe_cycle_id,
          block_id,
          position: current_position,
          principal_resposta: principal,
          variante_servida: null,
          variante_resposta: null,
          protecao_etica: protecao,
          tempo_resposta_segundos: tempo,
        }, { onConflict: "ipe_cycle_id,block_id" });

        // Chamar ipe-scoring-block com principal apenas (scoring provisório)
        // N3 NOTA: il_canonico deste resultado é DESCARTADO quando variante é servida.
        // Objetivo exclusivo: obter corte_pendente + faixa_preliminar para decidir variante.
        // IL definitivo virá do scoring final (principal + variante). Ruído de auditoria
        // aceito para piloto — scoring_audit registra este IL intermediário. AFC após Fase 5.
        // E4: agora passa pill_data e variante_servida=null (DESIGN_ENGINE v1.0 §2.1)
        const scoringResult = await callScoringBlock(supabase, {
          ipe_cycle_id,
          block_id: block_id as LineId,
          principal_resposta: principal,
          variante_resposta: null,
          variante_servida: null,
          protecao_etica: protecao,
          pill_data: await getPillData(block_id as LineId),
        });

        const dim = getDimensao(block_id);
        const tipo = getTipo(block_id, plan);

        // N4 FIX: decrementar ANTES de calcMaxPerguntasBloco
        // Antes: calcMax recebia orcamento pré-decremento → podia autorizar variante
        // sem orçamento real. Ex: orcamento=2 → maxP=2 → decrementa → orcamento=1 → sem budget
        orcamento_global -= 1;
        if (dim === "D3") {
          orcamento_d3 -= 1;
        }

        // Verificar se deve servir variante (com orçamento já decrementado)
        const maxP = calcMaxPerguntasBloco(
          dim, tipo, orcamento_global, orcamento_d3, contador_d3
        );

        const varianteNome = selecionarVariante(
          block_id as LineId,
          scoringResult.corte_pendente,
          scoringResult.faixa_preliminar,
          orcamento_global  // já decrementado pela principal
        );

        if (varianteNome && maxP !== "SKIP" && maxP >= 2) {
          // Servir variante — setar estado intra-bloco
          flags.bloco_aguardando_variante = block_id as LineId;
          flags.variante_a_servir_pendente = varianteNome;
          flags.principal_resposta_pendente = principal;

          // Persistir estado sem avançar posição
          await persistState(supabase, state.id, {
            current_position,
            orcamento_global_restante: orcamento_global,
            orcamento_d3_restante: orcamento_d3,
            contador_d3_blocos: contador_d3,
            resultados_por_bloco: resultados,
            flags,
            status: "in_progress",
            last_block_completed: state.last_block_completed,
          });

          return json({
            done: false,
            next_block: block_id,
            variante_a_servir: varianteNome,
            aguardando_variante: true,
            dimension_transition: null,
            questionnaire_state_id: state.id,
          } as NextBlockOutput, 200);
        }

        // Sem variante — finalizar bloco
        // R1.1 FIX: usar faixa_final (pós-integração pill↔questionário), não faixa_preliminar
        const resultado: ResultadoBloco = {
          il_canonico: scoringResult.il_canonico,
          confianca: scoringResult.confianca,
          variante_usada: null,
          protecao_etica: protecao,
          scoring_version: null,
          corte_pendente_apos_principal: scoringResult.corte_pendente,
          faixa_final: scoringResult.faixa_final,
        };
        resultados[block_id] = resultado;

        if (dim === "D3") {
          contador_d3 += 1;
        }

        // I1 FIX: atualizar last_block_completed com o bloco finalizado
        state.last_block_completed = block_id as LineId;
        // N2 FIX: manter último bloco para cálculo de dimension_transition
        flags.last_block_for_transition = block_id as LineId;
      }

      // Avançar posição
      current_position += 1;
    }
  }

  // ── Determinar próximo bloco ──────────────────────────────────
  const nextResult = determinarProximoBloco(
    plan,
    resultados,
    flags,
    current_position,
    orcamento_global,
    orcamento_d3,
    contador_d3
  );

  // Verificar late activation L1.3 se necessário
  if (nextResult.line_id === "L1.3_CHECK") {
    // Posição 4 — verificar late activation
    // E4: reutiliza cache de pillScorings (evita query duplicada)
    const pillDataL13 = agregarDadosPills(await loadPillScorings(), "L1.3");
    const lateActivation = checkLateActivationL13(
      resultados as Record<LineId, ResultadoBloco>,
      pillDataL13
    );
    if (lateActivation) {
      flags.late_activation_l1_3 = true;
      // Inserir L1.3 no plano (mutação local do plano em memória)
      const l12Pos = plan.blocos_ativos.indexOf("L1.2");
      if (l12Pos >= 0 && !plan.blocos_ativos.includes("L1.3")) {
        plan.blocos_ativos.splice(l12Pos + 1, 0, "L1.3");
        plan.motivos["L1.3"] = "late activation: L1.1 ou L1.2 Faixa A + L1.3 Pills Faixa B";
      }
    } else {
      // N1 FIX: marcar check como realizado mesmo quando late activation não dispara
      // Sem isso, determinarProximoBloco retorna "L1.3_CHECK" infinitamente
      flags.late_activation_l1_3 = false; // false = avaliado e não ativou
    }
    // Re-determinar após late activation check
    const nextAfterLate = determinarProximoBloco(
      plan, resultados, flags, current_position,
      orcamento_global, orcamento_d3, contador_d3
    );
    return await finalizarNextBlock(supabase, state.id, nextAfterLate, plan,
      current_position, orcamento_global, orcamento_d3, contador_d3,
      resultados, flags, (state.last_block_completed as LineId | null));
  }

  return await finalizarNextBlock(supabase, state.id, nextResult, plan,
    current_position, orcamento_global, orcamento_d3, contador_d3,
    resultados, flags, (state.last_block_completed as LineId | null));
}

// ─────────────────────────────────────────
// DETERMINAR PRÓXIMO BLOCO
// ─────────────────────────────────────────
function determinarProximoBloco(
  plan: ExecutionPlan,
  resultados: Record<string, ResultadoBloco>,
  flags: QuestionnaireFlags,
  current_position: number,
  orcamento_global: number,
  orcamento_d3: number,
  contador_d3: number
): { line_id: LineId | "L1.3_CHECK" | null; dimension_transition: string | null } {
  const executados = new Set(Object.keys(resultados));

  for (const lid of plan.blocos_ativos) {
    if (executados.has(lid)) continue;

    // B1 FIX: Late activation check para L1.3
    // Dispara quando próximo bloco seria L1.4 E L1.3 está no skip
    // E late activation ainda não avaliada E L1.1+L1.2 já executados
    // Fonte: PIPELINE_EXECUCAO §3.4 — condição 2b
    if (lid === "L1.4"
        && plan.blocos_skip?.includes("L1.3")
        && !flags.late_activation_l1_3
        && executados.has("L1.1")
        && executados.has("L1.2")) {
      return { line_id: "L1.3_CHECK" as unknown as LineId, dimension_transition: null };
    }

    const dim = getDimensao(lid);
    const tipo = getTipo(lid, plan);

    const maxP = calcMaxPerguntasBloco(dim, tipo, orcamento_global, orcamento_d3, contador_d3);
    if (maxP === "SKIP") continue; // orçamento esgotado para este bloco

    // N2 FIX: usar last_block do state — Object.keys(resultados).pop() não garante ordem
    // last_block_completed é atualizado a cada bloco finalizado (I1 FIX)
    const prevDim = flags.last_block_for_transition
      ? getDimensao(flags.last_block_for_transition as string)
      : null;
    const currDim = getDimensao(lid);
    const transition = prevDim && prevDim !== currDim ? `${prevDim}→${currDim}` : null;

    return { line_id: lid as LineId, dimension_transition: transition };
  }

  return { line_id: null, dimension_transition: null };
}

// ─────────────────────────────────────────
// FINALIZAR next-block: persistir + retornar
// ─────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function finalizarNextBlock(
  supabase: any,
  state_id: string,
  nextResult: { line_id: LineId | null; dimension_transition: string | null },
  plan: ExecutionPlan,
  current_position: number,
  orcamento_global: number,
  orcamento_d3: number,
  contador_d3: number,
  resultados: Record<string, ResultadoBloco>,
  flags: QuestionnaireFlags,
  last_block_completed: LineId | null
): Promise<Response> {
  const done = nextResult.line_id === null;

  // Flag fadiga_extrema
  const totalPerguntas = plan.orcamento_global_inicial - orcamento_global;
  if (totalPerguntas > 25) flags.fadiga_extrema = true;

  await persistState(supabase, state_id, {
    current_position,
    orcamento_global_restante: orcamento_global,
    orcamento_d3_restante: orcamento_d3,
    contador_d3_blocos: contador_d3,
    resultados_por_bloco: resultados,
    flags,
    status: done ? "complete" : "in_progress",
    last_block_completed,
    execution_plan: plan, // atualizado se late activation modificou o plano
  });

  return json({
    done,
    next_block: nextResult.line_id ?? null,
    variante_a_servir: null,
    aguardando_variante: false,
    dimension_transition: nextResult.dimension_transition,
    questionnaire_state_id: state_id,
  } as NextBlockOutput, 200);
}

// ─────────────────────────────────────────
// PERSISTIR ESTADO
// ─────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function persistState(
  supabase: any,
  state_id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("questionnaire_state")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", state_id);
  if (error) console.error("QUESTIONNAIRE_STATE_UPDATE_ERROR:", error);
}

// ─────────────────────────────────────────
// CHAMAR ipe-scoring-block (síncrono)
// Fonte: PIPELINE_IMPLEMENTACAO §5.1 + DESIGN_ENGINE v1.0 §2.1 (E4)
// E4: assinatura expandida para BlockScoringInputFull (pill_data + variante_servida)
// ─────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function callScoringBlock(
  supabase: any,
  input: BlockScoringInputFull,
): Promise<BlockScoringOutputFull> {
  const scoringUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ipe-scoring-block`;
  try {
    const resp = await fetch(scoringUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(input),
    });
    if (!resp.ok) throw new Error(`ipe-scoring-block HTTP ${resp.status}`);
    return await resp.json() as BlockScoringOutputFull;
  } catch (err) {
    console.error("SCORING_BLOCK_ERROR:", err);
    // Degradação graciosa: IL null, sem variante — retorna OutputFull completo
    return {
      block_id: input.block_id,
      il_canonico: null,
      confianca: "baixa",
      scoring_audit_id: crypto.randomUUID(),
      corte_pendente: null,
      faixa_preliminar: "indeterminada",
      faixa_final: "indeterminada",
      caso_integracao: 0,
      nivel_fallback: 0,
      analise_questionario: {
        cortes: {
          "2_4": { decisao: "INDETERMINADO", gcc: "nao_aplicavel", evidencia: "Scoring error" },
          "4_6": { decisao: "INDETERMINADO", gcc: "nao_aplicavel", evidencia: "Scoring error" },
          "6_8": { decisao: "INDETERMINADO", gcc: "nao_aplicavel", evidencia: "Scoring error" },
        },
        faixa_questionario: "indeterminada",
        il_questionario: null,
      },
      nota_auditoria: "callScoringBlock fallback — HTTP error or timeout",
      flags: { scoring_error: true },
    };
  }
}

// ─────────────────────────────────────────
// MAIN HANDLER — roteamento por path
// ─────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "UNAUTHORIZED", message: "Missing authorization" }, 401);
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  if (path !== "plan" && path !== "next-block") {
    return json({ error: "NOT_FOUND", message: "Use /plan or /next-block" }, 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_INPUT", message: "Body must be valid JSON" }, 400);
  }

  if (typeof body.ipe_cycle_id !== "string") {
    return json({ error: "INVALID_INPUT", message: "ipe_cycle_id required" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);

  if (path === "plan") {
    return await handlePlan(supabase, user.id, body.ipe_cycle_id as string);
  }

  // next-block
  return await handleNextBlock(
    supabase,
    user.id,
    body.ipe_cycle_id as string,
    body.block_response as Record<string, unknown> | undefined
  );
});
