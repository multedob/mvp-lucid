// supabase/functions/third-party-upload-audio-url/index.ts
// F4 hardening: CORS restrito, rate limit, body limit, token regex,
// erros unificados, try/catch global.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.x-upload-audio-url-v2-f4-hardening";

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
    const { token, question_id, ext } = body;

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

    const safeExt = ["webm", "ogg", "m4a", "mp4", "wav"].includes(ext) ? ext : "webm";
    const path = `${invite.id}/${token}/${question_id}_third-party.${safeExt}`;

    const { data: signed, error: signErr } = await admin.storage
      .from("pill-audio")
      .createSignedUploadUrl(path, { upsert: true });

    if (signErr || !signed) {
      console.error("[upload-audio-url] signedUrl err:", signErr);
      return json({ error: "Failed to create upload URL" }, 500, req);
    }

    return json({
      path,
      signed_url: signed.signedUrl,
      token: signed.token,
    }, 200, req);
  } catch (err) {
    console.error(`[${DEPLOY_FINGERPRINT}] unhandled error:`, err);
    return json({ error: "Internal error" }, 500, req);
  }
});
