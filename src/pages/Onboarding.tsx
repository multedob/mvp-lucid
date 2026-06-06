// src/pages/Onboarding.tsx
// Coleta do primeiro nome — fluxo de onboarding
// Persiste nome em localStorage (cache) + Supabase user_metadata + marca name_set step
// Pré-popula com primeiro nome do Google quando OAuth (A18)
// continuar → /  (RootRedirect leva para /warmup ou /home conforme estado)
//
// Refactor B-S5.D: trecho de apresentação do Reed migra pra SystemTerminalLine
// (voz sistema com prefixo "> " e typewriter).
//
// Ajuste 2026-05-04 (B-S5.G): cascata sequencial dos elementos (sistema → pergunta
// Reed → input → botão continuar → "decidir depois"), entrando de cima pra baixo
// em cadeia, igual ao Warmup. Substitui o reedReady único anterior.
//
// Merge 126eb90 (Bruno): markOnboardingStep("name_set") em ambos handlers + redirect
// "/home" → "/" pra passar pelo RootRedirect (vai pra /warmup se ainda não fez).
// Copy da pergunta: "como Reed deve chamar você?" → "como eu devo te chamar?" (primeira pessoa).

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubmitting } from "@/hooks/useSubmitting";
import { markOnboardingStep } from "@/hooks/useOnboardingState";
import AppHeader from "@/components/AppHeader";
import { track } from "@/lib/analytics";
import SystemTerminalLine from "@/components/SystemTerminalLine";
import { FeedbackButton } from "@/components/FeedbackButton";

// Cascata — timing de cada elemento, alinhado com Warmup.
// Sistema typewriter: ~58 chars × 30ms ≈ 1740ms. Pergunta entra após.
const CASCADE_QUESTION_MS = 1900;
const CASCADE_INPUT_MS = 2400;
const CASCADE_BUTTON_MS = 2800;


export default function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, wrap] = useSubmitting();

  // Cascata sequencial — controla entrada dos elementos de cima pra baixo
  const [showQuestion, setShowQuestion] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showButton, setShowButton] = useState(false);
  

  const inputRef = useRef<HTMLInputElement>(null);

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

  // ─── Cascata sequencial — sistema → pergunta → input → botão → skip ─
  useEffect(() => {
    const t1 = window.setTimeout(() => setShowQuestion(true), CASCADE_QUESTION_MS);
    const t2 = window.setTimeout(() => setShowInput(true), CASCADE_INPUT_MS);
    const t3 = window.setTimeout(() => setShowButton(true), CASCADE_BUTTON_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  // Foca o input quando ele aparece (autoFocus não dispara em fade-in delayed)
  useEffect(() => {
    if (showInput) {
      inputRef.current?.focus();
    }
  }, [showInput]);

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

    navigate("/");
  });

  const canContinue = !!(name.trim() && !submitting && showButton);

  return (
    <div className="r-screen">
      <AppHeader />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "flex-start", padding: "12px 24px 0",
      }}>
        {/* 1. Sistema (topo) — typewriter, sempre visível desde o mount */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 24,
        }}>
          <SystemTerminalLine
            text={"reed é a voz do rdwth.\nnas pills, no questionário, na conversa."}
          />
          <FeedbackButton />
        </div>

        {/* 2. Pergunta Reed — fade-in após sistema terminar */}
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16,
          lineHeight: 1.6, color: "var(--r-text)", marginBottom: 20,
          opacity: showQuestion ? 1 : 0,
          transition: "opacity 600ms ease-in",
        }}>
          como eu devo te chamar?
        </div>

        {/* 3. Input — fade-in após pergunta */}
        <div style={{
          borderBottom: "0.5px solid var(--r-ghost)",
          paddingBottom: 8, marginBottom: 32,
          opacity: showInput ? 1 : 0,
          transition: "opacity 600ms ease-in",
        }}>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleContinue(); }}
            placeholder="seu nome"
            disabled={!showInput}
            style={{
              background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--r-font-ed)", fontWeight: 300, fontSize: 14,
              color: "var(--r-text)", width: "100%", padding: 0,
              letterSpacing: "0.01em",
            }}
          />
        </div>

        {/* 4. Botão continuar — fade-in após input */}
        <div
          onClick={canContinue ? handleContinue : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: canContinue ? "pointer" : "default",
            opacity: showButton ? (canContinue ? 1 : 0.25) : 0,
            transition: "opacity 600ms ease-in",
            pointerEvents: canContinue ? "auto" : "none",
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

      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
