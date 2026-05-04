// src/pages/Warmup.tsx
// AFC ONB-6 — Mini-Eco Warm-up
// Par A do Banco v0.2 (#1 + #13). Streaming SSE pelo edge function warmup-eco.
// Estados: q1 → q2 → streaming → done. "decidir depois" no canto inferior direito.

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingStep } from "@/hooks/useOnboardingState";
import { getToday } from "@/lib/api";
import { track } from "@/lib/analytics";

// Telemetria one-time helper — evita disparo duplicado em React strict mode / re-renders.
function useOnceTrack(eventName: string, props?: Record<string, unknown>) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(eventName, props);
  }, [eventName, props]);
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// AFC ONB-6 — Par A do Banco de Perguntas Warm-up v0.2
const QUESTIONS: [string, string] = [
  "Qual decisão recente você ainda está tentando entender?",
  "O que alguém te disse recentemente que ficou voltando?",
];

const INTRO_TEXT = "para começar, responda as perguntas. quanto mais completas melhor.";

type Phase = "q1" | "q2" | "streaming" | "done";

// Typewriter inline — texto aparece L→R, char por char.
// Cursor ▌ visível enquanto digita, somem ao terminar.
function Typewriter({ text, charDelayMs = 38 }: { text: string; charDelayMs?: number }) {
  const [shown, setShown] = useState("");
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
    setShown("");
    let i = 0;
    const interval = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(interval);
    }, charDelayMs);
    return () => window.clearInterval(interval);
  }, [text, charDelayMs]);
  return (
    <>
      {shown}
      <span style={{ opacity: shown.length < text.length ? 0.5 : 0 }}>▌</span>
    </>
  );
}

export default function Warmup() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("q1");
  const [answers, setAnswers] = useState<[string, string]>(["", ""]);
  const [eco, setEco] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Telemetria — chegada na tela
  useOnceTrack("warmup_started");

  // Telemetria — eco completamente revelado (phase done)
  const revealedRef = useRef(false);
  useEffect(() => {
    if (phase === "done" && !revealedRef.current) {
      revealedRef.current = true;
      track("minieco_revealed", { eco_length: eco.length });
    }
  }, [phase, eco.length]);

  const currentIdx = phase === "q1" ? 0 : phase === "q2" ? 1 : -1;
  const currentAnswer = currentIdx >= 0 ? answers[currentIdx] : "";
  const canContinueQuestion = currentAnswer.trim().length > 0;

  function handleQuestionContinue() {
    if (!canContinueQuestion) return;
    if (phase === "q1") {
      track("warmup_q1_answered");
      setPhase("q2");
      return;
    }
    if (phase === "q2") {
      track("warmup_q2_answered");
      handleSubmit();
    }
  }

  async function handleSubmit() {
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
        setPhase("q2");
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
      setPhase("q2");
      track("warmup_failed", { reason: msg });
    }
  }

  async function handleSkip() {
    track("warmup_skipped", { phase });
    await markOnboardingStep("warmup_completed");
    navigate("/home");
  }

  function handleContinueDone() {
    track("warmup_to_home");
    track("frame_completed");
    // AFC ONB-6/7 — sinaliza pra Home disparar pulse roxo único na NavBottom
    navigate("/home", { state: { warmupJustCompleted: true } });
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
        {(phase === "q1" || phase === "q2") && (
          <>
            <div
              style={{
                fontFamily: "var(--r-font-sys)",
                fontWeight: 300,
                fontSize: 11,
                lineHeight: 1.7,
                letterSpacing: "0.04em",
                color: "var(--r-voice-sys)",
                marginBottom: 28,
                textAlign: "left",
                whiteSpace: "pre-wrap",
              }}
            >
              <span aria-hidden="true">{"> "}</span>
              <Typewriter text={INTRO_TEXT} />
            </div>

            <div style={{ marginBottom: 28 }}>
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
                {QUESTIONS[currentIdx]}
              </div>
              <textarea
                className="r-textarea"
                value={currentAnswer}
                onChange={(e) => {
                  const next: [string, string] = [...answers] as [string, string];
                  next[currentIdx] = e.target.value;
                  setAnswers(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleQuestionContinue();
                  }
                }}
                placeholder="..."
                rows={3}
                autoFocus
                style={{ width: "100%", resize: "none", fontSize: 13 }}
              />
            </div>

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
              onClick={canContinueQuestion ? handleQuestionContinue : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: canContinueQuestion ? "pointer" : "default",
                opacity: canContinueQuestion ? 1 : 0.3,
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
                  onClick={handleContinueDone}
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
                    continuar
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* "decidir depois" — discreto, canto inferior direito (só nas perguntas) */}
      {(phase === "q1" || phase === "q2") && (
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
