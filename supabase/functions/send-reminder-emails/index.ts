// supabase/functions/send-reminder-emails/index.ts
// F7B — Email reminders para users inativos há 5+ dias.
// Chamada por pg_cron diariamente. Auth via x-cron-secret header.
// Envia via Resend, registra em email_reminders_sent, dedup 7 dias.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
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

const FROM_EMAIL = "rdwth <hello@rdwth.com>";
const APP_BASE_URL = "https://rdwth.com";
const MAX_BATCH_SIZE = 50;

function renderEmailHtml(displayName: string): string {
  const safeName = displayName.toLowerCase().split(" ")[0];
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #111; max-width: 480px; margin: 0 auto; padding: 32px 24px; line-height: 1.5;">
    <p>oi ${safeName},</p>
    <p>faz 5 dias.</p>
    <p>tem uma pill nova esperando: ela te coloca diante de uma pergunta que você ainda não fez pra si.</p>
    <p style="margin: 32px 0;">
      <a href="${APP_BASE_URL}?entry_source=email_reminder" style="background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        abrir pill
      </a>
    </p>
    <p style="color: #666; font-size: 13px; margin-top: 48px;">— rdwth</p>
  </body>
</html>`;
}

function renderEmailText(displayName: string): string {
  const safeName = displayName.toLowerCase().split(" ")[0];
  return `oi ${safeName},

faz 5 dias.

tem uma pill nova esperando: ela te coloca diante de uma pergunta que você ainda não fez pra si.

abrir pill: ${APP_BASE_URL}?entry_source=email_reminder

— rdwth`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req.headers.get("origin")) });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, req);

  try {
    // 1. Auth: valida cron secret
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    if (!cronSecret || provided !== cronSecret) {
      return json({ error: "unauthorized" }, 401, req);
    }

    // 2. Body size limit
    const contentLength = parseInt(req.headers.get("content-length") ?? "0");
    if (contentLength > 1_000) return json({ error: "payload_too_large" }, 413, req);

    // 3. Setup clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "missing_resend_key" }, 500, req);

    const admin = createClient(supabaseUrl, serviceKey);

    // 4. Cálculo de janelas
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 5. Buscar users que completaram warmup
    const { data: onboardedUsers, error: obErr } = await admin
      .from("user_onboarding_state")
      .select("user_id")
      .not("warmup_completed_at", "is", null);

    if (obErr) {
      console.error(`send-reminder-emails: query_onboarded_failed err=${obErr.message}`);
      return json({ error: "query_failed" }, 500, req);
    }

    if (!onboardedUsers || onboardedUsers.length === 0) {
      return json({ sent: 0, failed: 0, total_candidates: 0, skipped_recent: 0 }, 200, req);
    }

    // 6. Pra cada onboarded user, checar last_sign_in_at + email
    const eligibleUsers: Array<{ id: string; email: string; display_name: string }> = [];
    for (const u of onboardedUsers) {
      const uid = (u as any).user_id as string;
      const { data: authData, error: authErr } = await admin.auth.admin.getUserById(uid);
      if (authErr || !authData?.user) continue;
      const lastSignIn = authData.user.last_sign_in_at;
      if (!lastSignIn || lastSignIn > fiveDaysAgo) continue;
      if (!authData.user.email) continue;
      // display_name vem do auth.users.user_metadata (mesmo padrão do RootRedirect em App.tsx)
      const displayName =
        (authData.user.user_metadata?.display_name as string) ??
        authData.user.email.split("@")[0] ??
        "você";
      eligibleUsers.push({ id: uid, email: authData.user.email, display_name: displayName });
    }

    if (eligibleUsers.length === 0) {
      return json({ sent: 0, failed: 0, total_candidates: 0, skipped_recent: 0 }, 200, req);
    }

    // 7. Filtrar quem NÃO recebeu reminder nos últimos 7 dias
    const eligibleIds = eligibleUsers.map(u => u.id);
    const { data: recentReminders, error: rmErr } = await admin
      .from("email_reminders_sent")
      .select("user_id")
      .in("user_id", eligibleIds)
      .gt("sent_at", sevenDaysAgo);

    if (rmErr) {
      console.error(`send-reminder-emails: query_recent_failed err=${rmErr.message}`);
      return json({ error: "query_failed" }, 500, req);
    }

    const recentSet = new Set((recentReminders ?? []).map((r: any) => r.user_id));
    const toSend = eligibleUsers.filter(u => !recentSet.has(u.id)).slice(0, MAX_BATCH_SIZE);

    // 8. Enviar emails via Resend + registrar
    let sentCount = 0;
    let failedCount = 0;

    for (const user of toSend) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: user.email,
            subject: "tem uma pill te esperando",
            html: renderEmailHtml(user.display_name),
            text: renderEmailText(user.display_name),
          }),
        });

        if (!resendRes.ok) {
          const errText = await resendRes.text();
          console.error(`send-reminder-emails: resend_failed user=${user.id} status=${resendRes.status} err=${errText.slice(0, 200)}`);
          failedCount++;
          continue;
        }

        const resendData = await resendRes.json();
        const messageId = resendData?.id ?? null;

        await admin.from("email_reminders_sent").insert({
          user_id: user.id,
          reminder_type: "inactivity_5d",
          resend_message_id: messageId,
        });

        console.log(JSON.stringify({
          kind: "reminder_sent",
          user_id: user.id,
          resend_message_id: messageId,
          timestamp: new Date().toISOString(),
        }));

        sentCount++;
      } catch (innerErr) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        console.error(`send-reminder-emails: send_loop_error user=${user.id} err=${msg}`);
        failedCount++;
      }
    }

    return json({
      sent: sentCount,
      failed: failedCount,
      total_candidates: eligibleUsers.length,
      skipped_recent: eligibleUsers.length - toSend.length,
    }, 200, req);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`send-reminder-emails: internal_error: ${message}`);
    return json({ error: "internal_error" }, 500, req);
  }
});
