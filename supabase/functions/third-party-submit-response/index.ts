// supabase/functions/third-party-submit-response/index.ts
// ============================================================
// W20.1 — Terceiro responde 1 pergunta. UPSERT incremental.
// SEM AUTH (terceiro não tem conta no app).
// Aceita também atualização do responder_email/name (1ª chamada).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.1-submit-response-v1";

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

Deno.serve(async (req) => {
  console.log(`[${DEPLOY_FINGERPRINT}] invoked, method:`, req.method);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const {
    token,
    question_id,
    scale_value,
    open_text,
    episode_text,
    responder_email,
    responder_name,
  } = body;

  if (!token || !question_id) {
    return json({ error: "Missing token or question_id" }, 400);
  }

  const supabase_url = Deno.env.get("SUPABASE_URL");
  const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase_url || !service_role) return json({ error: "Missing config" }, 500);

  const admin = createClient(supabase_url, service_role);

  // Valida invite
  const { data: invite, error: invErr } = await admin
    .from("third_party_invites")
    .select("id, status")
    .eq("token", token)
    .single();
  if (invErr || !invite) return json({ error: "Invalid link" }, 404);
  if (invite.status === "revoked") return json({ error: "Link revoked" }, 403);
  if (invite.status === "submitted") return json({ error: "Already submitted" }, 403);

  // Atualiza responder_email/name se vieram (idempotente)
  if (responder_email || responder_name) {
    const update: Record<string, unknown> = {};
    if (responder_email && typeof responder_email === "string") update.responder_email = responder_email.trim().toLowerCase();
    if (responder_name && typeof responder_name === "string") update.responder_name = responder_name.trim();
    if (Object.keys(update).length > 0) {
      await admin.from("third_party_invites").update(update).eq("id", invite.id);
    }
  }

  // Validação leve do conteúdo
  const scale_int = scale_value !== undefined && scale_value !== null
    ? Number(scale_value)
    : null;
  if (scale_int !== null && (!Number.isInteger(scale_int) || scale_int < 1 || scale_int > 5)) {
    return json({ error: "scale_value must be 1-5" }, 400);
  }

  // UPSERT (1 row por invite+question_id)
  const { error: upErr } = await admin
    .from("third_party_responses")
    .upsert([{
      invite_id: invite.id,
      question_id: String(question_id),
      scale_value: scale_int,
      open_text: typeof open_text === "string" ? open_text : null,
      episode_text: typeof episode_text === "string" ? episode_text : null,
    }], { onConflict: "invite_id,question_id" });

  if (upErr) return json({ error: "Upsert failed", detail: upErr.message }, 500);

  return json({
    ok: true,
    debug_fingerprint: DEPLOY_FINGERPRINT,
  });
});
