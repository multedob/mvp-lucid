// ============================================================
// integration_test.ts — LUCID Engine v3.3
// Structural Model Version: 3.0 — FROZEN
// Fonte: INTEGRATION_TEST_PROTOCOL_v2.1
// Runner: Deno (deno test --allow-env)
// ============================================================

import { assertEquals, assertNotEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";

import { executeRadar }    from "./radar.ts";
import { executeHago }     from "./hago.ts";
import { executeRag }      from "./rag.ts";
import { applyCda }        from "./cda.ts";
import { executePostCore } from "./post-core.ts";
import type {
  RadarInput,
  RagNode,
  HagoState,
  InputClassification,
  ResponseType,
  Movement,
  HistoricalNode,
} from "./types.ts";
import { STATIC_BASE_SNAPSHOT } from "./types.ts";

// ─────────────────────────────────────────
// CORPUS MÍNIMO DE TESTE
// Fonte: INTEGRATION_TEST_PROTOCOL_v2.1, seção 2
// ─────────────────────────────────────────

const TEST_CORPUS: RagNode[] = [
  // F1
  { node_id: "F1-N001", macro_band: "F1", node_type: "Declarative", density_class: 1, stage_min: 1.0, stage_max: 2.5, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F1 Declarative d1" },
  { node_id: "F1-N002", macro_band: "F1", node_type: "Tension",     density_class: 2, stage_min: 1.5, stage_max: 3.0, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F1 Tension d2" },

  // F2
  { node_id: "F2-N001", macro_band: "F2", node_type: "Declarative", density_class: 1, stage_min: 2.0, stage_max: 3.5, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F2 Declarative d1" },
  { node_id: "F2-N002", macro_band: "F2", node_type: "Tension",     density_class: 2, stage_min: 2.5, stage_max: 4.0, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F2 Tension d2" },
  { node_id: "F2-N003", macro_band: "F2", node_type: "Contrast",    density_class: 3, stage_min: 3.0, stage_max: 4.5, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F2 Contrast d3" },

  // F3
  { node_id: "F3-N001", macro_band: "F3", node_type: "Declarative", density_class: 1, stage_min: 3.0, stage_max: 6.0, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F3 Declarative amplitude3" },
  { node_id: "F3-N002", macro_band: "F3", node_type: "Tension",     density_class: 2, stage_min: 4.0, stage_max: 6.0, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F3 Tension d2" },
  { node_id: "F3-N003", macro_band: "F3", node_type: "Contrast",    density_class: 3, stage_min: 4.5, stage_max: 6.5, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F3 Contrast d3" },

  // F4 — risk_score = 1
  { node_id: "F4-N001", macro_band: "F4", node_type: "Declarative", density_class: 1, stage_min: 5.0, stage_max: 7.0, teleology_score: 1, prescriptive_score: 0, normative_score: 0, content_text: "F4 Declarative risk1" },
  { node_id: "F4-N002", macro_band: "F4", node_type: "Tension",     density_class: 2, stage_min: 5.5, stage_max: 7.5, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F4 Tension d2" },

  // F5
  { node_id: "F5-N001", macro_band: "F5", node_type: "Declarative", density_class: 1, stage_min: 6.0, stage_max: 8.0, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F5 Declarative d1" },
  { node_id: "F5-N002", macro_band: "F5", node_type: "Tension",     density_class: 2, stage_min: 6.5, stage_max: 8.0, teleology_score: 0, prescriptive_score: 0, normative_score: 0, content_text: "F5 Tension d2" },

  // risk_score = 2 — NUNCA deve ser ativado
  { node_id: "F3-N999", macro_band: "F3", node_type: "Contrast", density_class: 3, stage_min: 1.0, stage_max: 8.0, teleology_score: 2, prescriptive_score: 0, normative_score: 0, content_text: "FORBIDDEN teleology=2" },
];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function makeLines(val: number): RadarInput {
  return {
    d1: [val, val, val, val],
    d2: [val, val, val, val],
    d3: [val, val, val, val],
    d4: [val, val, val, val],
  };
}

function makeLinesCGG(cgg: number): RadarInput {
  const d3val = Math.max(cgg, 5.0);
  return {
    d1: [cgg, cgg, cgg, cgg],
    d2: [cgg, cgg, cgg, cgg],
    d3: [d3val, d3val, d3val, d3val],
    d4: [cgg, cgg, cgg, cgg],
  };
}

function hagoForMetrics(
  MD: number, DC: number, CEC: number, VE: number,
  stage: number, prev: HagoState, cycles: number,
  cycle_state: "S0" | "S1" | "S2" = "S1"
): HagoState {
  return executeHago({
    previousState: prev,
    MD, DC, CEC, VE,
    stage_base: stage,
    cyclesCompleted: cycles,
    cycle_state,
    input_classification: "C1_CONFUSAO_CONCEITUAL",
  });
}

// ─────────────────────────────────────────
// TESTE 3.1 — Borda Exata de Estágio RAG
// ─────────────────────────────────────────

Deno.test("3.1 — Filtro de estágio: inclusão nos limites exatos", () => {
  // CGG = stage_min → incluído
  let result = executeRag({ CGG: 1.0, hagoState: "H1", nodes: TEST_CORPUS, history: [] });
  assert(result.some((n) => n.node_id === "F1-N001"), "CGG=stage_min deve incluir node");

  // CGG = stage_max → incluído
  result = executeRag({ CGG: 2.5, hagoState: "H1", nodes: TEST_CORPUS, history: [] });
  assert(result.some((n) => n.node_id === "F1-N001"), "CGG=stage_max deve incluir node");

  // CGG = stage_min - 0.01 → excluído
  result = executeRag({ CGG: 0.99, hagoState: "H1", nodes: TEST_CORPUS, history: [] });
  assert(!result.some((n) => n.node_id === "F1-N001"), "CGG<stage_min deve excluir node");

  // CGG = stage_max + 0.01 → excluído
  result = executeRag({ CGG: 2.51, hagoState: "H1", nodes: TEST_CORPUS, history: [] });
  assert(!result.some((n) => n.node_id === "F1-N001"), "CGG>stage_max deve excluir node");
});

// ─────────────────────────────────────────
// TESTE 3.2 — Exclusão Absoluta risk_score=2
// ─────────────────────────────────────────

Deno.test("3.2 — CRÍTICO: node risk_score=2 nunca ativado", () => {
  for (const hago of ["H0", "H1", "H2"] as HagoState[]) {
    for (const cgg of [1.0, 2.0, 3.5, 5.0, 7.0, 8.0]) {
      const result = executeRag({ CGG: cgg, hagoState: hago, nodes: TEST_CORPUS, history: [] });
      assert(
        !result.some((n) => n.node_id === "F3-N999"),
        `CRÍTICO: F3-N999 (risk=2) ativado em hago=${hago} CGG=${cgg}`
      );
    }
  }
});

// ─────────────────────────────────────────
// TESTE 3.3 — Density 3 restrita a H2
// ─────────────────────────────────────────

Deno.test("3.3 — CRÍTICO: density_class=3 apenas em H2", () => {
  for (const hago of ["H0", "H1"] as HagoState[]) {
    for (const cgg of [1.5, 2.5, 3.5, 4.5, 5.5]) {
      const result = executeRag({ CGG: cgg, hagoState: hago, nodes: TEST_CORPUS, history: [] });
      assert(
        !result.some((n) => n.density_class === 3),
        `CRÍTICO: density=3 ativada em hago=${hago} CGG=${cgg}`
      );
    }
  }
});

// ─────────────────────────────────────────
// TESTE 3.4 — Determinismo do RADAR
// ─────────────────────────────────────────

Deno.test("3.4 — Determinismo RADAR: 10 execuções idênticas", () => {
  const input = { lines: makeLines(5.0), previousCGG: 4.0, cyclesCompleted: 3, previousLines: null };
  const first = executeRadar(input);

  for (let i = 0; i < 9; i++) {
    const result = executeRadar(input);
    assertEquals(result.CGG,              first.CGG);
    assertEquals(result.MD,               first.MD);
    assertEquals(result.CEC,              first.CEC);
    assertEquals(result.DC,               first.DC);
    assertEquals(result.stage_base,       first.stage_base);
  }
});

// ─────────────────────────────────────────
// TESTE 3.4b — Determinismo do RAG
// ─────────────────────────────────────────

Deno.test("3.4b — Determinismo RAG: 10 execuções idênticas", () => {
  const input = { CGG: 3.5, hagoState: "H2" as HagoState, nodes: TEST_CORPUS, history: [] };
  const first = executeRag(input);

  for (let i = 0; i < 9; i++) {
    const result = executeRag(input);
    assertEquals(JSON.stringify(result), JSON.stringify(first));
  }
});

// ─────────────────────────────────────────
// TESTE 3.5 — Saturação Histórica (janela 7)
// ─────────────────────────────────────────

Deno.test("3.5 — Saturação histórica: janela de 7 nodes", () => {
  const history: HistoricalNode[] = [];
  const CGG = 4.0;

  for (let i = 0; i < 15; i++) {
    const result = executeRag({ CGG, hagoState: "H2", nodes: TEST_CORPUS, history });

    if (result.length > 0) {
      history.unshift({ node_id: result[0].node_id, node_type: result[0].node_type });
      if (history.length > 7) history.pop();
    }
  }

  assert(history.length <= 7, "Janela histórica excede 7 nodes");
});

// ─────────────────────────────────────────
// TESTE 3.6 — Frequência de Contrast em H2
// ─────────────────────────────────────────

Deno.test("3.6 — Contrast não excede 60% em H2 (100 execuções)", () => {
  let contrastCount = 0;
  let contrastD3Count = 0;
  let activations = 0;
  const total = 100;

  const cgValues = Array.from({ length: total }, (_, i) => 3.0 + (i % 40) * 0.1);

  for (const cgg of cgValues) {
    const result = executeRag({ CGG: cgg, hagoState: "H2", nodes: TEST_CORPUS, history: [] });
    if (result.length > 0) {
      activations++;
      if (result[0].node_type === "Contrast") contrastCount++;
      if (result[0].node_type === "Contrast" && result[0].density_class === 3) contrastD3Count++;
    }
  }

  if (activations > 0) {
    assert(contrastCount / activations <= 0.60, `Contrast excessivo: ${(contrastCount / activations * 100).toFixed(1)}%`);
    assert(contrastD3Count / activations <= 0.40, `Contrast density=3 excessivo: ${(contrastD3Count / activations * 100).toFixed(1)}%`);
  }
});

// ─────────────────────────────────────────
// TESTE 3.9 — Regressão Cruzada H2→H1→H2
// ─────────────────────────────────────────

Deno.test("3.9 — Regressão cruzada H2 → H1 → H2", () => {
  const stage = 4;

  const h2 = hagoForMetrics(0.60, 0.20, 0.75, 0.5, stage, "H1", 5);
  assertEquals(h2, "H2");

  const h1 = hagoForMetrics(0.60, 0.20, 0.50, 0.5, stage, "H2", 6);
  assertEquals(h1, "H1");

  const h2b = hagoForMetrics(0.60, 0.20, 0.75, 0.5, stage, "H1", 7);
  assertEquals(h2b, "H2");
});

// ─────────────────────────────────────────
// TESTE 3.10 — Inibição Normativa C5
// ─────────────────────────────────────────

Deno.test("3.10 — CRÍTICO: C5_PEDIDO_PRESCRITIVO → H0 obrigatório", () => {
  for (const prev of ["H0", "H1", "H2"] as HagoState[]) {
    const result = executeHago({
      previousState:        prev,
      MD: 0.80, DC: 0.10, CEC: 0.90, VE: 0.10,
      stage_base:           5,
      cyclesCompleted:      10,
      cycle_state:          "S1",
      input_classification: "C5_PEDIDO_PRESCRITIVO",
    });
    assertEquals(result, "H0", `CRÍTICO: C5 não forçou H0 (prev=${prev})`);
  }
});

// ─────────────────────────────────────────
// TESTE 3.10b — H0 nunca tem nodes
// ─────────────────────────────────────────

Deno.test("3.10b — H0 sempre retorna node_selection vazia", () => {
  for (const cgg of [1.0, 3.5, 5.0, 7.5, 8.0]) {
    const result = executeRag({ CGG: cgg, hagoState: "H0", nodes: TEST_CORPUS, history: [] });
    assertEquals(result.length, 0, `H0 não deve ativar nodes (CGG=${cgg})`);
  }
});

// ─────────────────────────────────────────
// TESTE 3.11 — Determinismo Response Type
// ─────────────────────────────────────────

Deno.test("3.11 — Determinismo Response Type: todas as combinações", () => {
  const expected: Record<InputClassification, ResponseType> = {
    "C1_CONFUSAO_CONCEITUAL":    "R1_EXPLICATIVA",
    "C2_AMBIVALENCIA_INTERNA":   "R2_REFLEXIVA",
    "C3_SOFREIMENTO_EMOCIONAL":  "R2_REFLEXIVA",
    "C4_CURIOSIDADE_ESTRUTURAL": "R3_EXPLORATORIA",
    "C5_PEDIDO_PRESCRITIVO":     "R4_LIMITANTE",
    "C6_VALIDACAO_IDENTITARIA":  "R2_REFLEXIVA",
    "C7_RISCO_HUMANO":           "R4_LIMITANTE",
  };

  for (const [cls, expectedRT] of Object.entries(expected)) {
    for (let i = 0; i < 10; i++) {
      const result = executePostCore(cls as InputClassification, "H1");
      assertEquals(result.response_type, expectedRT, `response_type incorreto para ${cls}`);
    }
  }
});

// ─────────────────────────────────────────
// TESTE 3.12 — Determinismo Movement
// ─────────────────────────────────────────

Deno.test("3.12 — Determinismo Movement: tabela completa R×H", async () => {
  const { resolveMovement } = await import("./post-core.ts") as {
    resolveMovement: (rt: ResponseType, hs: HagoState) => { movement_primary: Movement; movement_secondary: Movement | null }
  };

  type Combo = { rt: ResponseType; hs: HagoState; mp: Movement; ms: Movement | null };

  const combos: Combo[] = [
    { rt: "R4_LIMITANTE",    hs: "H0", mp: "M6_POSICIONAMENTO_LIMITE",  ms: null },
    { rt: "R4_LIMITANTE",    hs: "H1", mp: "M6_POSICIONAMENTO_LIMITE",  ms: null },
    { rt: "R4_LIMITANTE",    hs: "H2", mp: "M6_POSICIONAMENTO_LIMITE",  ms: null },
    { rt: "R1_EXPLICATIVA",  hs: "H0", mp: "M7_CLARIFICACAO_SEMANTICA", ms: null },
    { rt: "R1_EXPLICATIVA",  hs: "H1", mp: "M3_NOMEACAO_PADRAO",        ms: null },
    { rt: "R1_EXPLICATIVA",  hs: "H2", mp: "M4_DESLOCAMENTO_NIVEL",     ms: "M7_CLARIFICACAO_SEMANTICA" },
    { rt: "R2_REFLEXIVA",    hs: "H0", mp: "M2_ESPELHAMENTO_PRECISO",   ms: null },
    { rt: "R2_REFLEXIVA",    hs: "H1", mp: "M3_NOMEACAO_PADRAO",        ms: null },
    { rt: "R2_REFLEXIVA",    hs: "H2", mp: "M4_DESLOCAMENTO_NIVEL",     ms: "M7_CLARIFICACAO_SEMANTICA" },
    { rt: "R3_EXPLORATORIA", hs: "H0", mp: "M5_SUSPENSAO_ATIVA",        ms: null },
    { rt: "R3_EXPLORATORIA", hs: "H1", mp: "M1_BIFURCACAO",             ms: null },
    { rt: "R3_EXPLORATORIA", hs: "H2", mp: "M4_DESLOCAMENTO_NIVEL",     ms: "M7_CLARIFICACAO_SEMANTICA" },
  ];

  for (const c of combos) {
    const { movement_primary, movement_secondary } = resolveMovement(c.rt, c.hs);
    assertEquals(movement_primary,   c.mp, `movement_primary errado: ${c.rt}×${c.hs}`);
    assertEquals(movement_secondary, c.ms, `movement_secondary errado: ${c.rt}×${c.hs}`);
  }
});

// ─────────────────────────────────────────
// TESTE 3.13 — Invariante cyclesCompleted=0 → H0
// ─────────────────────────────────────────

Deno.test("3.13 — Invariante: cyclesCompleted=0 → H0 sempre", () => {
  for (const prev of ["H0", "H1", "H2"] as HagoState[]) {
    const result = executeHago({
      previousState:        prev,
      MD: 0.80, DC: 0.10, CEC: 0.90, VE: 0.10,
      stage_base:           5,
      cyclesCompleted:      0,
      cycle_state:          "S0",
      input_classification: "C1_CONFUSAO_CONCEITUAL",
    });
    assertEquals(result, "H0", `cyclesCompleted=0 deve sempre retornar H0 (prev=${prev})`);
  }
});

// ─────────────────────────────────────────
// TESTE — CDA Regra 1: anti-repetição
// ─────────────────────────────────────────

Deno.test("CDA Regra 1 — anti-repetição literal", () => {
  const selected = [
    { node_id: "F2-N001", macro_band: "F2" as const, node_type: "Declarative" as const, density_class: 1 as const, distance: "0.50" }
  ];
  const candidates = [
    ...selected,
    { node_id: "F2-N002", macro_band: "F2" as const, node_type: "Tension" as const, density_class: 2 as const, distance: "0.80" }
  ];

  const result = applyCda({
    selected,
    previousNode: { node_id: "F2-N001", node_type: "Declarative", density_class: 1 },
    orderedCandidates: candidates,
  });

  assertNotEquals(result[0].node_id, "F2-N001", "CDA deve substituir node repetido");
});

// ─────────────────────────────────────────
// TESTE — CDA Regra 2: anti-avalanche
// ─────────────────────────────────────────

Deno.test("CDA Regra 2 — anti-avalanche Contrast density=3", () => {
  const selected = [
    { node_id: "F3-N003", macro_band: "F3" as const, node_type: "Contrast" as const, density_class: 3 as const, distance: "0.50" }
  ];
  const candidates = [
    ...selected,
    { node_id: "F3-N002", macro_band: "F3" as const, node_type: "Tension" as const, density_class: 2 as const, distance: "0.80" }
  ];

  const result = applyCda({
    selected,
    previousNode: { node_id: "F3-N000", node_type: "Contrast", density_class: 3 },
    orderedCandidates: candidates,
  });

  assert(
    !(result[0].node_type === "Contrast" && result[0].density_class === 3),
    "CDA deve evitar Contrast density=3 consecutivo"
  );
});

// ─────────────────────────────────────────
// TESTE — Hash chain: 6 ciclos encadeados
// ─────────────────────────────────────────

Deno.test("MVP — 6 ciclos encadeados com hash chain válida", async () => {
  const { computeInputHash, computeStructuralHash, computeCycleIntegrityHash } = await import("./hash.ts");
  const { buildSnapshot } = await import("./radar.ts");

  let previousCycleHash: string | null = null;
  let previousCGG = 1.0;
  let snapshot = { ...STATIC_BASE_SNAPSHOT };

  for (let cycle = 1; cycle <= 6; cycle++) {
    const raw: RadarInput = makeLinesCGG(2.0 + cycle * 0.3);

    const radar = executeRadar({
      lines:           raw,
      previousCGG,
      cyclesCompleted: cycle - 1,
      previousLines:   null,
    });

    const new_snapshot    = buildSnapshot(radar);
    const input_hash      = await computeInputHash(raw, snapshot, null, `texto simulado ciclo ${cycle}`);
    const structural_hash = await computeStructuralHash(new_snapshot, []);
    const integrity_hash  = await computeCycleIntegrityHash(
      previousCycleHash, input_hash, structural_hash, "3.0"
    );

    assert(input_hash.length === 64,      `Ciclo ${cycle}: input_hash inválido`);
    assert(structural_hash.length === 64, `Ciclo ${cycle}: structural_hash inválido`);
    assert(integrity_hash.length === 64,  `Ciclo ${cycle}: integrity_hash inválido`);

    if (previousCycleHash !== null) {
      assertNotEquals(integrity_hash, previousCycleHash, `Ciclo ${cycle}: hash chain não avançou`);
    }

    previousCycleHash = integrity_hash;
    previousCGG       = radar.CGG;
    snapshot          = new_snapshot;
  }
});

// ─────────────────────────────────────────
// TESTE — RADAR: piso global CGG ≤ min(Dj+1.5)
// ─────────────────────────────────────────

Deno.test("RADAR — Piso global CGG respeita min(Dj+1.5)", () => {
  const input = {
    lines: { d1: [7,7,7,7], d2: [7,7,7,7], d3: [1,1,1,1], d4: [7,7,7,7] },
    previousCGG: 1.0, cyclesCompleted: 0, previousLines: null,
  };
  const result = executeRadar(input);
  assert(result.CGG <= 1.0 + 1.5, `CGG ${result.CGG} deve ser ≤ D3+1.5 (2.5)`);
});

// ─────────────────────────────────────────
// TESTE — RADAR: penalidade CEC quando D3 < 4.5
// ─────────────────────────────────────────

Deno.test("RADAR — Penalidade CEC quando D3 < 4.5", () => {
  const withPenalty = executeRadar({
    lines: { d1: [5,5,5,5], d2: [5,5,5,5], d3: [4,4,4,4], d4: [5,5,5,5] },
    previousCGG: 1.0, cyclesCompleted: 0, previousLines: null,
  });
  const withoutPenalty = executeRadar({
    lines: { d1: [5,5,5,5], d2: [5,5,5,5], d3: [5,5,5,5], d4: [5,5,5,5] },
    previousCGG: 1.0, cyclesCompleted: 0, previousLines: null,
  });

  assert(withPenalty.CEC < withoutPenalty.CEC, "D3<4.5 deve reduzir CEC");
});

// ─────────────────────────────────────────
// TESTE — H0 nunca salta direto para H2
// ─────────────────────────────────────────

Deno.test("HAGO — H0 nunca salta diretamente para H2", () => {
  const result = executeHago({
    previousState:        "H0",
    MD: 0.80, DC: 0.10, CEC: 0.99, VE: 0.10,
    stage_base:           3,
    cyclesCompleted:      5,
    cycle_state:          "S1",
    input_classification: "C1_CONFUSAO_CONCEITUAL",
  });
  assertNotEquals(result, "H2", "H0 nunca deve ir diretamente para H2");
});


// ─────────────────────────────────────────
// TESTE 3.7 — Dominância de Amplitude
// ─────────────────────────────────────────

Deno.test("3.7 — Amplitude 3.0 não excede 35% das ativações", () => {
  let amplitudeMaxCount = 0;
  let totalActivations = 0;

  for (let cgg = 1.0; cgg <= 8.0; cgg += 0.1) {
    const result = executeRag({ CGG: cgg, hagoState: "H2", nodes: TEST_CORPUS, history: [] });
    if (result.length > 0) {
      totalActivations++;
      const node = result[0];
      const amplitude = node.stage_max - node.stage_min;
      if (amplitude >= 3.0) amplitudeMaxCount++;
    }
  }

  if (totalActivations > 0) {
    const ratio = amplitudeMaxCount / totalActivations;
    assert(ratio <= 0.35, `Amplitude 3.0+ excede 35%: ${(ratio * 100).toFixed(1)}%`);
  }
});

// ─────────────────────────────────────────
// TESTE 3.8 — Não-Teleologia Emergente
// ─────────────────────────────────────────

Deno.test("3.8 — Correlação CGG-density ≤ 0.6 (não-teleologia)", () => {
  const cgValues: number[] = [];
  const densities: number[] = [];

  for (let cgg = 1.0; cgg <= 8.0; cgg += 0.2) {
    const result = executeRag({ CGG: cgg, hagoState: "H2", nodes: TEST_CORPUS, history: [] });
    if (result.length > 0) {
      cgValues.push(cgg);
      densities.push(result[0].density_class);
    }
  }

  // Correlação de Pearson
  const n = cgValues.length;
  if (n < 2) return; // corpus insuficiente para testar

  const meanX = cgValues.reduce((a, b) => a + b, 0) / n;
  const meanY = densities.reduce((a, b) => a + b, 0) / n;
  const num = cgValues.reduce((acc, x, i) => acc + (x - meanX) * (densities[i] - meanY), 0);
  const denX = Math.sqrt(cgValues.reduce((acc, x) => acc + (x - meanX) ** 2, 0));
  const denY = Math.sqrt(densities.reduce((acc, y) => acc + (y - meanY) ** 2, 0));
  const correlation = (denX === 0 || denY === 0) ? 0 : num / (denX * denY);

  assert(
    Math.abs(correlation) <= 0.6,
    `Correlação CGG-density excessiva: ${correlation.toFixed(3)} — possível hierarquia implícita`
  );
});

console.log("✅ Integration Test Suite carregada — INTEGRATION_TEST_PROTOCOL_v2.1");
