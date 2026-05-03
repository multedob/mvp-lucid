// src/pages/Onboarding.tsx
// Coleta do primeiro nome — fluxo de onboarding
// Persiste nome em localStorage + Supabase user_metadata
// Pré-popula com primeiro nome do Google quando OAuth (A18)
// continuar → /home

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubmitting } from "@/hooks/useSubmitting";
import { getToday } from "@/lib/api";
import { track } from "@/lib/analytics";

export default function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, wrap] = useSubmitting();

  // ─── Pré-popular com nome do Google quando OAuth (A18) ─────────
  useEffect(() => {
    async function prefillFromOAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const provider = session.user.app_metadata?.provider;
      if (provider !== "google") return;

      const meta = session.user.user_metadata as Record<string, unknown> | undefined;
      const givenName = meta?.given_name as string | undefined;
      const fullName = meta?.full_name as string | undefined;
      const fallbackName = meta?.name as string | undefined;

      let prefill: string | undefined = givenName;
      if (!prefill && fullName) prefill = fullName.split(" ")[0];
      if (!prefill && fallbackName) prefill = fallbackName.split(" ")[0];

      if (prefill) {
        setName(prefill);
        track("name_prefilled_from_oauth", { provider: "google" });
      }
    }
    prefillFromOAuth();
  }, []);

  const handleContinue = wrap(async () => {
    if (!name.trim()) return;
    const trimmed = name.trim();

    track("name_provided", { length: trimmed.length });

    // Persist locally (immediate availability across the app)
    localStorage.setItem("rdwth_user_name", trimmed);

    // Persist server-side (survives device/browser changes)
    try {
      await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });
    } catch {
      // Non-blocking — localStorage is primary, metadata is backup
    }

    navigate("/home");
  });

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "28px 24px",
      }}>
        <div style={{
          fontFamily: "var(--r-font-sys)",
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--r-voice-sys)",
          marginBottom: 16,
          textAlign: "left",
        }}>
          reed é a voz do rdwth.<br />
          nas pills, no questionário, na conversa.
        </div>

        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16,
          lineHeight: 1.6, color: "var(--r-text)", marginBottom: 20,
        }}>
          como Reed deve chamar você?
        </div>

        <div style={{
          borderBottom: "0.5px solid var(--r-ghost)",
          paddingBottom: 8, marginBottom: 32,
        }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleContinue(); }}
            placeholder="seu nome"
            autoFocus
            style={{
              background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--r-font-ed)", fontWeight: 300, fontSize: 14,
              color: "var(--r-text)", width: "100%", padding: 0,
              letterSpacing: "0.01em",
            }}
          />
        </div>

        <div
          onClick={handleContinue}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: (name.trim() && !submitting) ? "pointer" : "default",
            opacity: (name.trim() && !submitting) ? 1 : 0.25, transition: "opacity 0.2s",
            pointerEvents: (name.trim() && !submitting) ? "auto" : "none",
          }}
        >
          <div style={{ width: 1, height: 14, background: "var(--r-accent)", flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 12,
            color: "var(--r-text)", letterSpacing: "0.06em",
          }}>
            continuar
          </span>
        </div>

        {/* Decidir depois — pula coleta de nome */}
        <div
          onClick={() => {
            track("name_deferred");
            localStorage.setItem("rdwth_user_name_deferred", "1");
            navigate("/home");
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", marginTop: 24,
          }}
        >
          <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
            color: "var(--r-muted)", letterSpacing: "0.06em",
          }}>
            decidir depois →
          </span>
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
