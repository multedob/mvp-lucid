// ============================================================
// ipe-variation-selector/index.ts
// Responsabilidade: Seleção de variações para pills e questionnaire
//                   usando lógica de weighted random baseada em histórico
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.1, Variação Rotacional
//
// PATCH i18n (Fase 4): aceita parâmetro `locale` opcional no body.
//   Default: "pt-BR". Backward-compatible — se não vier, usa pt-BR.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { PillId, LineId, ILValue } from "../_shared/ipe_types.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_LOCALE = "pt-BR";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────

interface SelectPillVariationRequest {
  action: "select_pill_variation";
  user_id: string;
  ipe_cycle_id: string;
  pill_id: PillId;
  ipe_level: ILValue;
  locale?: string;  // ISO BCP-47, default "pt-BR"
}

interface SelectQuestionnaireVariationsRequest {
  action: "select_questionnaire_variations";
  user_id: string;
  ipe_cycle_id: string;
  block_ids: LineId[];
  ipe_level: ILValue;
  locale?: string;  // ISO BCP-47, default "pt-BR"
}

type VariationSelectorRequest = SelectPillVariationRequest | SelectQuestionnaireVariationsRequest;

interface VariationHistoryEntry {
  variation_key: string;
  cycle_number: number;
}

interface VariationWithWeight {
  variation_key: string;
  weight: number;
  content: Record<string, unknown>;
}

// ─────────────────────────────────────────
// UTILITY: Verify JWT and extract user_id
// ─────────────────────────────────────────

function extractUserIdFromJWT(authHeader: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// ALGORITHM: Weighted Random Selection
// ─────────────────────────────────────────

async function getPillVariationHistory(
  supabase: any,
  user_id: string,
  pill_id: PillId
): Promise<VariationHistoryEntry[]> {
  const { data, error } = await supabase
    .from("pill_responses")
    .select(`variation_key, ipe_cycle_id, ipe_cycles!inner(cycle_number)`)
    .eq("ipe_cycles.user_id", user_id)
    .eq("pill_id", pill_id)
    .not("variation_key", "is", null)
    .order("ipe_cycles.cycle_number", { ascending: false });

  if (error) {
    console.error("Error fetching pill variation history:", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    variation_key: row.variation_key,
    cycle_number: row.ipe_cycles.cycle_number,
  }));
}

async function getBlockVariationHistory(
  supabase: any,
  user_id: string,
  block_id: LineId
): Promise<VariationHistoryEntry[]> {
  const { data, error } = await supabase
    .from("block_responses")
    .select(`rotation_variation_key, ipe_cycle_id, ipe_cycles!inner(cycle_number)`)
    .eq("ipe_cycles.user_id", user_id)
    .eq("block_id", block_id)
    .not("rotation_variation_key", "is", null)
    .order("ipe_cycles.cycle_number", { ascending: false });

  if (error) {
    console.error("Error fetching block variation history:", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    variation_key: row.rotation_variation_key,
    cycle_number: row.ipe_cycles.cycle_number,
  }));
}

function calculateVariationWeight(
  variation_key: string,
  history: VariationHistoryEntry[],
  current_cycle_number: number
): number {
  const occurrences = history.filter((h) => h.variation_key === variation_key);
  if (occurrences.length === 0) return 1.5;
  occurrences.sort((a, b) => b.cycle_number - a.cycle_number);
  const mostRecentCycle = occurrences[0].cycle_number;
  if (mostRecentCycle === current_cycle_number - 1) return 0.0;
  if (mostRecentCycle === current_cycle_number - 2) return 0.3;
  return 1.0;
}

function selectWeightedRandom(items: VariationWithWeight[]): VariationWithWeight | null {
  const activeItems = items.filter((item) => item.weight > 0);
  if (activeItems.length === 0) return null;
  const totalWeight = activeItems.reduce((sum, item) => sum + item.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  for (const item of activeItems) {
    cumulative += item.weight;
    if (random <= cumulative) return item;
  }
  return activeItems[0] || null;
}

// ─────────────────────────────────────────
// MAIN HANDLERS
// ─────────────────────────────────────────

async function handleSelectPillVariation(
  supabase: any,
  req: SelectPillVariationRequest,
  current_cycle_number: number
): Promise<Response> {
  const { user_id, pill_id, ipe_level } = req;
  const locale = req.locale ?? DEFAULT_LOCALE;

  // Try requested locale first
  let { data: availableVariations, error: varError } = await supabase
    .from("pill_content_variations")
    .select("variation_key, content")
    .eq("pill_id", pill_id)
    .eq("ipe_level", ipe_level)
    .eq("locale", locale);

  // Fallback to "en" if requested locale yields nothing (defensive — prevents
  // hard 404 if a row hasn't been translated yet)
  if ((!availableVariations || availableVariations.length === 0) && locale !== "en") {
    console.warn(`No variations for pill=${pill_id} locale=${locale}; falling back to en`);
    const fb = await supabase
      .from("pill_content_variations")
      .select("variation_key, content")
      .eq("pill_id", pill_id)
      .eq("ipe_level", ipe_level)
      .eq("locale", "en");
    availableVariations = fb.data;
    varError = fb.error;
  }

  if (varError || !availableVariations || availableVariations.length === 0) {
    return json({ error: "No variations available for this pill/level combination" }, 404);
  }

  const history = await getPillVariationHistory(supabase, user_id, pill_id);

  const variationsWithWeights: VariationWithWeight[] = availableVariations.map((v: any) => ({
    variation_key: v.variation_key,
    weight: calculateVariationWeight(v.variation_key, history, current_cycle_number),
    content: v.content,
  }));

  const selected = selectWeightedRandom(variationsWithWeights);

  if (!selected) {
    const fallback = variationsWithWeights[0];
    if (!fallback) return json({ error: "No variations to select from" }, 500);
    return json({ variation_key: fallback.variation_key, content: fallback.content });
  }

  return json({ variation_key: selected.variation_key, content: selected.content });
}

async function handleSelectQuestionnaireVariations(
  supabase: any,
  req: SelectQuestionnaireVariationsRequest,
  current_cycle_number: number
): Promise<Response> {
  const { user_id, block_ids, ipe_level } = req;
  const locale = req.locale ?? DEFAULT_LOCALE;

  const variations: Record<string, { variation_key: string; content: Record<string, unknown> }> = {};

  for (const block_id of block_ids) {
    let { data: availableVariations, error: varError } = await supabase
      .from("questionnaire_content_variations")
      .select("variation_key, content")
      .eq("block_id", block_id)
      .eq("ipe_level", ipe_level)
      .eq("locale", locale);

    // Fallback to "en"
    if ((!availableVariations || availableVariations.length === 0) && locale !== "en") {
      console.warn(`No variations for block=${block_id} locale=${locale}; falling back to en`);
      const fb = await supabase
        .from("questionnaire_content_variations")
        .select("variation_key, content")
        .eq("block_id", block_id)
        .eq("ipe_level", ipe_level)
        .eq("locale", "en");
      availableVariations = fb.data;
      varError = fb.error;
    }

    if (varError || !availableVariations || availableVariations.length === 0) {
      console.warn(`No variations available for block ${block_id}`);
      continue;
    }

    const history = await getBlockVariationHistory(supabase, user_id, block_id);

    const variationsWithWeights: VariationWithWeight[] = availableVariations.map((v: any) => ({
      variation_key: v.variation_key,
      weight: calculateVariationWeight(v.variation_key, history, current_cycle_number),
      content: v.content,
    }));

    const selected = selectWeightedRandom(variationsWithWeights);

    if (selected) {
      variations[block_id] = { variation_key: selected.variation_key, content: selected.content };
    } else {
      const fallback = variationsWithWeights[0];
      if (fallback) {
        variations[block_id] = { variation_key: fallback.variation_key, content: fallback.content };
      }
    }
  }

  return json({ variations });
}

// ─────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  const userIdFromJWT = extractUserIdFromJWT(authHeader);
  if (!userIdFromJWT) return json({ error: "Unauthorized" }, 401);

  let body: VariationSelectorRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.action || !body.user_id || !body.ipe_cycle_id) {
    return json({ error: "Missing required fields" }, 400);
  }
  if (body.user_id !== userIdFromJWT) return json({ error: "User ID mismatch" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return json({ error: "Missing Supabase configuration" }, 500);

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: cycleData, error: cycleError } = await supabase
      .from("ipe_cycles")
      .select("cycle_number")
      .eq("id", body.ipe_cycle_id)
      .eq("user_id", body.user_id)
      .single();

    if (cycleError || !cycleData) return json({ error: "Cycle not found" }, 404);

    const current_cycle_number = cycleData.cycle_number;

    if (body.action === "select_pill_variation") {
      if (!("pill_id" in body) || !("ipe_level" in body)) {
        return json({ error: "Missing pill_id or ipe_level" }, 400);
      }
      return await handleSelectPillVariation(supabase, body as SelectPillVariationRequest, current_cycle_number);
    } else if (body.action === "select_questionnaire_variations") {
      if (!("block_ids" in body) || !Array.isArray(body.block_ids) || !("ipe_level" in body)) {
        return json({ error: "Missing block_ids or ipe_level" }, 400);
      }
      return await handleSelectQuestionnaireVariations(supabase, body as SelectQuestionnaireVariationsRequest, current_cycle_number);
    } else {
      return json({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("Error in variation selector:", error);
    return json({ error: "Internal server error" }, 500);
  }
}

Deno.serve(handler);
