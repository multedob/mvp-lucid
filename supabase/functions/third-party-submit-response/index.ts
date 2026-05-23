// supabase/functions/third-party-submit-response/index.ts
// ============================================================
// W20.1 — Terceiro responde 1 pergunta. UPSERT incremental.
// SEM AUTH (terceiro não tem conta no app).
// F4 hardening: CORS restrito, rate limit, body limit, token regex,
// erros unificados, try/catch global.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.1-submit-response-v2-f4-hardening";

const ALLOWED_ORIGINS = new Set([
  "https://rdwth.com",
  "https://www.rdwth.com",
  "http://localhost:8080",
  "http://localhost:5173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://rdwth.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
    "Vary": "Origin",
  };
}

const json = (data: unknown, status = 200, req?: Request) => {
  const origin = req?.headers.get("origin") ?? null;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
};

const TOKEN_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  console.log(`[${DEPLOY_FINGERPRINT}] invoked, method:`, req.method);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (!checkRateLimit(ip)) return json({ error: "Too many requests" }, 429, req);

    const contentLength = parseInt(req.headers.get("content-length") ?? "0");
    if (contentLength > 10_000) return json({ error: "Payload too large" }, 413, req);

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

    if (!token || typeof token !== "string" || !TOKEN_REGEX.test(token)) {
      return json({ error: "Invalid link" }, 400, req);
    }
    if (!question_id) {
      return json({ error: "Missing question_id" }, 400, req);
    }

    const supabase_url = Deno.env.get("SUPABASE_URL");
    const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabase_url || !service_role) return json({ error: "Missing config" }, 500, req);

    const admin = createClient(supabase_url, service_role);

    const { data: invite, error: invErr } = await admin
      .from("third_party_invites")
      .select("id, status")
      .eq("token", token)
      .single();
    if (invErr || !invite) return json({ error: "Link unavailable" }, 404, req);
    if (invite.status === "revoked" || invite.status === "submitted") {
      return json({ error: "Link unavailable", status: invite.status }, 403, req);
    }

    if (responder_email || responder_name) {
      const update: Record<string, unknown> = {};
      if (responder_email && typeof responder_email === "string") update.responder_email = responder_email.trim().toLowerCase();
      if (responder_name && typeof responder_name === "string") update.responder_name = responder_name.trim();
      if (Object.keys(update).length > 0) {
        await admin.from("third_party_invites").update(update).eq("id", invite.id);
      }
    }

    const scale_int = scale_value !== undefined && scale_value !== null
      ? Number(scale_value)
      : null;
    if (scale_int !== null && (!Number.isInteger(scale_int) || scale_int < 1 || scale_int > 5)) {
      return json({ error: "scale_value must be 1-5" }, 400, req);
    }

    const { error: upErr } = await admin
      .from("third_party_responses")
      .upsert([{
        invite_id: invite.id,
        question_id: String(question_id),
        scale_value: scale_int,
        open_text: typeof open_text === "string" ? open_text : null,
        episode_text: typeof episode_text === "string" ? episode_text : null,
      }], { onConflict: "invite_id,question_id" });

    if (upErr) return json({ error: "Upsert failed", detail: upErr.message }, 500, req);

    return json({
      ok: true,
      debug_fingerprint: DEPLOY_FINGERPRINT,
    }, 200, req);
  } catch (err) {
    console.error(`[${DEPLOY_FINGERPRINT}] unhandled error:`, err);
    return json({ error: "Internal error" }, 500, req);
  }
});
