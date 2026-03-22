// ============================================================
// ipe-scoring-block/index.ts — Stub de Scoring por Bloco
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.1 §5 (Fase 3)
// Responsabilidade: Scoring Momento 2 — resposta do bloco → IL canônico
//
// Modo STUB (Fase 3):
//   - Detecta persona via sufixo do ipe_cycle_id
//   - Retorna IL canônico de STUB_CANONICOS sem chamada LLM
//   - corte_pendente=null sempre → motor nunca serve variante
//   - Persiste scoring_audit com model="STUB" e prompt_version="STUB-1.0"
//
// Para produção (pós-Fase 3): substituir corpo do handler por chamada LLM
// com rubrica do bloco (PIPELINE §4.2) e parser de saída estruturada.
// Assinatura de entrada/saída (BlockScoringInput/Output) permanece a mesma.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type BlockScoringInput,
  type BlockScoringOutput,
  stubBlockScoring,
  detectStubPersona,
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "UNAUTHORIZED", message: "Missing authorization" }, 401);
  }

  let body: BlockScoringInput;
  try {
    body = await req.json() as BlockScoringInput;
  } catch {
    return json({ error: "INVALID_INPUT", message: "Body must be valid JSON" }, 400);
  }

  const { ipe_cycle_id, block_id, principal_resposta, variante_resposta, protecao_etica } = body;

  if (!ipe_cycle_id || !block_id) {
    return json({ error: "INVALID_INPUT", message: "ipe_cycle_id and block_id required" }, 400);
  }

  // Stub: detectar persona e retornar IL canônico
  const persona = detectStubPersona(ipe_cycle_id);
  const auditId = crypto.randomUUID();

  // corte_pendente=null sempre — motor nunca servirá variante em modo stub
  const output: BlockScoringOutput = stubBlockScoring(block_id, persona, auditId);

  // Persistir scoring_audit (rastreabilidade)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { error: auditErr } = await supabase
    .from("scoring_audit")
    .insert({
      id: auditId,
      ipe_cycle_id,
      component: `scoring_block_${block_id}`,
      prompt_version: "STUB-1.0",
      input_tokens: null,
      output_tokens: null,
      raw_output: JSON.stringify({
        stub_mode: true,
        persona,
        block_id,
        principal_resposta: principal_resposta ? "[presente]" : null,
        variante_resposta:  variante_resposta  ? "[presente]" : null,
        protecao_etica,
      }),
      parsed_output: output,
      parse_success: true,
      retry_count: 0,
      model: "STUB",
    });

  if (auditErr) {
    // Degradação graciosa: retorna output mesmo se audit falhar — PIPELINE §4.5
    console.error("SCORING_AUDIT_INSERT_ERROR:", JSON.stringify(auditErr));
  }

  return json(output, 200);
});
