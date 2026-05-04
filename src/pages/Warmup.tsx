// src/pages/Warmup.tsx
// AFC ONB-6 — Mini-Eco Warm-up
// Par A do Banco v0.2 (#1 + #13). Streaming SSE pelo edge function warmup-eco.
// Estados: questions → streaming → done. "decidir depois" no canto inferior direito.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingStep } from "@/hooks/useOnboardingState";
import { getToday } from "@/lib/api";
import { track } from "@/lib/analytics";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// AFC ONB-6 — Par A do Banco de Perguntas Warm-up v0.2
const QUESTIONS: [string, string] = [
  "Qual decisão recente você ainda está tentando entender?",
  "O que alguém te disse recentemente que ficou voltando?",
];

type Phase = "questions" | "streaming" | "done";

export default function Warmup() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("questions");
  const [answers, setAnswers] = useState<[string, string]>(["", ""]);
  const [eco, setEco] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canContinue = answers.every((a) => a.trim().length > 0);

  async function handleSubmit() {
    if (!canContinue) return;
    setEco("");
    setError(null);
    setPhase("streaming");
    track("warmup_submitted");

    const startTime = Date.now();
    let firstTokenAt: number | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("sessão expirou.");
        setPhase("questions");
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/warmup-eco`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questions: QUESTIONS,
          responses: [answers[0].trim(), answers[1].trim()],
        }),
      });

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const ev of events) {
          const line = ev.trim();
          if (!line.startsWith("data: ")) continue;
          let parsed: { type?: string; text?: string; message?: string; latency_ms?: number };
          try {
            parsed = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (parsed.type === "token" && typeof parsed.text === "string") {
            if (firstTokenAt === null) {
              firstTokenAt = Date.now();
              track("warmup_eco_first_token", { latency_ms: firstTokenAt - startTime });
            }
            setEco((prev) => prev + parsed.text);
          } else if (parsed.type === "done") {
            track("warmup_eco_completed", { latency_ms: parsed.latency_ms ?? null });
            setPhase("done");
            return;
          } else if (parsed.type === "error") {
            throw new Error(parsed.message ?? "stream error");
          }
        }
      }
      // Se chegou aqui sem 'done' explícito, trata como done (tolerante).
      setPhase("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Warmup] error:", msg);
      setError("algo travou no caminho. tenta de novo?");
      setPhase("questions");
      track("warmup_failed", { reason: msg });
    }
  }

  async function handleSkip() {
    track("warmup_skipped", { phase });
    await markOnboardingStep("warmup_completed");
    navigate("/home");
  }

  function handleStartPills() {
    track("warmup_to_pills");
    navigate("/pills");
  }

  function handleGoHome() {
    track("warmup_to_home");
    navigate("/home");
  }

  return (
    <div className="r-screen" style={{ position: "relative" }}>
      {/* Header */}
      <div className="r-header">
        <span className="r-header-label">rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* Conteúdo */}
      <div className="r-scroll" style={{ flex: 1, padding: "24px 24px 64px" }}>
        {phase === "questions" && (
          <>
            <div
              style={{
                fontFamily: "var(--r-font-sys)",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--r-voice-sys)",
                marginBottom: 28,
                textAlign: "left",
              }}
            >
              antes de começar, dois fragmentos.<br />
              responda no seu ritmo — uma ou duas frases servem.
            </div>

            {[0, 1].map((i) => (
              <div key={i} style={{ marginBottom: 28 }}>
                <div
                  style={{
                    fontFamily: "var(--r-font-ed)",
                    fontWeight: 800,
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: "var(--r-text)",
                    marginBottom: 12,
                  }}
                >
                  {QUESTIONS[i]}
                </div>
                <textarea
                  className="r-textarea"
                  value={answers[i]}
                  onChange={(e) => {
                    const next: [string, string] = [...answers] as [string, string];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder="..."
                  rows={3}
                  style={{ width: "100%", resize: "none", fontSize: 13 }}
                />
              </div>
            ))}

            {error && (
              <div
                style={{
                  fontFamily: "var(--r-font-sys)",
                  fontSize: 10,
                  color: "var(--r-telha)",
                  letterSpacing: "0.04em",
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <div
              onClick={canContinue ? handleSubmit : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: canContinue ? "pointer" : "default",
                opacity: canContinue ? 1 : 0.3,
                marginTop: 16,
              }}
            >
              <div style={{ width: 1, height: 13, background: "var(--r-telha)", flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: "var(--r-font-sys)",
                  fontWeight: 300,
                  fontSize: 11,
                  color: "var(--r-text)",
                  letterSpacing: "0.06em",
                }}
              >
                continuar
              </span>
            </div>
          </>
        )}

        {(phase === "streaming" || phase === "done") && (
          <>
            <div
              style={{
                fontFamily: "var(--r-font-ed)",
                fontWeight: 300,
                fontSize: 16,
                lineHeight: 1.7,
                color: "var(--r-text)",
                whiteSpace: "pre-wrap",
                marginBottom: 32,
              }}
            >
              {eco}
              {phase === "streaming" && (
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    marginLeft: 2,
                    color: "var(--r-text)",
                  }}
                >
                  ▌
                </span>
              )}
            </div>

            {phase === "done" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
                <div
                  onClick={handleStartPills}
                  style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                >
                  <div style={{ width: 1, height: 13, background: "var(--r-telha)", flexShrink: 0 }} />
                  <span
                    style={{
                      fontFamily: "var(--r-font-sys)",
                      fontWeight: 300,
                      fontSize: 11,
                      color: "var(--r-text)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    começar pelas pills
                  </span>
                </div>
                <div
                  onClick={handleGoHome}
                  style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                >
                  <div style={{ width: 1, height: 13, background: "var(--r-ghost)", flexShrink: 0 }} />
                  <span
                    style={{
                      fontFamily: "var(--r-font-sys)",
                      fontWeight: 300,
                      fontSize: 11,
                      color: "var(--r-muted)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    voltar pra home
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* "decidir depois" — discreto, canto inferior direito (só em questions) */}
      {phase === "questions" && (
        <div
          onClick={handleSkip}
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 10,
            color: "var(--r-muted)",
            letterSpacing: "0.04em",
            opacity: 0.6,
            cursor: "pointer",
            userSelect: "none",
            zIndex: 10,
          }}
        >
          decidir depois
        </div>
      )}
    </div>
  );
}
