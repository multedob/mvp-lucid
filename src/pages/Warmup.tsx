// src/pages/Warmup.tsx
// AFC ONB-6 — Mini-Eco Warm-up
// Par A do Banco v0.2 (#1 + #13). Streaming SSE pelo edge function warmup-eco.
// Estados: q1 → q2 → streaming → done. "decidir depois" no canto inferior direito.
//
// Ajuste 2026-05-04 (B-S5.G): cascata sequencial dos elementos em cada fase
// (sistema → pergunta → textarea → botão), entrando de cima pra baixo um após o outro.
// Resolve confusão visual da versão anterior onde tudo aparecia simultâneo.

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingStep } from "@/hooks/useOnboardingState";
import AppHeader from "@/components/AppHeader";
import { AudioRecorder } from "@/components/AudioRecorder";
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
  "Qual é o último 'sim' que você deu e está em dúvida agora?",
  "Qual cena da sua vida você não tira da cabeça?",
];

const INTRO_TEXT = "para começar, responda as perguntas. quanto mais completas melhor.";

type Phase = "q1" | "q2" | "streaming" | "done" | "skipped";

// Cascata — timing de cada elemento em q1/q2 (after intro typewriter terminar)
// INTRO_TEXT tem ~70 chars × 38ms = ~2660ms. Pergunta entra após.
const CASCADE_QUESTION_MS = 2700;
const CASCADE_INPUT_MS = 3300;
const CASCADE_BUTTON_MS = 3700;
// Cascata done — botão continuar após eco terminar
const CASCADE_DONE_BUTTON_MS = 600;

// Typewriter inline — texto aparece L→R, char por char.
// Idempotente: se já animou esse mesmo texto, não re-anima
// (evita fade-aparece-fade-aparece em strict mode / re-renders).
// Cursor ▌ visível enquanto digita, some ao terminar.
function Typewriter({ text, charDelayMs = 38 }: { text: string; charDelayMs?: number }) {
  const [shown, setShown] = useState("");
  const animatedTextRef = useRef<string | null>(null);

  useEffect(() => {
    // Idempotência: se já animamos esse text, não reanima.
    if (animatedTextRef.current === text) return;
    animatedTextRef.current = text;

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

const AUDIO_PULSE_KEY = "rdwth_audio_pulse_seen_warmup";

export default function Warmup() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("q1");
  const [answers, setAnswers] = useState<[string, string]>(["", ""]);
  const [eco, setEco] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Cascata sequencial — controla entrada dos elementos de cima pra baixo
  const [showQuestion, setShowQuestion] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [showDoneButton, setShowDoneButton] = useState(false);
  const [audioPulseFirst, setAudioPulseFirst] = useState(false);

  // Pega userId — necessário pro AudioRecorder (storage path)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setUserId(session.user.id);
    });
  }, []);

  // Telemetria — chegada na tela
  useOnceTrack("warmup_started");

  // Telemetria — eco completamente revelado (phase done)
  const revealedRef = useRef(false);
  useEffect(() => {
    if ((phase === "done" || phase === "skipped") && !revealedRef.current) {
      revealedRef.current = true;
      track("minieco_revealed", { eco_length: eco.length, skipped: phase === "skipped" });
    }
  }, [phase, eco.length]);

  // Cascata — dispara UMA VEZ por categoria (questions / done).
  // Evita fade-some-fade-aparece quando phase muda q1→q2 (mesma "categoria").
  const cascadeArmedQuestionsRef = useRef(false);
  const cascadeArmedDoneRef = useRef(false);
  useEffect(() => {
    if (phase === "q1" || phase === "q2") {
      if (cascadeArmedQuestionsRef.current) return; // já armado, não re-roda
      cascadeArmedQuestionsRef.current = true;
      const t1 = window.setTimeout(() => setShowQuestion(true), CASCADE_QUESTION_MS);
      const t2 = window.setTimeout(() => setShowInput(true), CASCADE_INPUT_MS);
      const t3 = window.setTimeout(() => setShowButton(true), CASCADE_BUTTON_MS);
      // Pulse áudio 1ª vez — depois do input, dá tempo de ler.
      const alreadySeen = typeof window !== "undefined" && localStorage.getItem(AUDIO_PULSE_KEY) === "1";
      let t4: number | null = null;
      if (!alreadySeen) {
        t4 = window.setTimeout(() => {
          setAudioPulseFirst(true);
          try { localStorage.setItem(AUDIO_PULSE_KEY, "1"); } catch {}
        }, CASCADE_BUTTON_MS + 400);
      }
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
        if (t4 !== null) window.clearTimeout(t4);
      };
    }

    if (phase === "done" || phase === "skipped") {
      if (cascadeArmedDoneRef.current) return;
      cascadeArmedDoneRef.current = true;
      const t = window.setTimeout(() => setShowDoneButton(true), CASCADE_DONE_BUTTON_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  const currentIdx: number = phase === "q1" ? 0 : phase === "q2" ? 1 : -1;
  const currentAnswer = currentIdx >= 0 ? answers[currentIdx as 0 | 1] : "";
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

    // Eco curto pré-baked se combined < 10 chars — evita chamada Anthropic com material insuficiente.
    const combined = (answers[0].trim() + answers[1].trim()).length;
    if (combined < 10) {
      const shortEco = "recebi. é pouco pra eu te devolver algo justo agora. quando vier mais, escreve.";
      setEco(shortEco);
      setPhase("done");
      track("warmup_eco_skipped_short", { combined_chars: combined });
      return;
    }

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
    // Eco curto antes de ir embora — acolhe sem pressão.
    setEco("tudo bem. a pergunta espera. quando vier algo, ela ainda está aqui.");
    setPhase("skipped");
  }

  async function handleSkippedContinue() {
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
      {/* Header — durante o warmup, label não navega (foco no fluxo) */}
      <AppHeader onLabelClick={() => { /* no-op: warmup bloqueia navegação */ }} />

      {/* Conteúdo */}
      <div className="r-scroll" style={{ flex: 1, padding: "24px 24px 64px" }}>
        {(phase === "q1" || phase === "q2") && (
          <>
            {/* 1. Sistema (topo) — typewriter, sempre visível desde o mount */}
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

            {/* 2. Pergunta Reed — fade-in após sistema terminar */}
            <div
              style={{
                marginBottom: 28,
                opacity: showQuestion ? 1 : 0,
                transition: "opacity 600ms ease-in",
              }}
            >
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

              {/* 3. Input — fade-in após pergunta.
                  Padrão r-input-wrap (linha base + textarea + áudio pulsando + send dot). */}
              <div
                style={{
                  opacity: showInput ? 1 : 0,
                  transition: "opacity 600ms ease-in",
                }}
              >
                <div className="r-input-wrap">
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
                    placeholder="se preferir, pressione e grave um áudio"
                    rows={1}
                    autoFocus={showInput}
                    disabled={!showInput}
                  />
                  {userId && (
                    <AudioRecorder
                      userId={userId}
                      cycleId="warmup"
                      pillId="warmup"
                      moment="warmup"
                      language="pt-BR"
                      breathingPulseOnce={audioPulseFirst}
                      onLiveTranscript={(text) => {
                        const next: [string, string] = [...answers] as [string, string];
                        next[currentIdx] = text;
                        setAnswers(next);
                      }}
                      onFinalTranscript={(text) => {
                        const next: [string, string] = [...answers] as [string, string];
                        next[currentIdx] = text;
                        setAnswers(next);
                      }}
                      disabled={!showInput}
                    />
                  )}
                  <button
                    type="button"
                    className={`r-send-dot${canContinueQuestion ? " active" : ""}`}
                    onClick={canContinueQuestion ? handleQuestionContinue : undefined}
                    disabled={!canContinueQuestion}
                    aria-label="enviar"
                    style={{ cursor: canContinueQuestion ? "pointer" : "default" }}
                  />
                </div>
              </div>
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

            {/* 4. Botão continuar — fade-in após textarea */}
            <div
              onClick={showButton && canContinueQuestion ? handleQuestionContinue : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: showButton && canContinueQuestion ? "pointer" : "default",
                opacity: showButton ? (canContinueQuestion ? 1 : 0.3) : 0,
                transition: "opacity 600ms ease-in",
                pointerEvents: showButton && canContinueQuestion ? "auto" : "none",
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

        {(phase === "streaming" || phase === "done" || phase === "skipped") && (
          <>
            {/* Placeholder voz sistema enquanto eco ainda não chegou — reduz percepção de espera */}
            {phase === "streaming" && eco === "" && (
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
                <Typewriter text="reed lê suas respostas." charDelayMs={45} />
              </div>
            )}

            {(eco !== "" || phase === "done") && (
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
            )}

            {/* Botão continuar (done) — fade-in após eco terminar */}
            {(phase === "done" || phase === "skipped") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
                <div
                  onClick={showDoneButton ? (phase === "done" ? handleContinueDone : handleSkippedContinue) : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: showDoneButton ? "pointer" : "default",
                    opacity: showDoneButton ? 1 : 0,
                    transition: "opacity 600ms ease-in",
                    pointerEvents: showDoneButton ? "auto" : "none",
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
