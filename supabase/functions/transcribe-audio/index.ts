// ============================================================
// transcribe-audio/index.ts
// v1.0 — Whisper transcription for pill audio recordings
// ============================================================
// Flow:
//   1. Client uploads audio blob to storage bucket `pill-audio` at
//      {user_id}/{cycle_id}/{pill_id}_{moment}.webm (signed URL or
//      direct upload via supabase-js with auth).
//   2. Client calls this function with { audio_path, language? } where
//      audio_path is the storage key inside the pill-audio bucket.
//   3. Function downloads the audio (service role), sends to OpenAI
//      Whisper, returns { text } to the client.
//   4. Client writes transcript to pill_responses.*_transcription_final
//      and pastes into the textarea (user can edit before submit).
//
// Secrets required:
//   OPENAI_API_KEY   — OpenAI platform key with audio.transcriptions
//   SUPABASE_URL     — project URL
//   SUPABASE_SERVICE_ROLE_KEY — service role (to read private bucket)
//
// Cost: Whisper is $0.006/min. A 2-min recording = ~$0.012.
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
  audio_path: string;        // storage key inside pill-audio bucket
  language?: string;         // ISO-639-1 ("pt", "en", …) — optional hint
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    // ─── 1. Auth: must be a logged-in user ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey   = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
    if (!openaiKey) return json({ error: "missing_openai_key" }, 500);

    // Anon client (with caller JWT) — used to verify the caller's user_id.
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    // ─── 2. Parse request ───
    const body = await req.json() as TranscribeRequest;
    if (!body.audio_path || typeof body.audio_path !== "string") {
      return json({ error: "audio_path_required" }, 400);
    }

    // Enforce that the audio path starts with the caller's user_id.
    const firstSegment = body.audio_path.split("/")[0];
    if (firstSegment !== user.id) {
      return json({ error: "forbidden_path" }, 403);
    }

    // ─── 3. Download audio via service role ───
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: fileData, error: dlErr } = await adminClient
      .storage
      .from("pill-audio")
      .download(body.audio_path);
    if (dlErr || !fileData) {
      return json({ error: "download_failed", detail: dlErr?.message }, 404);
    }

    // ─── 4. Call Whisper ───
    const formData = new FormData();
    // Whisper needs a filename with a recognized extension. The bucket
    // enforces audio/* mime types; WebM is the most common browser output.
    const fileName = body.audio_path.split("/").pop() ?? "audio.webm";
    formData.append("file", fileData, fileName);
    formData.append("model", "whisper-1");
    if (body.language) formData.append("language", body.language);
    // Prefer plain-text response for simpler parsing.
    formData.append("response_format", "text");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      return json({ error: "whisper_failed", status: whisperRes.status, detail: errText }, 502);
    }

    const text = (await whisperRes.text()).trim();
    return json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: "internal", detail: message }, 500);
  }
});
