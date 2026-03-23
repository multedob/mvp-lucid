// src/pages/Context.tsx
import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function Context() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth · context</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div style={{ flex: 1 }} />

      <div className="r-line" />
      <div className="r-nav">
        {(["pills", "context", "reed"] as const).map((tab) => (
          <span
            key={tab}
            className={`r-nav-item${tab === "context" ? " active" : ""}`}
            onClick={() => {
              if (tab === "pills") navigate("/home");
              if (tab === "reed") navigate("/reed");
            }}
          >
            {tab}
          </span>
        ))}
        <div className="r-nav-dot" />
      </div>
    </div>
  );
}
