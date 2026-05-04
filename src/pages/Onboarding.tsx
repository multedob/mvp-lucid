// src/pages/Onboarding.tsx
// Coleta do primeiro nome — fluxo de onboarding
// Persiste nome em localStorage (cache) + Supabase user_metadata + marca name_set step
// Pré-popula com primeiro nome do Google quando OAuth (A18)
// continuar → /home  |  decidir depois → /home (também marca name_set p/ não loopar)
//
// Refactor B-S5.D: trecho de apresentação do Reed migrou pra SystemTerminalLine
// (voz sistema com prefixo "> " e typewriter). "como Reed deve chamar você?"
// é voz Reed (Urbanist Bold), continua como está MAS aparece com fade-in
// delayed (~500ms) — em cadeia com o sistema digitando, não antes nem depois.
// Voz sistema fala primeiro; Reed entra suavemente enquanto sistema ainda digita.
// "continuar" e "decidir depois →" são labels de ação, não fala do sistema —
// mantêm tipografia atual. Saudação topo, voz sistema sempre no topo.
//
// Merge 126eb90 (Bruno): markOnboardingStep("name_set") em ambos handlers
// (continuar e decidir depois) — single source of truth pra fluxo de redirect.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubmitting } from "@/hooks/useSubmitting";
import { markOnboardingStep } from "@/hooks/useOnboardingState";
import { getToday } from "@/lib/api";
import { track } from "@/lib/analytics";
import SystemTerminalLine from "@/components/SystemTerminalLine";

export default function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, wrap] = useSubmitting();
  const [reedReady, setReedReady] = useState(false);

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

  // ─── Reed pergunta entra em cadeia (~500ms após sistema começar a digitar) ─
  useEffect(() => {
    const timer = setTimeout(() => setReedReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = wrap(async () => {
    if (!name.trim()) return;
    const trimmed = name.trim();

    track("name_provided", { length: trimmed.length });

    // Persist locally (immediate availability across the app — cache)
    localStorage.setItem("rdwth_user_name", trimmed);

    // Persist server-side (survives device/browser changes)
    try {
      await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });
    } catch {
      // Non-blocking — localStorage is primary, metadata is backup
    }

    // Mark onboarding step (single source of truth para fluxo de redirect)
    await markOnboardingStep("name_set");

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
        justifyContent: "flex-start", padding: "12px 24px 0",
      }}>
        {/* Voz sistema — topo */}
        <div style={{ marginBottom: 24 }}>
          <SystemTerminalLine
            text={"reed é a voz do rdwth.\nnas pills, no questionário, na conversa."}
          />
        </div>

        {/* Reed pergunta — fade-in delayed (em cadeia com sistema digitando) */}
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16,
          lineHeight: 1.6, color: "var(--r-text)", marginBottom: 20,
          opacity: reedReady ? 1 : 0,
          transition: "opacity 800ms ease-in",
        }}>
          como eu devo te chamar?
        </div>

        <div style={{
          borderBottom: "0.5px solid var(--r-ghost)",
          paddingBottom: 8, marginBottom: 32,
          opacity: reedReady ? 1 : 0,
          transition: "opacity 800ms ease-in 100ms",
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
            opacity: (name.trim() && !submitting && reedReady) ? 1 : 0.25,
            transition: "opacity 0.3s",
            pointerEvents: (name.trim() && !submitting && reedReady) ? "auto" : "none",
          }}
        >
          <div style={{ width: 1, height: 14, background: "var(--r-telha)", flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 12,
            color: "var(--r-text)", letterSpacing: "0.06em",
          }}>
            continuar
          </span>
        </div>

        {/* Decidir depois — pula coleta de nome */}
        <div
          onClick={async () => {
            track("name_deferred");
            localStorage.setItem("rdwth_user_name_deferred", "1");
            // A2 — marca name_set mesmo sem nome para evitar loop no RootRedirect.
            // Step "name_set" significa "passou pela tela de nome", não "tem nome".
            await markOnboardingStep("name_set");
            navigate("/home");
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", marginTop: 24,
            opacity: reedReady ? 1 : 0,
            transition: "opacity 800ms ease-in 200ms",
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
