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

type Moment = "m2" | "m4";

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
      const mime = chunksRef.current[0]?.type || "audio/webm";
      const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "m4a" : "webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      stopTracks();

      const path = `${userId}/${cycleId}/${pillId}_${moment}.${ext}`;

      // Upload (upsert so a re-take overwrites the previous take).
      const { error: upErr } = await supabase.storage
        .from("pill-audio")
        .upload(path, blob, { contentType: mime, upsert: true });
      if (upErr) throw new Error(`upload_failed: ${upErr.message}`);

      onAudioStored?.({ path, durationMs });

      // Whisper transcription via edge function (Groq primary, OpenAI fallback).
      const iso = localeToIso639(language);
      const data = await callEdgeFunction<{ text?: string }>("transcribe-audio", {
        audio_path: path,
        language: iso,
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
  const seconds = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  // Last-30s warning: switch label to countdown to the cap.
  const isNearLimit = isRecording && elapsedMs >= WARN_THRESHOLD_MS;
  const remainingSec = Math.max(0, Math.ceil((MAX_DURATION_MS - elapsedMs) / 1000));

  const buttonLabel = isRecording
    ? isNearLimit
      ? `para em ${remainingSec}s`
      : `recording ${mm}:${ss}`
    : isProcessing
      ? "ajustando…"
      : "gravar";

  // Color shifts to a warning hue near the limit.
  const accentColor = isNearLimit
    ? "var(--r-warn, #d49a3a)"
    : "var(--r-accent, #c8553d)";

  return (
    <div ref={fwdRef} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing || state === "error"}
        aria-label={isRecording ? "parar gravação" : "começar gravação"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          border: `1px solid ${isRecording ? accentColor : "var(--r-ghost, #ccc)"}`,
          background: isRecording ? accentColor : "transparent",
          color: isRecording ? "white" : "var(--r-muted, #666)",
          fontFamily: "var(--r-font-sys, system-ui)",
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: "0.04em",
          cursor: disabled || isProcessing ? "not-allowed" : "pointer",
          opacity: isProcessing ? 0.6 : 1,
          transition: "all 0.15s ease",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isRecording ? "white" : "var(--r-muted, #666)",
            animation: isRecording
              ? `audio-pulse ${isNearLimit ? "0.5s" : "1s"} ease-in-out infinite`
              : "none",
          }}
        />
        {buttonLabel}
      </button>
      {errorMsg && state === "error" && (
        <span style={{ fontSize: 10, color: "var(--r-accent, #c8553d)", opacity: 0.8 }}>
          {errorMsg.length > 40 ? errorMsg.slice(0, 40) + "…" : errorMsg}
        </span>
      )}
      <style>{`
        @keyframes audio-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
});
AudioRecorder.displayName = "AudioRecorder";
