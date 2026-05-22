// supabase/functions/delete-account/index.ts
// Hard delete: remove ALL user data from every table + storage objects, then deletes auth.user.
// LGPD art. 18 (direito à eliminação) / Apple App Store requirement (2022) / GDPR art. 17.
//
// v2.0 (2026-05-22) — Auditoria S8 P0 fix: estendido pra apagar 7 tabelas + storage
//   que ficavam órfãs na versão anterior:
//     - pill_eco_events (via ipe_cycle_id cascade)
//     - third_party_mini_insights / scoring / responses (via invite_id cascade)
//     - third_party_invites (user_id direto)
//     - echoes, dev_feedback, team_message_views, user_onboarding_state (user_id direto)
//     - storage pill-audio: pasta {uid}/* + pastas {invite_id}/* dos terceiros do user

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authError || !user) return json({ error: "Invalid token" }, 401);

  const uid = user.id;

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
      // Child tables — ordem: deepest first
      await supabase.from("scoring_audit").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("block_responses").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("canonical_ils").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("pill_scoring").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("pill_responses").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("questionnaire_state").delete().in("ipe_cycle_id", cycleIds);
      // v2.0 — pill_eco_events estava órfã
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
    // v2.0 — todas estavam órfãs
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
    // v2.0 — todas estavam órfãs
    // ──────────────────────────────────────────────────────────
    await supabase.from("echoes").delete().eq("user_id", uid);
    await supabase.from("dev_feedback").delete().eq("user_id", uid);
    await supabase.from("team_message_views").delete().eq("user_id", uid);
    await supabase.from("user_onboarding_state").delete().eq("user_id", uid);

    // ──────────────────────────────────────────────────────────
    // 5. Storage cleanup — bucket pill-audio
    // v2.0 — áudios do user + áudios dos terceiros dele
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
      // Não bloqueia — log e segue. Storage órfão é menor que falha total.
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
        // idem — não bloqueia
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
      console.error("AUTH_DELETE_ERROR:", deleteAuthError);
      return json({ error: "Failed to delete auth user", detail: deleteAuthError.message }, 500);
    }

    return json({
      success: true,
      message: "All user data deleted",
      tables_cleaned: 15,
      storage_cleaned: true,
    }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("DELETE_ACCOUNT_ERROR:", msg);
    return json({ error: "Internal error during deletion", detail: msg }, 500);
  }
});
