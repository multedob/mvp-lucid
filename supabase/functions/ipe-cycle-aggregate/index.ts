// supabase/functions/ipe-cycle-aggregate/index.ts
// ============================================================
// W20.6 fase 2 — Agrega scoring auto + terceiros por linha.
//
// Lógica:
//   - Para cada linha: il_auto vem de questionnaire_state.resultados_por_bloco
//   - Se a linha pertence a D2 (L2.x) E há ≥1 terceiro com score nessa linha:
//       il_final = 0.8 * il_auto + 0.2 * media(il_terceiros)
//     Senão:
//       il_final = il_auto
//   - Computa completion_status do ciclo:
//       cycle_number == 1: complete_self_only OK (sem exigir terceiros)
//       cycle_number >= 2: exige ≥1 alpha + ≥1 beta pra "complete_with_external"
//   - Atualiza ipe_cycles.completion_status
//   - Retorna { completion_status, il_aggregated }
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.6-cycle-aggregate-v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const ALL_LINES = [
  "L1.1", "L1.2", "L1.3", "L1.4",
  "L2.1", "L2.2", "L2.3", "L2.4",
  "L3.1", "L3.2", "L3.3", "L3.4",
  "L4.1", "L4.2", "L4.3", "L4.4",
];

// Linhas de D2 (Integração Interna) — onde aplica ponderação 80/20 (Constituição v6 §2.9)
const D2_LINES = new Set(["L2.1", "L2.2", "L2.3", "L2.4"]);

const SELF_WEIGHT = 0.8;
const EXTERNAL_WEIGHT = 0.2;

function ilToFaixa(il: number): "A" | "B" | "C" | "D" {
  if (il >= 7) return "A";
  if (il >= 5) return "B";
  if (il >= 3.5) return "C";
  return "D";
}

interface AggregatedLine {
  il_auto: number | null;
  il_external_avg: number | null;
  il_final: number | null;
  faixa_final: "A" | "B" | "C" | "D" | null;
  weighting_applied: "self_only" | "weighted_80_20";
  external_count: number;
}

Deno.serve(async (req) => {
  console.log(`[${DEPLOY_FINGERPRINT}] invoked, method:`, req.method);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth_header = req.headers.get("Authorization");
  if (!auth_header) return json({ error: "Missing authorization" }, 401);
  const token = auth_header.replace("Bearer ", "");

  const supabase_url = Deno.env.get("SUPABASE_URL");
  const supabase_anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase_url || !supabase_anon || !service_role) {
    return json({ error: "Missing config" }, 500);
  }

  const supabase = createClient(supabase_url, supabase_anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createClient(supabase_url, service_role);

  const { data: auth_data, error: auth_err } = await supabase.auth.getUser(token);
  if (auth_err || !auth_data.user) return json({ error: "Unauthorized" }, 401);
  const user_id = auth_data.user.id;

  const body = await req.json().catch(() => ({}));
  const { ipe_cycle_id } = body;
  if (!ipe_cycle_id) return json({ error: "Missing ipe_cycle_id" }, 400);

  // Confirma cycle pertence ao user
  const { data: cycle, error: cErr } = await supabase
    .from("ipe_cycles")
    .select("id, user_id, cycle_number")
    .eq("id", ipe_cycle_id)
    .single();
  if (cErr || !cycle || cycle.user_id !== user_id) {
    return json({ error: "Cycle not found or unauthorized" }, 404);
  }

  // Lê questionnaire_state (auto)
  const { data: qState } = await admin
    .from("questionnaire_state")
    .select("resultados_por_bloco")
    .eq("ipe_cycle_id", ipe_cycle_id)
    .maybeSingle();
  const resultados = (qState?.resultados_por_bloco ?? {}) as Record<string, any>;

  // Lê third_party_scoring (terceiros)
  const { data: tpScoringRows } = await admin
    .from("third_party_scoring")
    .select("invite_id, corpus_linhas, question_set")
    .eq("ipe_cycle_id", ipe_cycle_id);
  const tpScores = tpScoringRows ?? [];

  // Conta α / β submitted
  const alphaCount = tpScores.filter((r: any) => r.question_set === "alpha").length;
  const betaCount = tpScores.filter((r: any) => r.question_set === "beta").length;
  const totalExternal = tpScores.length;

  // Pra cada linha, agrega
  const il_aggregated: Record<string, AggregatedLine> = {};

  for (const line of ALL_LINES) {
    const autoBlock = resultados[line];
    const il_auto: number | null = autoBlock?.il_canonico ?? null;

    // Coleta IL_sinal numerico de todos terceiros que cobriram essa linha
    const externalIls: number[] = [];
    for (const tp of tpScores) {
      const linhas = (tp.corpus_linhas ?? {}) as Record<string, any>;
      const il = linhas[line]?.IL_sinal?.numerico;
      if (typeof il === "number" && Number.isFinite(il)) {
        externalIls.push(il);
      }
    }
    const externalAvg = externalIls.length > 0
      ? externalIls.reduce((a, b) => a + b, 0) / externalIls.length
      : null;

    // Decide weighting
    let il_final: number | null = il_auto;
    let weighting: "self_only" | "weighted_80_20" = "self_only";
    if (D2_LINES.has(line) && il_auto !== null && externalAvg !== null) {
      il_final = SELF_WEIGHT * il_auto + EXTERNAL_WEIGHT * externalAvg;
      weighting = "weighted_80_20";
    }

    il_aggregated[line] = {
      il_auto,
      il_external_avg: externalAvg,
      il_final,
      faixa_final: il_final !== null ? ilToFaixa(il_final) : null,
      weighting_applied: weighting,
      external_count: externalIls.length,
    };
  }

  // Decide completion_status
  const allLinesScored = ALL_LINES.every(l => il_aggregated[l].il_auto !== null);
  let completion_status: "incomplete" | "complete_self_only" | "complete_with_external";
  if (!allLinesScored) {
    completion_status = "incomplete";
  } else if (cycle.cycle_number === 1) {
    // ciclo 1: user-only basta
    completion_status = totalExternal >= 2 && alphaCount >= 1 && betaCount >= 1
      ? "complete_with_external"
      : "complete_self_only";
  } else {
    // ciclo ≥2: exige ≥1 α + ≥1 β
    completion_status = alphaCount >= 1 && betaCount >= 1
      ? "complete_with_external"
      : "complete_self_only";
  }

  // Atualiza ipe_cycles.completion_status
  await admin
    .from("ipe_cycles")
    .update({
      completion_status,
      completion_status_updated_at: new Date().toISOString(),
    })
    .eq("id", ipe_cycle_id);

  return json({
    ok: true,
    cycle_number: cycle.cycle_number,
    completion_status,
    third_parties: { alpha: alphaCount, beta: betaCount, total: totalExternal },
    lines_complete_auto: ALL_LINES.filter(l => il_aggregated[l].il_auto !== null).length,
    il_aggregated,
    debug_fingerprint: DEPLOY_FINGERPRINT,
  });
});
