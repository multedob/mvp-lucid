// supabase/functions/third-party-create-invite/index.ts
// ============================================================
// W20.1 — User logado cria novo convite pra terceiro responder.
// Limita a 8 convites ATIVOS (pending+submitted) por ipe_cycle.
// F4 hardening: CORS restrito, rate limit, body limit, try/catch global.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.2-create-invite-v3-f4-hardening";
const MAX_INVITES_PER_CYCLE = 8;
const APP_BASE_URL = "https://rdwth.com";
const VALID_PRONOUNS = ["ela", "ele", "elu"] as const;

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

    const auth_header = req.headers.get("Authorization");
    if (!auth_header) return json({ error: "Missing authorization" }, 401, req);
    const token = auth_header.replace("Bearer ", "");

    const supabase_url = Deno.env.get("SUPABASE_URL");
    const supabase_anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabase_url || !supabase_anon || !service_role) {
      return json({ error: "Missing config" }, 500, req);
    }

    const supabase = createClient(supabase_url, supabase_anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const admin = createClient(supabase_url, service_role);

    const { data: auth_data, error: auth_err } = await supabase.auth.getUser(token);
    if (auth_err || !auth_data.user) return json({ error: "Unauthorized" }, 401, req);
    const user_id = auth_data.user.id;

    const body = await req.json().catch(() => ({}));
    const { ipe_cycle_id, user_pronoun, internal_nickname } = body;
    if (!ipe_cycle_id) return json({ error: "Missing ipe_cycle_id" }, 400, req);

    // Validação nickname (fix UX 06/jun) — obrigatório, 1-40 chars trim.
    // Defesa em profundidade: front também valida, mas backend rejeita
    // caso UI seja contornada.
    if (typeof internal_nickname !== "string") {
      return json({ error: "nickname_required" }, 400, req);
    }
    const nicknameTrimmed = internal_nickname.trim();
    if (nicknameTrimmed.length < 1 || nicknameTrimmed.length > 40) {
      return json({ error: "nickname_invalid_length" }, 400, req);
    }

    const pronoun: string = (typeof user_pronoun === "string" && VALID_PRONOUNS.includes(user_pronoun as any))
      ? user_pronoun
      : "ela";

    const { data: cycle, error: cErr } = await supabase
      .from("ipe_cycles")
      .select("id, user_id")
      .eq("id", ipe_cycle_id)
      .single();
    if (cErr || !cycle || cycle.user_id !== user_id) {
      return json({ error: "Cycle not found or unauthorized" }, 404, req);
    }

    const { count, error: cntErr } = await supabase
      .from("third_party_invites")
      .select("id", { count: "exact", head: true })
      .eq("ipe_cycle_id", ipe_cycle_id)
      .in("status", ["pending", "submitted"]);
    if (cntErr) return json({ error: "Count query failed", detail: cntErr.message }, 500, req);
    if ((count ?? 0) >= MAX_INVITES_PER_CYCLE) {
      return json({ error: `Max ${MAX_INVITES_PER_CYCLE} active invites per cycle reached` }, 403, req);
    }

    const question_set = ((count ?? 0) % 2 === 0) ? "alpha" : "beta";

    const newToken = crypto.randomUUID();

    // Slug curto (8 chars alfanuméricos) — retry em colisão.
    const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const genSlug = () => {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      let s = "";
      for (let i = 0; i < 8; i++) s += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
      return s;
    };

    let insertedRows: any = null;
    let insErr: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = genSlug();
      const { data, error } = await admin
        .from("third_party_invites")
        .insert([{
          ipe_cycle_id,
          user_id,
          token: newToken,
          slug,
          status: "pending",
          user_pronoun: pronoun,
          question_set,
          internal_nickname: nicknameTrimmed,
        }])
        .select("id, token, slug, created_at, question_set, internal_nickname")
        .single();
      if (!error) { insertedRows = data; insErr = null; break; }
      insErr = error;
      // 23505 = unique_violation (provavelmente slug colidiu) → retry
      if ((error as any).code !== "23505") break;
    }
    if (insErr || !insertedRows) {
      return json({ error: "Insert failed", detail: insErr?.message }, 500, req);
    }

    return json({
      invite_id: insertedRows.id,
      token: insertedRows.token,
      slug: insertedRows.slug,
      url: `${APP_BASE_URL}/c/${insertedRows.slug}`,
      created_at: insertedRows.created_at,
      question_set: insertedRows.question_set,
      user_pronoun: pronoun,
      internal_nickname: insertedRows.internal_nickname,
      debug_fingerprint: DEPLOY_FINGERPRINT,
    }, 200, req);
  } catch (err) {
    console.error(`[${DEPLOY_FINGERPRINT}] unhandled error:`, err);
    return json({ error: "Internal error" }, 500, req);
  }
});
