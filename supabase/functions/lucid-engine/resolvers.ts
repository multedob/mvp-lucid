// ============================================================
// resolvers.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fontes: SNAPSHOT_RESOLUTION_PROTOCOL_v2.2.1,
//         PREVIOUS_NODE_RESOLUTION_PROTOCOL_v2.2.2,
//         HISTORICAL_MEMORY_RESOLUTION_SPEC_v1.1,
//         EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1
// Natureza: I/O — queries ao Supabase
// Posição: PHASE 1–3 + PHASE 6 (pre-Core, pre-Transaction)
// ============================================================

import type {
  StructuralSnapshot,
  PreviousNode,
  HistoricalNode,
  HagoState,
  NodeType,
  DensityClass,
} from "./types.ts";
import { STATIC_BASE_SNAPSHOT } from "./types.ts";

// Supabase client type (injetado pela Edge — evita import circular)
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// ─────────────────────────────────────────
// PHASE 1 — STRUCTURAL MODEL BINDING
// Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 1
// Retorna a versão estrutural ativa do registry
// Garante exatamente uma versão ativa
// ─────────────────────────────────────────

export async function resolveStructuralModelVersion(
  supabase: SupabaseClient
): Promise<string> {
  const { data, error } = await supabase
    .from("structural_model_registry")
    .select("structural_model_version")
    .eq("active", true);

  if (error) {
    throw new Error(`INTERNAL_CONFIGURATION_ERROR: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(
      "INTERNAL_CONFIGURATION_ERROR: no active structural_model_version found"
    );
  }
  if (data.length > 1) {
    throw new Error(
      "INTERNAL_CONFIGURATION_ERROR: multiple active structural_model_version found"
    );
  }

  return data[0].structural_model_version as string;
}

// ─────────────────────────────────────────
// PHASE 2 — SNAPSHOT RESOLUTION
// Fonte: SNAPSHOT_RESOLUTION_PROTOCOL_v2.2.1
// base_version == 0 → STATIC_BASE_SNAPSHOT
// base_version > 0  → SELECT FROM structural_snapshots
// Retorna: { snapshot, cycle_id }
// ─────────────────────────────────────────

export interface SnapshotResolutionResult {
  snapshot:  StructuralSnapshot;
  cycle_id:  string | null; // null se base_version == 0
}

export async function resolveSnapshot(
  supabase:     SupabaseClient,
  user_id:      string,
  base_version: number
): Promise<SnapshotResolutionResult> {
  // base_version == 0 → estado sentinela de bootstrap
  if (base_version === 0) {
    return { snapshot: { ...STATIC_BASE_SNAPSHOT }, cycle_id: null };
  }

  // Buscar cycle_id correspondente ao base_version
  const { data: cycleRow, error: cycleErr } = await supabase
    .from("cycles")
    .select("id")
    .eq("user_id", user_id)
    .eq("version", base_version)
    .single();

  if (cycleErr || !cycleRow) {
    throw new VersionConflictError(
      `VERSION_CONFLICT: no cycle found for user ${user_id} version ${base_version}`
    );
  }

  const cycle_id: string = cycleRow.id;

  // Buscar snapshot correspondente
  const { data: snapRow, error: snapErr } = await supabase
    .from("structural_snapshots")
    .select("snapshot_json")
    .eq("cycle_id", cycle_id)
    .single();

  if (snapErr || !snapRow) {
    throw new Error(
      `INTERNAL_STRUCTURAL_INCONSISTENCY: no snapshot for cycle_id ${cycle_id}`
    );
  }

  const snapshot = snapRow.snapshot_json as StructuralSnapshot;

  return { snapshot, cycle_id };
}

// ─────────────────────────────────────────
// PHASE 3 — PREVIOUS NODE RESOLUTION
// Fonte: PREVIOUS_NODE_RESOLUTION_PROTOCOL_v2.2.2
// base_version == 0 → null
// base_version > 0  → SELECT FROM node_history ORDER BY distance ASC, node_id ASC
// Retorna apenas: { node_id, node_type, density_class }
// macro_band e distance NÃO integram PreviousNode
// ─────────────────────────────────────────

export async function resolvePreviousNode(
  supabase:  SupabaseClient,
  cycle_id:  string | null,
): Promise<PreviousNode | null> {
  // base_version == 0 → nenhum ciclo anterior
  if (cycle_id === null) return null;

  const { data, error } = await supabase
    .from("node_history")
    .select("node_id, node_type, density_class, distance")
    .eq("cycle_id", cycle_id)
    .order("distance", { ascending: true })
    .order("node_id", { ascending: true });

  if (error) {
    throw new Error(`INTERNAL_ERROR: node_history query failed: ${error.message}`);
  }

  if (!data || data.length === 0) return null;

  // Primeiro registro após ordenação determinística
  const row = data[0];

  // Retornar apenas os 3 campos permitidos pelo contrato
  // macro_band e distance excluídos
  return {
    node_id:       row.node_id       as string,
    node_type:     row.node_type     as NodeType,
    density_class: row.density_class as DensityClass,
  };
}

// ─────────────────────────────────────────
// HISTORICAL MEMORY RESOLUTION
// Fonte: HISTORICAL_MEMORY_RESOLUTION_SPEC_v1.1
// base_version == 0 → []
// base_version > 0  → últimos 7 nodes ativados
// ORDER BY version DESC, distance ASC, node_id ASC
// ─────────────────────────────────────────

export async function resolveHistoricalMemory(
  supabase:     SupabaseClient,
  user_id:      string,
  base_version: number
): Promise<HistoricalNode[]> {
  if (base_version === 0) return [];

  const { data, error } = await supabase
    .from("node_history")
    .select(`
      node_id,
      node_type,
      distance,
      cycles!inner(user_id, version)
    `)
    .eq("cycles.user_id", user_id)
    .lte("cycles.version", base_version)
    .order("version", { ascending: false, foreignTable: "cycles" })
    .order("distance", { ascending: true })
    .order("node_id", { ascending: true })
    .limit(7);

  if (error) {
    throw new Error(
      `INTERNAL_ERROR: historical_memory query failed: ${error.message}`
    );
  }

  if (!data || data.length === 0) return [];

  return data.map((row: Record<string, unknown>) => ({
    node_id:   row.node_id  as string,
    node_type: row.node_type as NodeType,
    // source_work: não disponível no schema v3.3 — omitido
  })) as HistoricalNode[];
}

// ─────────────────────────────────────────
// PREVIOUS HAGO STATE RESOLUTION
// Não especificado em STRUCTURAL_CORE_CONTRACT_v1.8
// Ambiguidade A9: Edge injeta o hago_state do ciclo anterior
// Fonte: cycles.hago_state — campo não existente no schema v3.3
// Decisão MVP: não persiste hago_state → usar H0 como default
// Declaração: se o schema for atualizado para persistir hago_state,
//             remover esta função e fazer SELECT direto
// ─────────────────────────────────────────

export async function resolvePreviousHagoState(
  supabase:  SupabaseClient,
  user_id:   string
): Promise<HagoState> {
  const { data, error } = await supabase
    .from('cycles')
    .select('hago_state')
    .eq('user_id', user_id)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 'H0';
  return data.hago_state as HagoState;
}

// ─────────────────────────────────────────
// PREVIOUS LINES RESOLUTION
// Necessário para V_norm no cálculo MD do RADAR
// Fonte: RADAR_v6, seção 5 (V_norm)
// base_version == 0 → null (sem ciclo anterior)
// base_version > 0  → raw_input_json.d1..d4 do ciclo base
// ─────────────────────────────────────────

export async function resolvePreviousLines(
  supabase:  SupabaseClient,
  cycle_id:  string | null
): Promise<number[] | null> {
  if (cycle_id === null) return null;

  const { data, error } = await supabase
    .from("cycles")
    .select("raw_input_json")
    .eq("id", cycle_id)
    .single();

  if (error || !data) return null;

  const raw = data.raw_input_json as Record<string, unknown>;

  // Reconstruir array de 16 linhas a partir de d1..d4
  try {
    const d1 = raw["d1"] as number[];
    const d2 = raw["d2"] as number[];
    const d3 = raw["d3"] as number[];
    const d4 = raw["d4"] as number[];

    if (
      Array.isArray(d1) && d1.length === 4 &&
      Array.isArray(d2) && d2.length === 4 &&
      Array.isArray(d3) && d3.length === 4 &&
      Array.isArray(d4) && d4.length === 4
    ) {
      return [...d1, ...d2, ...d3, ...d4];
    }
  } catch {
    // Dados inválidos → tratar como primeiro ciclo
  }

  return null;
}

// ─────────────────────────────────────────
// PHASE 6 — PREVIOUS CYCLE HASH RESOLUTION
// Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 6
// base_version == 0 → null (string vazia no hash formula)
// base_version > 0  → SELECT cycle_integrity_hash FROM cycles
// ─────────────────────────────────────────

export async function resolvePreviousCycleHash(
  supabase:  SupabaseClient,
  cycle_id:  string | null
): Promise<string | null> {
  if (cycle_id === null) return null;

  const { data, error } = await supabase
    .from("cycles")
    .select("cycle_integrity_hash")
    .eq("id", cycle_id)
    .single();

  if (error || !data) {
    throw new Error(
      `INTERNAL_HASH_INCONSISTENCY: cycle_integrity_hash not found for cycle_id ${cycle_id}`
    );
  }

  return data.cycle_integrity_hash as string;
}

// ─────────────────────────────────────────
// ERROR CLASSES
// Permite distinção de código HTTP na Edge
// ─────────────────────────────────────────

export class VersionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionConflictError";
  }
}

export class InternalConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalConfigError";
  }
}
