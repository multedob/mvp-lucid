// ============================================================
// AudioRecorder
// Coexists with a textarea: user can type OR press the mic.
// While recording, Web Speech API feeds live transcript into the
// same textarea via onLiveTranscript. On stop, we upload the audio
// blob to Supabase Storage and call `transcribe-audio` (Groq Whisper
// primary, OpenAI fallback) for a polished final transcript which
// replaces the live text.
//
// Cost protection:
//   - Hard cap at MAX_DURATION_MS (5 min). Auto-stops at the limit.
//   - Visual warning in the last 30 seconds.
//
// Props:
//   userId    — used to build the storage path ({userId}/{cycleId}/...)
//   cycleId   — IPE cycle id
//   pillId    — 'PI' | 'PII' | …
//   moment    — 'm2' | 'm4' (which field this recording belongs to)
//   language  — 'pt-BR' | 'en-US' | … (Web Speech hint + Whisper hint)
//   onLiveTranscript(text)  — called as the user speaks (append/replace)
//   onFinalTranscript(text) — called once Whisper returns
//   onAudioStored({ path, durationMs }) — called after upload
//   disabled  — block mic (e.g. while submitting)
//
// Browser support:
//   - MediaRecorder: all modern browsers incl. iOS Safari 14.5+
//   - SpeechRecognition: Chrome/Edge/Safari. Firefox → no live preview,
//     but recording + Whisper still work.
// ============================================================

import { forwardRef, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/lib/api";

type Moment = "m2" | "m4" | "reed" | "questionnaire" | "third-party" | "warmup";

// ─── Cost-protection caps ───────────────────────────────────
const MAX_DURATION_MS = 5 * 60 * 1000;   // 5 minutes hard stop
const WARN_THRESHOLD_MS = 4 * 60 * 1000 + 30 * 1000;  // warn at 4:30

interface AudioRecorderProps {
  userId: string;
  cycleId: string;
  pillId: string;
  moment: Moment;
  /** BCP-47 locale. Default 'en-US'. Pass 'pt-BR' when user is in PT. */
  language?: string;
  /** Quando true, anima 2 ciclos breathing fade in/out na cor original — onboarding visual da feature. */
  breathingPulseOnce?: boolean;
  /**
   * Token de invite do terceiro (quando moment === "third-party").
   * Quando presente, usa edge function third-party-upload-audio-url pra obter
   * signed URL (bypassa RLS do storage, que não funciona sem auth).
   */
  thirdPartyToken?: string;
  onLiveTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onAudioStored?: (info: { path: string; durationMs: number }) => void;
  disabled?: boolean;
}

// Minimal typings for the Web Speech API (not in lib.dom by default).
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Convert 'pt-BR' → 'pt' (ISO-639-1) for Whisper. */
function localeToIso639(locale: string): string {
  return locale.split("-")[0]?.toLowerCase() ?? "en";
}

export const AudioRecorder = forwardRef<HTMLDivElement, AudioRecorderProps>(({
  userId,
  cycleId,
  pillId,
  moment,
  language = "en-US",
  breathingPulseOnce = false,
  thirdPartyToken,
  onLiveTranscript,
  onFinalTranscript,
  onAudioStored,
  disabled,
}, fwdRef) => {
  const [state, setState] = useState<"idle" | "recording" | "processing" | "error">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startMsRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const finalLiveTextRef = useRef("");  // accumulated final-result pieces

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function stopTracks() {
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
  }

  async function startRecording() {
    if (disabled || state !== "idle") return;
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      finalLiveTextRef.current = "";

      // MediaRecorder — prefer WebM/Opus, fall back to default.
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => { void handleStop(); };
      recorder.start(250);  // flush chunks every 250 ms

      // Web Speech API — live transcript (best-effort)
      const SRCtor = getSpeechRecognitionCtor();
      if (SRCtor) {
        const rec = new SRCtor();
        rec.lang = language;
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            const transcript = r[0].transcript;
            if (r.isFinal) {
              finalLiveTextRef.current += transcript;
            } else {
              interim += transcript;
            }
          }
          const combined = (finalLiveTextRef.current + interim).trim();
          if (combined) onLiveTranscript?.(combined);
        };
        rec.onerror = () => { /* silent — Whisper will handle */ };
        rec.onend = () => { /* Some browsers end mid-recording; ignore. */ };
        recognitionRef.current = rec;
        try { rec.start(); } catch { /* already started */ }
      }

      startMsRef.current = performance.now();
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startMsRef.current;
        setElapsedMs(elapsed);
        // Hard cap: auto-stop at MAX_DURATION_MS to protect cost.
        if (elapsed >= MAX_DURATION_MS) {
          void stopRecording();
        }
      }, 100);
      setState("recording");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "mic_unavailable");
      setState("error");
      stopTracks();
    }
  }

  async function stopRecording() {
    if (state !== "recording") return;
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    rec.stop();  // triggers onstop → handleStop
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState("processing");
  }

  async function handleStop() {
    try {
      const durationMs = Math.round(performance.now() - startMsRef.current);
      const rawMime = chunksRef.current[0]?.type || "audio/webm";
      // Storage rejeita mime com codecs (ex: "audio/webm; codecs=opus") → 415.
      // Normaliza pro mime base aceito pelo bucket (allowed_mime_types).
      const normalizedMime = (() => {
        const lower = rawMime.toLowerCase();
        if (lower.includes("webm")) return "audio/webm";
        if (lower.includes("ogg")) return "audio/ogg";
        if (lower.includes("mp4")) return "audio/mp4";
        if (lower.includes("mpeg") || lower.includes("mp3")) return "audio/mpeg";
        if (lower.includes("wav")) return "audio/wav";
        return "audio/webm";
      })();
      const ext = normalizedMime === "audio/ogg" ? "ogg"
                : normalizedMime === "audio/mp4" ? "m4a"
                : normalizedMime === "audio/mpeg" ? "mp3"
                : normalizedMime === "audio/wav" ? "wav"
                : "webm";
      const blob = new Blob(chunksRef.current, { type: normalizedMime });
      stopTracks();

      let path: string;

      if (moment === "third-party" && thirdPartyToken) {
        // Caminho terceiro: pega signed URL via edge function (bypassa RLS).
        const signed = await callEdgeFunction<{ signed_url: string; path: string; token: string }>(
          "third-party-upload-audio-url",
          { token: thirdPartyToken, question_id: pillId, ext },
        );
        const putRes = await fetch(signed.signed_url, {
          method: "PUT",
          headers: { "Content-Type": normalizedMime, "x-upsert": "true" },
          body: blob,
        });
        if (!putRes.ok) {
          const txt = await putRes.text().catch(() => "");
          throw new Error(`upload_failed: ${putRes.status} ${txt}`);
        }
        path = signed.path;
      } else {
        // Caminho autenticado tradicional.
        path = `${userId}/${cycleId}/${pillId}_${moment}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pill-audio")
          .upload(path, blob, { contentType: normalizedMime, upsert: true });
        if (upErr) throw new Error(`upload_failed: ${upErr.message}`);
      }

      onAudioStored?.({ path, durationMs });

      // Whisper transcription via edge function (Groq primary, OpenAI fallback).
      const iso = localeToIso639(language);
      const data = await callEdgeFunction<{ text?: string }>("transcribe-audio", {
        audio_path: path,
        language: iso,
        // Quando third-party: passa token pra edge function bypassar auth de user.
        ...(moment === "third-party" && thirdPartyToken ? { third_party_token: thirdPartyToken } : {}),
      });
      const finalText = (data.text ?? "").trim();
      if (finalText) onFinalTranscript?.(finalText);
      setState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  // ─── Rendering ───
  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  // Last-30s warning: switch label to countdown to the cap.
  const isNearLimit = isRecording && elapsedMs >= WARN_THRESHOLD_MS;

  // Color shifts to a warning hue near the limit.
  const accentColor = isNearLimit
    ? "var(--r-warn, #d49a3a)"
    : "var(--r-telha, #c8553d)";

  // breathingPulseOnce: 2 pulsos visíveis (background telha + scale + glow) pra
  // chamar atenção na 1ª entrada. Não roda se está gravando/processando.
  const useBreathing = breathingPulseOnce && state === "idle";
  const animationProp = isRecording
    ? `audio-pulse ${isNearLimit ? "0.5s" : "1s"} ease-in-out infinite`
    : "none";

  return (
    <div ref={fwdRef} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing || state === "error"}
        aria-label={isRecording ? "parar gravação" : "começar gravação"}
        title={isRecording ? "parar gravação" : "falar resposta"}
        className={useBreathing ? "audio-breathing-once" : ""}
        style={{
          width: 6,
          height: 6,
          padding: 0,
          borderRadius: "50%",
          border: isRecording ? "none" : "1px solid var(--r-ghost)",
          background: isRecording ? accentColor : "transparent",
          cursor: disabled || isProcessing ? "default" : "pointer",
          opacity: isProcessing ? 0.6 : 1,
          flexShrink: 0,
          transition: "all 0.2s",
          outline: isRecording ? `2px solid ${accentColor}` : "none",
          outlineOffset: "3px",
          animation: animationProp,
        }}
      />
      {errorMsg && state === "error" && (
        <span style={{ fontSize: 10, color: "var(--r-telha, #c8553d)", opacity: 0.8 }}>
          {errorMsg.length > 40 ? errorMsg.slice(0, 40) + "…" : errorMsg}
        </span>
      )}
      <style>{`
        @keyframes audio-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        /* Breathing once — preenchimento sólido pulsando, mesma cor de quando recording.
           Sem outline externo, sem scale. Apenas background trocando entre transparent e telha. */
        @keyframes audio-breathing-once-kf {
          0%, 50%, 100% {
            background-color: transparent !important;
            border-color: var(--r-ghost) !important;
          }
          25%, 75% {
            background-color: var(--r-telha) !important;
            border-color: var(--r-telha) !important;
          }
        }
        .audio-breathing-once {
          animation: audio-breathing-once-kf 4.8s cubic-bezier(0.4, 0, 0.6, 1) 1 forwards !important;
        }
      `}</style>
    </div>
  );
});
AudioRecorder.displayName = "AudioRecorder";
