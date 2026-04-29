import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const hasRecoveryToken = useMemo(() => {
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    return params.get("type") === "recovery" || Boolean(params.get("access_token"));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(Boolean(session) || hasRecoveryToken);
    });

    return () => subscription.unsubscribe();
  }, [hasRecoveryToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("use pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("as senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("senha atualizada. você já pode entrar.");
    window.setTimeout(() => navigate("/auth", { replace: true }), 1200);
  };

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div style={{ flex: 1 }} />

      <div style={{ padding: "0 24px 32px", flexShrink: 0 }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 22, lineHeight: 1.3, color: "var(--r-text)" }}>
            escolha uma nova<br />senha.
          </div>
        </div>

        {!ready ? (
          <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.7 }}>
            abra novamente o link de redefinição no seu email.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="r-input-wrap">
              <input
                type="password"
                className="r-textarea"
                placeholder="nova senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ fontSize: 13 }}
              />
            </div>

            <div className="r-input-wrap">
              <input
                type="password"
                className="r-textarea"
                placeholder="confirmar senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ fontSize: 13 }}
              />
            </div>

            {error && (
              <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.04em" }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-muted)", letterSpacing: "0.04em" }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: 0,
                border: 0,
                background: "transparent",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <span style={{ width: 1, height: 13, background: "var(--r-accent)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-text)", letterSpacing: "0.06em" }}>
                {loading ? "..." : "atualizar senha"}
              </span>
            </button>
          </form>
        )}
      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
