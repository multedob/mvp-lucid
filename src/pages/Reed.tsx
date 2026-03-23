// src/pages/Reed.tsx
import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function Reed() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth · reed</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div style={{ flex: 1 }} />

      <div className="r-line" />
      <div className="r-nav">
        {(["pills", "context", "reed"] as const).map((tab) => (
          <span
            key={tab}
            className={`r-nav-item${tab === "reed" ? " active" : ""}`}
            onClick={() => {
              if (tab === "pills") navigate("/home");
              if (tab === "context") navigate("/context");
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
