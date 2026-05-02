// src/pages/Onboarding.tsx
// Coleta do primeiro nome — fluxo de onboarding
// Persiste nome em localStorage + Supabase user_metadata
// continuar → /home

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

export default function Onboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const handleContinue = async () => {
    if (!name.trim()) return;
    const trimmed = name.trim();

    // Persist locally (immediate availability across the app)
    localStorage.setItem("rdwth_user_name", trimmed);

    // Persist server-side (survives device/browser changes)
    try {
      await supabase.auth.updateUser({
        data: { display_name: trimmed },
      });
    } catch {
      // Non-blocking — localStorage is primary, metadata is backup
    }

    navigate("/home");
  };

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "28px 24px",
      }}>
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16,
          lineHeight: 1.6, color: "var(--r-text)", marginBottom: 20,
        }}>
          como Reed deve chamar você?
        </div>

        <div style={{
          borderBottom: "0.5px solid var(--r-ghost)",
          paddingBottom: 8, marginBottom: 32,
        }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleContinue(); }}
            placeholder="seu nome"
            autoFocus
            style={{
              background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--r-font-ed)", fontWeight: 300, fontSize: 14,
              color: "var(--r-text)", width: "100%", padding: 0,
              letterSpacing: "0.01em",
            }}
          />
        </div>

        <div
          onClick={handleContinue}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: name.trim() ? "pointer" : "default",
            opacity: name.trim() ? 1 : 0.25, transition: "opacity 0.2s",
            pointerEvents: name.trim() ? "auto" : "none",
          }}
        >
          <div style={{ width: 1, height: 14, background: "var(--r-accent)", flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 12,
            color: "var(--r-text)", letterSpacing: "0.06em",
          }}>
            continuar
          </span>
        </div>

        {/* Decidir depois — pula coleta de nome */}
        <div
          onClick={() => {
            localStorage.setItem("rdwth_user_name_deferred", "1");
            navigate("/home");
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer", marginTop: 24,
          }}
        >
          <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
          <span style={{
            fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11,
            color: "var(--r-muted)", letterSpacing: "0.06em",
          }}>
            decidir depois →
          </span>
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 56, flexShrink: 0 }} />
    </div>
  );
}
