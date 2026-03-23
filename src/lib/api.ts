// src/lib/api.ts
// Utilitário compartilhado para chamadas às Supabase Edge Functions

import { supabase } from "@/integrations/supabase/client";

export async function callEdgeFunction<T = unknown>(
  name: string,
  body: object
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("no session");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`edge function "${name}" failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── TODAY helper ─────────────────────────────────────────────────
// Calcular no momento do uso, não em módulo-load
export function getToday(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "." +
    String(d.getMonth() + 1).padStart(2, "0") +
    "." +
    String(d.getDate()).padStart(2, "0")
  );
}

export async function getCurrentUserVersion(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("no session");

  const { data, error } = await (supabase.from("users") as any)
    .select("version")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) throw new Error(`failed to get user version: ${error.message}`);

  if (!data) {
    const { error: insertError } = await (supabase.from("users") as any)
      .insert({ id: session.user.id, version: 0 });

    if (insertError) {
      throw new Error(`failed to init user version: ${insertError.message}`);
    }

    return 0;
  }

  return typeof data.version === "number" ? data.version : 0;
}
