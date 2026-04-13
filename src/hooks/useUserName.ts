// src/hooks/useUserName.ts
// Hook compartilhado — nome do usuário com localStorage + Supabase fallback
// Coletado uma vez no onboarding. Usado em Reed, Context, Home, Eco.

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the user's first name.
 * Priority: localStorage → Supabase user_metadata → null
 * Also syncs: if found in metadata but missing locally, writes to localStorage.
 */
export function useUserName(): string | null {
  const [name, setName] = useState<string | null>(() => {
    return localStorage.getItem("rdwth_user_name") || null;
  });

  useEffect(() => {
    // If already in localStorage, done
    if (name) return;

    // Fallback: try Supabase user_metadata
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const metaName = session?.user?.user_metadata?.display_name
          || session?.user?.user_metadata?.full_name
          || session?.user?.user_metadata?.name;
        if (metaName && typeof metaName === "string") {
          const firstName = metaName.split(" ")[0].trim();
          if (firstName) {
            localStorage.setItem("rdwth_user_name", firstName);
            setName(firstName);
          }
        }
      } catch {
        // silent — name is optional for rendering
      }
    })();
  }, [name]);

  return name;
}

/**
 * Synchronous getter for non-React contexts (edge function payloads, etc.)
 */
export function getUserName(): string | null {
  return localStorage.getItem("rdwth_user_name") || null;
}
