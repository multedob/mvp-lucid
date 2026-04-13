// supabase/functions/delete-account/index.ts
// Hard delete: removes ALL user data from every table, then deletes auth.user
// Apple App Store requirement since 2022
// LGPD/GDPR compliance

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

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
  if (authError || !user) {
    return json({ error: "Invalid token" }, 401);
  }

  const uid = user.id;

  try {
    // 1. Get all ipe_cycle IDs for this user (needed for child table cleanup)
    const { data: ipeCycles } = await supabase
      .from("ipe_cycles")
      .select("id")
      .eq("user_id", uid);
    const cycleIds = (ipeCycles ?? []).map((c: { id: string }) => c.id);

    if (cycleIds.length > 0) {
      // 2. Delete IPE child tables (order: deepest first)
      // scoring_audit, block_responses, canonical_ils, pill_scoring, pill_responses, questionnaire_state
      await supabase.from("scoring_audit").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("block_responses").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("canonical_ils").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("pill_scoring").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("pill_responses").delete().in("ipe_cycle_id", cycleIds);
      await supabase.from("questionnaire_state").delete().in("ipe_cycle_id", cycleIds);

      // 3. Delete ipe_cycles
      await supabase.from("ipe_cycles").delete().eq("user_id", uid);
    }

    // 4. Delete HAGO engine tables (cycles → snapshots/node_history/audit_log)
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

    // 5. Delete users row (public.users — version tracking)
    await supabase.from("users").delete().eq("id", uid);

    // 6. Delete auth.user (this is the final step — removes login credentials)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(uid);
    if (deleteAuthError) {
      console.error("AUTH_DELETE_ERROR:", deleteAuthError);
      return json({ error: "Failed to delete auth user", detail: deleteAuthError.message }, 500);
    }

    return json({ success: true, message: "All user data deleted" }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("DELETE_ACCOUNT_ERROR:", msg);
    return json({ error: "Internal error during deletion", detail: msg }, 500);
  }
});
