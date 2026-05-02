// src/pages/Auth.tsx
// Mode (signin/signup) detectado via URL:
//   /signin → mode signin (default)
//   /signup → mode signup
//   /auth   → alias, redireciona pra /signin (configurado em App.tsx)

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";
import { track } from "@/lib/analytics";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode: "signin" | "signup" = location.pathname === "/signup" ? "signup" : "signin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const handleGoogleSignIn = async () => {
    if (mode === "signup" && !ageConfirmed) {
      setError("confirme que você tem 16 anos ou mais.");
      return;
    }
    track(mode === "signup" ? "signup_started" : "signin_started", { method: "google" });
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (error) {
      track(mode === "signup" ? "signup_failed" : "signin_failed", { method: "google", reason: error.message });
      setError(error.message);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("digite seu email primeiro.");
      return;
    }
    track("password_reset_requested");
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setMessage("verifique seu email para redefinir a senha.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signin") {
      track("signin_started", { method: "email" });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        track("signin_failed", { method: "email", reason: error.message });
        return setError(error.message);
      }
      track("signin_completed", { method: "email" });
      navigate("/home", { replace: true });
    } else {
      // Age gate — required for signup
      if (!ageConfirmed) {
        setLoading(false);
        return setError("confirme que você tem 16 anos ou mais.");
      }
      track("signup_started", { method: "email" });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
          data: { age_confirmed: true, age_confirmed_at: new Date().toISOString() },
        },
      });
      setLoading(false);
      if (error) {
        track("signup_failed", { method: "email", reason: error.message });
        return setError(error.message);
      }
      // Se email confirmation está desligado, session vem preenchida → login direto
      if (data.session) {
        track("signup_completed", { method: "email" });
        navigate("/", { replace: true });
      } else {
        track("signup_email_verification_pending", { method: "email" });
        setMessage("verifique seu email para confirmar sua conta.");
      }
    }
  };

  return (
    <div className="r-screen">

      {/* header */}
      <div className="r-header">
        <span
          className="r-header-label"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/home")}
        >
          rdwth
        </span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* spacer */}
      <div style={{ flex: 1 }} />

      {/* conteúdo — ancorado no rodapé */}
      <div style={{ padding: "0 24px 32px", flexShrink: 0 }}>

        {/* headline */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "var(--r-font-ed)",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
              color: "var(--r-text)",
            }}
          >
            algo te trouxe<br />aqui.
          </div>
        </div>

        {/* Google OAuth */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", marginBottom: 24 }}>
          <div
            onClick={handleGoogleSignIn}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              border: "0.5px solid var(--r-ghost)",
              borderRadius: 4,
              cursor: "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 12, color: "var(--r-text)", letterSpacing: "0.04em" }}>
              continuar com google
            </span>
          </div>
        </div>

        {/* divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: "0.5px", background: "var(--r-ghost)" }} />
          <span style={{ fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-ghost)", letterSpacing: "0.08em" }}>
            ou
          </span>
          <div style={{ flex: 1, height: "0.5px", background: "var(--r-ghost)" }} />
        </div>

        {/* email/password form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="r-input-wrap">
            <input
              type="email"
              className="r-textarea"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ fontSize: 13 }}
            />
          </div>

          <div className="r-input-wrap">
            <input
              type="password"
              className="r-textarea"
              placeholder="senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              style={{ fontSize: 13 }}
            />
          </div>

          {/* age gate — signup only */}
          {mode === "signup" && (
            <div
              onClick={() => setAgeConfirmed(a => !a)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", paddingTop: 2,
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: 2, flexShrink: 0,
                border: `1px solid ${ageConfirmed ? "var(--r-accent)" : "var(--r-ghost)"}`,
                background: ageConfirmed ? "var(--r-accent)" : "transparent",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {ageConfirmed && (
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L7 12L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{
                fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10,
                color: "var(--r-sub)", letterSpacing: "0.04em",
              }}>
                confirmo que tenho 16 anos ou mais
              </span>
            </div>
          )}

          {/* esqueci a senha — só no signin */}
          {mode === "signin" && (
            <div
              onClick={() => !loading && handleForgotPassword()}
              style={{
                fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9,
                color: "var(--r-muted)", letterSpacing: "0.04em",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.5 : 1,
                textDecoration: "underline",
                alignSelf: "flex-start",
                paddingTop: 2,
              }}
            >
              esqueci a senha
            </div>
          )}

          {/* erro / mensagem */}
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

          {/* actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1 }}
              onClick={() => !loading && handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            >
              <div style={{ width: 1, height: 13, background: "var(--r-accent)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-text)", letterSpacing: "0.06em" }}>
                {loading ? "..." : mode === "signin" ? "entrar" : "criar conta"}
              </span>
            </div>

            <Link
              to={mode === "signin" ? "/signup" : "/signin"}
              onClick={() => { setError(null); setMessage(null); }}
              style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-muted)", letterSpacing: "0.04em", textDecoration: "none" }}
            >
              {mode === "signin" ? "sem conta? cadastrar" : "já tem conta? entrar"}
            </Link>
          </div>
        </form>

        {/* legal */}
        <div style={{ marginTop: 20, fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 8, color: "var(--r-ghost)", letterSpacing: "0.06em", lineHeight: 1.8 }}>
          ao continuar você concorda com nossos{" "}
          <span onClick={() => navigate("/terms-of-use")} style={{ textDecoration: "underline", cursor: "pointer" }}>termos</span>
          {" "}e{" "}
          <span onClick={() => navigate("/privacy-policy")} style={{ textDecoration: "underline", cursor: "pointer" }}>política de privacidade</span>.
        </div>

      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span onClick={() => navigate(-1 as any)} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>

    </div>
  );
}
