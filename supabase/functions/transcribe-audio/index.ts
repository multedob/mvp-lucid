// ============================================================
// transcribe-audio/index.ts
// v2.0 — Groq Whisper primary, OpenAI Whisper fallback
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
//
// Cost:
//   Groq whisper-large-v3: ~$0.0001-0.0004/min (much cheaper)
//   OpenAI whisper-1:      $0.006/min (fallback only)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface TranscribeRequest {
  audio_path: string;
  language?: string;  // ISO-639-1 ("pt", "en", …)
}

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
  const text = (await res.text()).trim();
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
  const text = (await res.text()).trim();
  return { ok: true, text };
}

// ─── Handler ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    // ─── 1. Auth ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqKey     = Deno.env.get("GROQ_API_KEY");
    const openaiKey   = Deno.env.get("OPENAI_API_KEY");

    if (!groqKey && !openaiKey) {
      return json({ error: "no_provider_configured" }, 500);
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    // ─── 2. Parse + validate ───
    const body = await req.json() as TranscribeRequest;
    if (!body.audio_path || typeof body.audio_path !== "string") {
      return json({ error: "audio_path_required" }, 400);
    }
    const firstSegment = body.audio_path.split("/")[0];
    if (firstSegment !== user.id) {
      return json({ error: "forbidden_path" }, 403);
    }

    // ─── 3. Download audio ───
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: fileData, error: dlErr } = await adminClient
      .storage
      .from("pill-audio")
      .download(body.audio_path);
    if (dlErr || !fileData) {
      return json({ error: "download_failed", detail: dlErr?.message }, 404);
    }

    const fileName = body.audio_path.split("/").pop() ?? "audio.webm";

    // ─── 4. Try Groq first, fall back to OpenAI ───
    const attempts: Array<{ provider: string; result: ProviderResult }> = [];

    if (groqKey) {
      const t0 = performance.now();
      const groqResult = await callGroq(fileData, fileName, body.language, groqKey);
      const ms = Math.round(performance.now() - t0);
      attempts.push({ provider: "groq", result: groqResult });
      if (groqResult.ok) {
        console.log(`transcribe-audio: groq ok in ${ms}ms`);
        return json({ text: groqResult.text, provider: "groq", ms });
      }
      console.warn(`transcribe-audio: groq failed (${groqResult.status}): ${groqResult.detail?.slice(0, 200)}`);
    }

    if (openaiKey) {
      const t0 = performance.now();
      const openaiResult = await callOpenAI(fileData, fileName, body.language, openaiKey);
      const ms = Math.round(performance.now() - t0);
      attempts.push({ provider: "openai", result: openaiResult });
      if (openaiResult.ok) {
        console.log(`transcribe-audio: openai ok in ${ms}ms (groq fallback)`);
        return json({ text: openaiResult.text, provider: "openai", ms });
      }
      console.error(`transcribe-audio: openai failed (${openaiResult.status}): ${openaiResult.detail?.slice(0, 200)}`);
    }

    // Both failed (or only one configured and it failed)
    return json({
      error: "all_providers_failed",
      attempts: attempts.map(a => ({
        provider: a.provider,
        status: a.result.status,
        detail: a.result.detail?.slice(0, 200),
      })),
    }, 502);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: "internal", detail: message }, 500);
  }
});
