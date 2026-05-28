// src/components/FeedbackModal.tsx
// Modal de feedback in-app — textarea + insert direto em feedback_mvp.
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  if (!open) return null;

  async function handleSubmit() {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      toast({ title: "feedback muito curto", description: "escreve um pouco mais." });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "sessão expirou", description: "tenta de novo após login." });
        setSubmitting(false);
        return;
      }
      const { error } = await (supabase.from("feedback_mvp") as any).insert({
        user_id: user.id,
        user_email: user.email ?? null,
        feedback_text: trimmed,
        context_url: location.pathname,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });
      if (error) throw error;

      track("feedback_submitted", { text_length: trimmed.length, context: location.pathname });

      toast({ title: "obrigado.", description: "recebido. seguimos atentos." });
      setText("");
      onClose();
    } catch (err) {
      console.error("[FeedbackModal] submit error:", err);
      toast({ title: "algo travou", description: "tenta de novo em alguns segundos." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--r-bg)",
          border: "1px solid var(--r-ghost)",
          padding: 24,
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--r-font-sys)",
            fontWeight: 300,
            fontSize: 11,
            color: "var(--r-voice-sys)",
            letterSpacing: "0.04em",
          }}
        >
          <span aria-hidden="true">{"> "}</span>feedback rdwth — fase mvp
        </div>

        <div
          style={{
            fontFamily: "var(--r-font-ed)",
            fontWeight: 800,
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--r-text)",
          }}
        >
          o que você quer me dizer?
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="bug, dúvida, atrito, qualquer coisa — escreve aqui"
          rows={5}
          autoFocus
          disabled={submitting}
          style={{
            background: "transparent",
            border: "1px solid var(--r-ghost)",
            padding: 12,
            fontFamily: "var(--r-font-ed)",
            fontWeight: 300,
            fontSize: 14,
            color: "var(--r-text)",
            resize: "vertical",
            minHeight: 100,
            outline: "none",
            letterSpacing: "0.01em",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "transparent",
              border: "none",
              cursor: submitting ? "default" : "pointer",
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 11,
              color: "var(--r-muted)",
              letterSpacing: "0.06em",
              padding: "8px 4px",
            }}
          >
            cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || text.trim().length < 3}
            style={{
              background: text.trim().length >= 3 && !submitting ? "var(--r-telha)" : "var(--r-ghost)",
              border: "none",
              cursor: text.trim().length >= 3 && !submitting ? "pointer" : "default",
              fontFamily: "var(--r-font-sys)",
              fontWeight: 600,
              fontSize: 11,
              color: "var(--r-bg)",
              letterSpacing: "0.06em",
              padding: "10px 16px",
            }}
          >
            {submitting ? "enviando…" : "enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
