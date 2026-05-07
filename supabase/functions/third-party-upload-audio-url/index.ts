import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.x-upload-audio-url-v1";

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
  const { token, question_id, ext } = body;

  if (!token || !question_id) {
    return json({ error: "Missing token or question_id" }, 400);
  }

  const supabase_url = Deno.env.get("SUPABASE_URL");
  const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase_url || !service_role) return json({ error: "Missing config" }, 500);

  const admin = createClient(supabase_url, service_role);

  const { data: invite, error: invErr } = await admin
    .from("third_party_invites")
    .select("id, status")
    .eq("token", token)
    .single();
  if (invErr || !invite) return json({ error: "Invalid link" }, 404);
  if (invite.status === "revoked") return json({ error: "Link revoked" }, 403);
  if (invite.status === "submitted") return json({ error: "Already submitted" }, 403);

  const safeExt = ["webm", "ogg", "m4a", "mp4", "wav"].includes(ext) ? ext : "webm";
  const path = `${invite.id}/${token}/${question_id}_third-party.${safeExt}`;

  const { data: signed, error: signErr } = await admin.storage
    .from("pill-audio")
    .createSignedUploadUrl(path, { upsert: true });

  if (signErr || !signed) {
    console.error("[upload-audio-url] signedUrl err:", signErr);
    return json({ error: "Failed to create upload URL" }, 500);
  }

  return json({
    path,
    signed_url: signed.signedUrl,
    token: signed.token,
  });
});
