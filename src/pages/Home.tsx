// src/pages/Home.tsx
// CTA adaptado ao estado do ciclo IPE ativo:
//   sem ciclo           → "begin pills"       → /pills
//   status=pills        → "continue pills"    → /pills
//   status=questionnaire → "begin questionnaire" → /questionnaire
//   status=complete     → "read"              → /reed

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";

type CycleStatus = "pills" | "questionnaire" | "complete" | "abandoned" | null;

interface CTA {
  label: string;
  path: string;
}

function resolveCTA(status: CycleStatus): CTA {
  switch (status) {
    case "pills":          return { label: "continue pills",      path: "/pills" };
    case "questionnaire":  return { label: "begin questionnaire", path: "/questionnaire" };
    case "complete":       return { label: "read",                path: "/reed" };
    default:               return { label: "begin pills",         path: "/pills" };
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setReady(true); return; }

        const { data: cycle } = await supabase
          .from("ipe_cycles")
          .select("status")
          .eq("user_id", session.user.id)
          .in("status", ["pills", "questionnaire", "complete"])
          .order("cycle_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        setCycleStatus((cycle?.status as CycleStatus) ?? null);
      } catch (err) {
        console.error("[Home] load error:", err);
      } finally {
        setReady(true);
      }
    }
    load();
  }, []);

  const cta = resolveCTA(cycleStatus);

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label">_rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      {/* CTA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
        <div
          style={{
            fontFamily: "var(--r-font-ed)",
            fontWeight: 800,
            fontSize: 16,
            color: "var(--r-dim)",
            letterSpacing: "-0.01em",
            marginBottom: 20,
          }}
        >
          ready when you are.
        </div>
        {ready && (
          <div
            onClick={() => navigate(cta.path)}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          >
            <div style={{ width: 1, height: 14, background: "var(--r-accent)", flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "var(--r-font-sys)",
                fontWeight: 300,
                fontSize: 11,
                color: "var(--r-text)",
                letterSpacing: "0.08em",
              }}
            >
              {cta.label}
            </span>
          </div>
        )}
      </div>

      {/* Nav bottom */}
      <div className="r-line" />
      <div style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 28,
        flexShrink: 0,
      }}>
        {[
          { label: "pills",   path: "/pills" },
          { label: "context", path: "/context" },
          { label: "reed",    path: "/reed" },
        ].map(({ label, path }) => (
          <span
            key={label}
            onClick={() => navigate(path)}
            style={{
              fontFamily: "var(--r-font-sys)",
              fontWeight: 300,
              fontSize: 11,
              color: "var(--r-muted)",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            {label}
          </span>
        ))}
        <div
          onClick={() => navigate("/settings")}
          style={{
            marginLeft: "auto",
            width: 6,
            height: 6,
            borderRadius: "50%",
            border: "1px solid var(--r-ghost)",
            background: "transparent",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
      </div>

    </div>
  );
}
