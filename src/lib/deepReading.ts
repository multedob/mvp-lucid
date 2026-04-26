// src/lib/deepReading.ts
// ============================================================
// Trigger fire-and-forget para regenerar deep_reading_text do ciclo.
// Disparado após cada pill completed (eco gerado) + cada bloco do questionnaire.
// Não bloqueia UI — falhas são logadas mas não impactam o fluxo do user.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

/**
 * Dispara regen do deep reading em background.
 * NÃO use await — esse helper já é fire-and-forget por design.
 *
 * @param ipeCycleId — id do ipe_cycle ativo
 */
export function triggerDeepReadingRefresh(ipeCycleId: string | null | undefined): void {
  if (!ipeCycleId) {
    console.warn("[deepReading] skip — no ipe_cycle_id");
    return;
  }

  // Background: não retornamos a promise
  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn("[deepReading] skip — no auth session");
        return;
      }

      const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL
        ?? "https://tomtximafvrhmuchjyqt.supabase.co";
      const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY
        ?? (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supaUrl}/functions/v1/lucid-deep-reading`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ipe_cycle_id: ipeCycleId }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.warn(`[deepReading] regen returned ${res.status}:`, txt.slice(0, 200));
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.skipped) {
        console.log(`[deepReading] skipped: ${data.skipped}`);
      } else if (data?.deep_reading_length) {
        console.log(`[deepReading] regen ok — ${data.deep_reading_length} chars`);
      }
    } catch (err) {
      console.warn("[deepReading] regen failed silently:", err);
    }
  })();
}
