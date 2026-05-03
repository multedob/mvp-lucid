// supabase/functions/get-team-message/index.ts
// ============================================================
// A21 — Backend de mensagens contextuais (EmptyStateMessage)
//
// Lógica:
//   - Recebe context_key
//   - Busca mensagens ativas pra esse contexto (priority DESC, created_at ASC)
//   - Filtra: que user ainda NÃO viu
//   - Pega a primeira, marca como vista (fire-and-forget), retorna
//   - Se user já viu todas → { message: null }
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "a21-team-messages-v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  const { context_key } = body;
  if (!context_key) return json({ error: "Missing context_key" }, 400);

  // 1. Mensagens ativas pro contexto (priority DESC, created_at ASC)
  const { data: candidates, error: candErr } = await admin
    .from("team_messages")
    .select("id, text, tone")
    .eq("context_key", context_key)
    .eq("active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (candErr) {
    console.error(`[${DEPLOY_FINGERPRINT}] candidates query error:`, candErr);
    return json({ error: candErr.message }, 500);
  }
  if (!candidates || candidates.length === 0) {
    return json({ message: null });
  }

  // 2. Views do user pra esse subset de mensagens
  const candidateIds = candidates.map((c) => c.id);
  const { data: views } = await admin
    .from("team_message_views")
    .select("message_id")
    .eq("user_id", user_id)
    .in("message_id", candidateIds);
  const seenIds = new Set((views ?? []).map((v) => v.message_id));

  // 3. Pega a primeira que user não viu
  const next = candidates.find((m) => !seenIds.has(m.id));
  if (!next) {
    return json({ message: null });
  }

  // 4. Marca como vista (fire-and-forget — não bloqueia response se falhar)
  admin
    .from("team_message_views")
    .insert({ user_id, message_id: next.id })
    .then(({ error }) => {
      if (error) console.error(`[${DEPLOY_FINGERPRINT}] mark seen failed:`, error);
    });

  return json({
    id: next.id,
    text: next.text,
    tone: next.tone,
    debug_fingerprint: DEPLOY_FINGERPRINT,
  });
});
