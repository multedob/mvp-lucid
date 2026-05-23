// supabase/functions/delete-account/index.ts
// Hard delete: remove ALL user data from every table + storage objects, then deletes auth.user.
// LGPD art. 18 (direito à eliminação) / Apple App Store requirement (2022) / GDPR art. 17.
//
// v2.1 (2026-05-23) — F4-03 hardening: CORS restrito, rate limit, body limit,
//   mensagens sanitizadas, audit trail estruturado. Cascade intocada.
// v2.0 (2026-05-22) — Auditoria S8 P0 fix: estendido pra apagar 7 tabelas + storage.

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

function json(body: Record<string, unknown>, status: number, req?: Request) {
  const origin = req?.headers.get("origin") ?? null;
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

// ─── Rate limit por user_id (anti-abuse) ─────────────────────
// Delete é destrutivo — usuário normal deleta 1 vez na vida.
const RATE_LIMIT_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + HOUR_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_HOUR) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req.headers.get("origin")) });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, req);

  // Body size limit (defensive — endpoint não precisa de body)
  const contentLength = parseInt(req.headers.get("content-length") ?? "0");
  if (contentLength > 1_000) {
    return json({ error: "payload_too_large" }, 413, req);
  }

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401, req);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authError || !user) return json({ error: "unauthorized" }, 401, req);

  const uid = user.id;

  if (!checkRateLimit(uid)) {
    console.warn(`delete-account: rate_limited user=${uid}`);
    return json({ error: "rate_limited" }, 429, req);
  }

  try {
    // ──────────────────────────────────────────────────────────
    // 1. IPE engine cascade (ipe_cycles → child tables)
    // ──────────────────────────────────────────────────────────
    const { data: ipeCycles } = await supabase
      .from("ipe_cycles")
      .select("id")
      .eq("user_id", uid);
    const cycleIds = (ipeCycles ?? []).map((c: { id: string }) => c.id);

    if (cycleIds.length > 0) {
      await supabase.from("scoring_audit").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("block_responses").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("canonical_ils").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("pill_scoring").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("pill_responses").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("questionnaire_state").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("pill_eco_events").delete().in("ipe_cycle_id", cycleIds);

      await supabase.from("ipe_cycles").delete().eq("user_id", uid);
    }

    // ──────────────────────────────────────────────────────────
    // 2. HAGO engine cascade (cycles → child tables) — legado
    // ──────────────────────────────────────────────────────────
    const { data: hagoCycles } = await supabase
      .from("cycles")
      .select("id")
      .eq("user_id", uid);
    const hagoCycleIds = (hagoCycles ?? []).map((c: { id: string }) => c.id);

    if (hagoCycleIds.length > 0) {
      await supabase.from("structural_snapshots").delete().in("cycle_id", hagoCycleIds);
      await supabase.from("node_history").delete().in("cycle_id", hagoCycleIds);
      await supabase.from("audit_log").delete().in("cycle_id", hagoCycleIds);
      await supabase.from("cycles").delete().eq("user_id", uid);
    }

    // ──────────────────────────────────────────────────────────
    // 3. Third-party cascade (invites → responses/scoring/insights)
    // ──────────────────────────────────────────────────────────
    const { data: invites } = await supabase
      .from("third_party_invites")
      .select("id")
      .eq("user_id", uid);
    const inviteIds = (invites ?? []).map((i: { id: string }) => i.id);

    if (inviteIds.length > 0) {
      await supabase.from("third_party_mini_insights").delete().in("invite_id", inviteIds);
      await supabase.from("third_party_scoring").delete().in("invite_id", inviteIds);
      await supabase.from("third_party_responses").delete().in("invite_id", inviteIds);
      await supabase.from("third_party_invites").delete().eq("user_id", uid);
    }

    // ──────────────────────────────────────────────────────────
    // 4. Direct user_id tables (sem cascade)
    // ──────────────────────────────────────────────────────────
    await supabase.from("echoes").delete().eq("user_id", uid);
    await supabase.from("dev_feedback").delete().eq("user_id", uid);
    await supabase.from("team_message_views").delete().eq("user_id", uid);
    await supabase.from("user_onboarding_state").delete().eq("user_id", uid);

    // ──────────────────────────────────────────────────────────
    // 5. Storage cleanup — bucket pill-audio
    // ──────────────────────────────────────────────────────────
    // a) Pasta do próprio user: {uid}/*
    try {
      const { data: userFiles } = await supabase.storage
        .from("pill-audio")
        .list(uid, { limit: 1000 });
      if (userFiles && userFiles.length > 0) {
        const paths = userFiles.map((f) => `${uid}/${f.name}`);
        await supabase.storage.from("pill-audio").remove(paths);
      }
    } catch (storageErr) {
      console.error("STORAGE_USER_CLEANUP_ERROR:", storageErr);
    }

    // b) Pastas dos terceiros do user: {invite_id}/{token}/{question}.*
    for (const inviteId of inviteIds) {
      try {
        const { data: tokenDirs } = await supabase.storage
          .from("pill-audio")
          .list(inviteId, { limit: 1000 });
        if (tokenDirs && tokenDirs.length > 0) {
          for (const tokenDir of tokenDirs) {
            const { data: nested } = await supabase.storage
              .from("pill-audio")
              .list(`${inviteId}/${tokenDir.name}`, { limit: 1000 });
            if (nested && nested.length > 0) {
              const paths = nested.map((f) => `${inviteId}/${tokenDir.name}/${f.name}`);
              await supabase.storage.from("pill-audio").remove(paths);
            }
          }
        }
      } catch (storageErr) {
        console.error(`STORAGE_TP_CLEANUP_ERROR (invite ${inviteId}):`, storageErr);
      }
    }

    // ──────────────────────────────────────────────────────────
    // 6. users row (version tracking)
    // ──────────────────────────────────────────────────────────
    await supabase.from("users").delete().eq("id", uid);

    // ──────────────────────────────────────────────────────────
    // 7. auth.user — FINAL (remove login credentials)
    // ──────────────────────────────────────────────────────────
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(uid);
    if (deleteAuthError) {
      console.error(`delete-account: auth_delete_failed user=${uid} err=${deleteAuthError.message}`);
      return json({ error: "deletion_failed" }, 500, req);
    }

    // Audit trail LGPD — registro estruturado de exclusão
    console.log(JSON.stringify({
      kind: "delete_account_success",
      user_id: uid,
      ipe_cycles_deleted: cycleIds.length,
      hago_cycles_deleted: hagoCycleIds.length,
      third_party_invites_deleted: inviteIds.length,
      timestamp: new Date().toISOString(),
    }));

    return json({
      success: true,
      message: "All user data deleted",
    }, 200, req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`delete-account: internal_error user=${uid} err=${msg}`);
    return json({ error: "internal_error" }, 500, req);
  }
});
