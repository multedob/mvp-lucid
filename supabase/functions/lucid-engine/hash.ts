// ============================================================
// hash.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fontes: CANONICAL_JSON_SPEC_v1.1,
//         STRUCTURAL_CORE_CONTRACT_v1.8 seção 8,
//         TRANSACTION_PROTOCOL_v3.4 seção 4,
//         EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1 PHASE 6
// Runtime: Deno — Web Crypto API (SubtleCrypto)
// ============================================================

import type {
  StructuralSnapshot,
  PreviousNode,
  SelectedNode,
  RadarInput,
} from "./types.ts";

// ─────────────────────────────────────────
// 1. CANONICALIZE
// Fonte: CANONICAL_JSON_SPEC_v1.1
// Regras:
//   - keys ASCII-sorted em todos os níveis
//   - sem whitespace, sem indentação
//   - arrays preservam ordem
//   - undefined removido
//   - null permitido apenas onde definido no schema
//   - números passam como estão
//   - snapshot já chega como string "X.XX"
// ─────────────────────────────────────────
export function canonicalize(value: unknown): string {
  if (value === null) return "null";

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`canonicalize: non-finite number not allowed: ${value}`);
    }
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const entries = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`
    );
    return `{${entries.join(",")}}`;
  }

  throw new Error(`canonicalize: unsupported type: ${typeof value}`);
}

// ─────────────────────────────────────────
// 2. SHA-256
// Runtime: Deno — Web Crypto API
// Fonte: CANONICAL_JSON_SPEC_v1.1, seção encoding_rules
//   - encoding: UTF-8
//   - hex_output_case: lowercase
// ─────────────────────────────────────────
export async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────
// 3. INPUT HASH
// Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 8
// Escopo: raw_input + previous_snapshot + previous_node
// Invariante: previous_snapshot nunca null
// Nota: raw_input é RadarInput (objeto numérico estruturado)
// ─────────────────────────────────────────
export async function computeInputHash(
  raw_input: RadarInput,
  previous_snapshot: StructuralSnapshot,
  previous_node: PreviousNode | null
): Promise<string> {
  if (previous_snapshot === null || previous_snapshot === undefined) {
    throw new Error("computeInputHash: previous_snapshot cannot be null");
  }

  // Keys em ordem ASCII para determinismo do canonicalize
  const payload = {
    previous_node,
    previous_snapshot,
    raw_input,
  };

  return sha256(canonicalize(payload));
}

// ─────────────────────────────────────────
// 4. STRUCTURAL HASH
// Fonte: STRUCTURAL_CORE_CONTRACT_v1.8, seção 8
// Escopo: structural_snapshot + node_selection + cycle_state
// Excluídos: audit_trace, contract_version,
//            structural_model_version,
//            input_classification, historical_memory
// C2.1: cycle_state incluído no hash — dois ciclos com inputs idênticos
// mas estados de ciclo diferentes são ciclos distintos e devem ter hashes
// distintos. Omitir cycle_state cria colisões auditáveis silenciosas.
// ─────────────────────────────────────────
export async function computeStructuralHash(
  structural_snapshot: StructuralSnapshot,
  node_selection: SelectedNode[],
  cycle_state: string  // C2.1: "S0" | "S1" | "S2"
): Promise<string> {
  const payload = {
    cycle_state,
    node_selection,
    structural_snapshot,
  };

  return sha256(canonicalize(payload));
}

// ─────────────────────────────────────────
// 5. CYCLE INTEGRITY HASH
// Fonte: TRANSACTION_PROTOCOL_v3.4, seção 4
//        EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 6
// Fórmula: SHA256(
//   previous_cycle_hash +
//   input_hash +
//   structural_hash +
//   structural_model_version
// )
// Regra: concatenação de strings — NÃO canonicalize de objeto
// Regra: previous_cycle_hash null → string vazia ""
//        (base_version = 0, sem ciclo anterior)
// ─────────────────────────────────────────
export async function computeCycleIntegrityHash(
  previous_cycle_hash: string | null,
  input_hash: string,
  structural_hash: string,
  structural_model_version: string
): Promise<string> {
  const prev = previous_cycle_hash ?? "";
  const concatenated =
    prev + input_hash + structural_hash + structural_model_version;
  return sha256(concatenated);
}

// ─────────────────────────────────────────
// 6. LLM CONFIG HASH
// Fonte: EDGE_EXECUTION_SEQUENCE_SPEC_v1.11.1, PHASE 4
// Ambiguidade A7: optional_config_fields → canonicalize()
// ─────────────────────────────────────────
export async function computeLlmConfigHash(
  provider: string,
  model_id: string,
  temperature: number,
  optional_config: Record<string, unknown> = {}
): Promise<string> {
  // A7: campos opcionais canonicalizados para determinismo
  const payload =
    provider +
    model_id +
    String(temperature) +
    canonicalize(optional_config);

  return sha256(payload);
}

// ─────────────────────────────────────────
// 7. FORMAT HELPER
// Garante string "X.XX" para campos numéricos do snapshot
// Fonte: CANONICAL_JSON_SPEC_v1.1, seção value_rules
// ─────────────────────────────────────────
export function fmt2(n: number): string {
  return n.toFixed(2);
}

// ─────────────────────────────────────────
// 8. PROMPT HASH (MD-3)
// Versionamento formal do system prompt do LLM.
// SHA256(version_tag + prompt_content)
// Persiste como llm_prompt_hash nos ciclos futuros.
// Permite auditoria de qual prompt gerou cada resposta.
// ─────────────────────────────────────────
export async function computePromptHash(
  prompt_version: string,  // ex: "v1.1" — incrementar a cada mudança de prompt
  system_prompt: string
): Promise<string> {
  return sha256(prompt_version + system_prompt);
}
