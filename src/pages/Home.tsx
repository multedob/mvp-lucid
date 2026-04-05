// src/pages/Home.tsx
// Blank page — header + nav bottom apenas
// A lista de pills com estado de ciclo fica em /pills

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function Home() {
  const navigate = useNavigate();

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
        <div
          onClick={() => navigate("/pills")}
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
            begin pills
          </span>
        </div>
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
