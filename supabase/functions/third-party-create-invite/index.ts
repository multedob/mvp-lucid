// supabase/functions/third-party-create-invite/index.ts
// ============================================================
// W20.1 — User logado cria novo convite pra terceiro responder.
// Limita a 5 convites ATIVOS (pending+submitted) por ipe_cycle.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.2-create-invite-v2-pronoun-alphabeta";
const MAX_INVITES_PER_CYCLE = 8;
const APP_BASE_URL = "https://mvp-lucid.lovable.app";
const VALID_PRONOUNS = ["ela", "ele", "elu"] as const;

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
  const { ipe_cycle_id, user_pronoun } = body;
  if (!ipe_cycle_id) return json({ error: "Missing ipe_cycle_id" }, 400);
  const pronoun: string = (typeof user_pronoun === "string" && VALID_PRONOUNS.includes(user_pronoun as any))
    ? user_pronoun
    : "ela"; // default neutro pro feminino se não vier

  // Confirma cycle pertence ao user
  const { data: cycle, error: cErr } = await supabase
    .from("ipe_cycles")
    .select("id, user_id")
    .eq("id", ipe_cycle_id)
    .single();
  if (cErr || !cycle || cycle.user_id !== user_id) {
    return json({ error: "Cycle not found or unauthorized" }, 404);
  }

  // Limita convites ativos por cycle (max 8)
  const { count, error: cntErr } = await supabase
    .from("third_party_invites")
    .select("id", { count: "exact", head: true })
    .eq("ipe_cycle_id", ipe_cycle_id)
    .in("status", ["pending", "submitted"]);
  if (cntErr) return json({ error: "Count query failed", detail: cntErr.message }, 500);
  if ((count ?? 0) >= MAX_INVITES_PER_CYCLE) {
    return json({ error: `Max ${MAX_INVITES_PER_CYCLE} active invites per cycle reached` }, 403);
  }

  // Decide question_set rotativo (alpha/beta) baseado em quantos invites já existem.
  // Garante cobertura de 16 linhas com 2 respondentes (1 alpha + 1 beta).
  const question_set = ((count ?? 0) % 2 === 0) ? "alpha" : "beta";

  // Gera token e insere
  const newToken = crypto.randomUUID();
  const { data: insertedRows, error: insErr } = await admin
    .from("third_party_invites")
    .insert([{
      ipe_cycle_id,
      user_id,
      token: newToken,
      status: "pending",
      user_pronoun: pronoun,
      question_set,
    }])
    .select("id, token, created_at, question_set")
    .single();
  if (insErr || !insertedRows) {
    return json({ error: "Insert failed", detail: insErr?.message }, 500);
  }

  return json({
    invite_id: insertedRows.id,
    token: insertedRows.token,
    url: `${APP_BASE_URL}/third-party/${insertedRows.token}`,
    created_at: insertedRows.created_at,
    question_set: insertedRows.question_set,
    user_pronoun: pronoun,
    debug_fingerprint: DEPLOY_FINGERPRINT,
  });
});
