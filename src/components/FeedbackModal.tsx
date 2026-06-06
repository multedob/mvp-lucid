// src/components/FeedbackModal.tsx
// Modal de feedback in-app — textarea + upload opcional de screenshot.
// Fix 4 (carta #6b): suporta imagem (PNG/JPG/JPEG/WEBP, ≤5MB) via bucket
// privado feedback-images. URL salva em feedback_mvp.screenshot_url.

import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ACCEPT_ATTR = ".png,.jpg,.jpeg,.webp";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const { toast } = useToast();

  if (!open) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: "formato não suportado", description: "use png, jpg ou webp." });
      e.target.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      toast({ title: "imagem muito grande", description: "máximo 5mb." });
      e.target.value = "";
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function removeFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetAndClose() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setText("");
    onClose();
  }

  async function uploadScreenshot(userId: string, f: File): Promise<string | null> {
    const ext = f.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/${crypto.randomUUID()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("feedback-images")
      .upload(path, f, { contentType: f.type, upsert: false });
    if (error) throw error;
    return path;
  }

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

      let screenshotUrl: string | null = null;
      if (file) {
        try {
          screenshotUrl = await uploadScreenshot(user.id, file);
        } catch (upErr) {
          console.error("[FeedbackModal] upload error:", upErr);
          toast({ title: "imagem não subiu", description: "envia o texto sem ela ou tenta de novo." });
          setSubmitting(false);
          return;
        }
      }

      const { error } = await (supabase.from("feedback_mvp") as any).insert({
        user_id: user.id,
        user_email: user.email ?? null,
        feedback_text: trimmed,
        context_url: location.pathname,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        screenshot_url: screenshotUrl,
      });
      if (error) throw error;

      track("feedback_submitted", {
        text_length: trimmed.length,
        context: location.pathname,
        has_screenshot: !!screenshotUrl,
      });

      toast({ title: "obrigado.", description: "recebido. seguimos atentos." });
      resetAndClose();
    } catch (err) {
      console.error("[FeedbackModal] submit error:", err);
      toast({ title: "algo travou", description: "tenta de novo em alguns segundos." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={resetAndClose}
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
            lineHeight: 1.7,
            color: "var(--r-voice-founders)",
            letterSpacing: "0.04em",
            whiteSpace: "pre-wrap",
          }}
        >
{`oi,

tá funcionando?

diz o que fez sentido, o que travou,
o que abriu uma pergunta. lemos tudo.

— bruno & olivia`}
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

        {/* Anexar imagem */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleFileChange}
            disabled={submitting}
            style={{ display: "none" }}
          />
          {!file && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                border: "1px dashed var(--r-ghost)",
                padding: "8px 12px",
                cursor: submitting ? "default" : "pointer",
                fontFamily: "var(--r-font-sys)",
                fontWeight: 300,
                fontSize: 11,
                color: "var(--r-muted)",
                letterSpacing: "0.04em",
              }}
            >
              + anexar imagem (png, jpg, webp · até 5mb)
            </button>
          )}
          {file && preview && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "1px solid var(--r-ghost)",
                padding: 8,
              }}
            >
              <img
                src={preview}
                alt="preview"
                style={{
                  width: 56,
                  height: 56,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--r-font-sys)",
                    fontWeight: 300,
                    fontSize: 11,
                    color: "var(--r-text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {file.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--r-font-sys)",
                    fontWeight: 300,
                    fontSize: 10,
                    color: "var(--r-muted)",
                  }}
                >
                  {(file.size / 1024).toFixed(0)} kb
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                disabled={submitting}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: submitting ? "default" : "pointer",
                  fontFamily: "var(--r-font-sys)",
                  fontWeight: 300,
                  fontSize: 11,
                  color: "var(--r-muted)",
                  letterSpacing: "0.04em",
                  padding: "4px 8px",
                }}
              >
                remover
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={resetAndClose}
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
