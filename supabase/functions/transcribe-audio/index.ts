// ============================================================
// transcribe-audio/index.ts
// v2.1 — F4-02 hardening (CORS, rate limit, kill-switch, sanitized errors)
// ============================================================
// Flow:
//   1. Client uploads audio blob to bucket `pill-audio` at
//      {user_id}/{cycle_id}/{pill_id}_{moment}.webm
//   2. Client calls this function with { audio_path, language? }.
//   3. Function downloads the audio (service role), tries Groq first
//      (whisper-large-v3, ~10x faster than OpenAI). If Groq fails for
//      any reason (rate limit, outage, missing key), falls back to
//      OpenAI Whisper. Returns { text, provider }.
//
// Secrets required:
//   GROQ_API_KEY              — primary (https://console.groq.com)
//   OPENAI_API_KEY            — fallback
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_ANON_KEY
//   TRANSCRIBE_ENABLED        — optional kill-switch ("false" disables)
//
// Cost:
//   Groq whisper-large-v3: ~$0.0001-0.0004/min (much cheaper)
//   OpenAI whisper-1:      $0.006/min (fallback only)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS (F4 restricted) ────────────────────────────────────
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, req?: Request): Response {
  const origin = req?.headers.get("origin") ?? null;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

interface TranscribeRequest {
  audio_path: string;
  language?: string;  // ISO-639-1 ("pt", "en", …)
}

const DEPLOY_FINGERPRINT = "transcribe-audio-v2.1-f4-hardening";
const INITIAL_PROMPT = "Transcrição literal de fala em português brasileiro coloquial. Aplicativo de autoconhecimento estrutural. NÃO incluir legendas de filme, créditos finais, nomes de tradutores, ou texto promocional.";

const HALLUCINATION_PATTERNS = [
  /\bLegenda(?:s)?\s+(?:por\s+)?[A-Z][a-zà-ú]+\s+[A-Z][a-zà-ú]+\.?$/i,
  /\bLegendas?:?\s+[A-Z][a-zà-ú]+\s+[A-Z][a-zà-ú]+\.?$/i,
  /\bTraduç(?:ão|ões)\s+(?:por\s+)?[A-Z][a-zà-ú]+\s+[A-Z][a-zà-ú]+\.?$/i,
  /\bTradução:?\s+[A-Z][a-zà-ú]+\s+[A-Z][a-zà-ú]+\.?$/i,
  /\bCréditos?:?\s+[A-Z][a-zà-ú]+\s+[A-Z][a-zà-ú]+\.?$/i,
  /\bRevis(?:ão|ada)\s+(?:por\s+)?[A-Z][a-zà-ú]+\s+[A-Z][a-zà-ú]+\.?$/i,
  /\bSubtitles?\s+(?:by\s+)?[A-Z][a-z]+\s+[A-Z][a-z]+\.?$/i,
  /\bAmara\.org\b/i,
  /\bwww\.\S+\.com\b\s*$/i,
  /\bObrigado por assistir\.?$/i,
  /\bAté a próxima\.?$/i,
  /\bInscreva-se no canal\.?$/i,
];

function cleanTranscription(text: string): string {
  let cleaned = text.trim();
  for (const pattern of HALLUCINATION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }
  cleaned = cleaned.replace(/[.\s]+$/, ".");
  return cleaned;
}

console.log(`[transcribe-audio] deploy_fingerprint: ${DEPLOY_FINGERPRINT}`);

// ─── Rate limit per user/invite (cost protection) ────────────
// In-memory — does not survive cold starts, but reduces blast radius of abuse.
const RATE_LIMIT_HOUR = 30;
const RATE_LIMIT_DAY = 200;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface RateLimitEntry {
  hourCount: number;
  hourResetAt: number;
  dayCount: number;
  dayResetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(userId: string): { ok: boolean; reason?: string } {
  const now = Date.now();
  let entry = rateLimitMap.get(userId);

  if (!entry) {
    entry = {
      hourCount: 0,
      hourResetAt: now + HOUR_MS,
      dayCount: 0,
      dayResetAt: now + DAY_MS,
    };
    rateLimitMap.set(userId, entry);
  }

  if (entry.hourResetAt < now) {
    entry.hourCount = 0;
    entry.hourResetAt = now + HOUR_MS;
  }
  if (entry.dayResetAt < now) {
    entry.dayCount = 0;
    entry.dayResetAt = now + DAY_MS;
  }

  if (entry.hourCount >= RATE_LIMIT_HOUR) {
    return { ok: false, reason: "hourly_limit" };
  }
  if (entry.dayCount >= RATE_LIMIT_DAY) {
    return { ok: false, reason: "daily_limit" };
  }

  entry.hourCount++;
  entry.dayCount++;
  return { ok: true };
}

// audio_path expected: {uuid}/{string}.{ext} OR {uuid}/{string}/{string}.{ext}
const AUDIO_PATH_REGEX = /^[0-9a-f-]{36}\/[\w-]+(\/[\w.-]+)?\.(webm|m4a|mp3|ogg|wav)$/i;
const MAX_FILE_BYTES = 25 * 1024 * 1024;  // 25MB — Whisper API limit
const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Provider helpers ────────────────────────────────────────

interface ProviderResult {
  ok: boolean;
  text?: string;
  status?: number;
  detail?: string;
}

async function callGroq(
  fileData: Blob,
  fileName: string,
  language: string | undefined,
  apiKey: string,
): Promise<ProviderResult> {
  const formData = new FormData();
  formData.append("file", fileData, fileName);
  formData.append("model", "whisper-large-v3");
  formData.append("prompt", INITIAL_PROMPT);
  if (language) formData.append("language", language);
  formData.append("response_format", "text");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey.trim()}` },
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, detail };
  }
  const text = cleanTranscription(await res.text());
  return { ok: true, text };
}

async function callOpenAI(
  fileData: Blob,
  fileName: string,
  language: string | undefined,
  apiKey: string,
): Promise<ProviderResult> {
  const formData = new FormData();
  formData.append("file", fileData, fileName);
  formData.append("model", "whisper-1");
  if (language) formData.append("language", language);
  formData.append("response_format", "text");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey.trim()}` },
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, detail };
  }
  const text = cleanTranscription(await res.text());
  return { ok: true, text };
}

// ─── Handler ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, req);
  }

  // Kill-switch via env var (set TRANSCRIBE_ENABLED=false to disable without deploy)
  const enabled = (Deno.env.get("TRANSCRIBE_ENABLED") ?? "true").toLowerCase() !== "false";
  if (!enabled) {
    console.warn("transcribe-audio: disabled via TRANSCRIBE_ENABLED env var");
    return json({ error: "service_unavailable" }, 503, req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqKey     = Deno.env.get("GROQ_API_KEY");
    const openaiKey   = Deno.env.get("OPENAI_API_KEY");

    if (!groqKey && !openaiKey) {
      return json({ error: "no_provider_configured" }, 500, req);
    }

    // Body size limit — body is just JSON with paths
    const contentLength = parseInt(req.headers.get("content-length") ?? "0");
    if (contentLength > 5_000) {
      return json({ error: "payload_too_large" }, 413, req);
    }

    // Parse body — accepts optional third_party_token
    const body = await req.json() as TranscribeRequest & { third_party_token?: string };

    if (
      !body.audio_path ||
      typeof body.audio_path !== "string" ||
      body.audio_path.length > 256 ||
      !AUDIO_PATH_REGEX.test(body.audio_path)
    ) {
      return json({ error: "audio_path_invalid" }, 400, req);
    }
    const firstSegment = body.audio_path.split("/")[0];

    // Auth: two paths — authenticated user OR third party with token
    let rateKey: string;

    if (body.third_party_token) {
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: invite, error: invErr } = await adminClient
        .from("third_party_invites")
        .select("id, status, created_at")
        .eq("token", body.third_party_token)
        .single();
      if (invErr || !invite) return json({ error: "invalid_token" }, 401, req);
      if (invite.status === "revoked" || invite.status === "submitted") {
        return json({ error: "link_unavailable" }, 403, req);
      }
      if (Date.now() - new Date(invite.created_at).getTime() > INVITE_TTL_MS) {
        return json({ error: "link_unavailable" }, 403, req);
      }
      if (firstSegment !== invite.id) return json({ error: "forbidden_path" }, 403, req);
      rateKey = `tp:${invite.id}`;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "unauthorized" }, 401, req);
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) return json({ error: "unauthorized" }, 401, req);
      if (firstSegment !== user.id) return json({ error: "forbidden_path" }, 403, req);
      rateKey = `u:${user.id}`;
    }

    // Rate limit (cost protection)
    const rate = checkRateLimit(rateKey);
    if (!rate.ok) {
      console.warn(`transcribe-audio: rate_limited ${rateKey} reason=${rate.reason}`);
      return json({ error: "rate_limited" }, 429, req);
    }

    // ─── Download audio ───
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: fileData, error: dlErr } = await adminClient
      .storage
      .from("pill-audio")
      .download(body.audio_path);
    if (dlErr || !fileData) {
      console.error(`transcribe-audio: download_failed path=${body.audio_path} err=${dlErr?.message}`);
      return json({ error: "download_failed" }, 404, req);
    }

    if (fileData.size > MAX_FILE_BYTES) {
      console.warn(`transcribe-audio: file_too_large user=${rateKey} size=${fileData.size}`);
      return json({ error: "file_too_large" }, 413, req);
    }

    const fileName = body.audio_path.split("/").pop() ?? "audio.webm";

    // ─── Try Groq first, fall back to OpenAI ───
    const attempts: Array<{ provider: string; result: ProviderResult }> = [];

    if (groqKey) {
      const t0 = performance.now();
      const groqResult = await callGroq(fileData, fileName, body.language, groqKey);
      const ms = Math.round(performance.now() - t0);
      attempts.push({ provider: "groq", result: groqResult });
      if (groqResult.ok) {
        console.log(JSON.stringify({
          kind: "transcribe_audio_success",
          user_key: rateKey,
          provider: "groq",
          duration_ms: ms,
          file_size_bytes: fileData.size,
          timestamp: new Date().toISOString(),
        }));
        return json({ text: groqResult.text, provider: "groq", ms }, 200, req);
      }
      console.warn(`transcribe-audio: groq failed (${groqResult.status}): ${groqResult.detail?.slice(0, 200)}`);
    }

    if (openaiKey) {
      const t0 = performance.now();
      const openaiResult = await callOpenAI(fileData, fileName, body.language, openaiKey);
      const ms = Math.round(performance.now() - t0);
      attempts.push({ provider: "openai", result: openaiResult });
      if (openaiResult.ok) {
        console.log(JSON.stringify({
          kind: "transcribe_audio_success",
          user_key: rateKey,
          provider: "openai",
          duration_ms: ms,
          file_size_bytes: fileData.size,
          timestamp: new Date().toISOString(),
        }));
        return json({ text: openaiResult.text, provider: "openai", ms }, 200, req);
      }
      console.error(`transcribe-audio: openai failed (${openaiResult.status}): ${openaiResult.detail?.slice(0, 200)}`);
    }

    // Both failed (or only one configured and it failed)
    console.error(
      `transcribe-audio: all_providers_failed attempts=${JSON.stringify(
        attempts.map(a => ({ provider: a.provider, status: a.result.status }))
      )}`
    );
    return json({ error: "all_providers_failed" }, 502, req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`transcribe-audio: internal_error: ${message}`);
    return json({ error: "internal_error" }, 500, req);
  }
});
