// src/pages/Home.tsx
import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

const PILLS_DATA = [
  { id: "PI",   tensao: "I ↔ Belonging" },
  { id: "PII",  tensao: "I ↔ Role" },
  { id: "PIII", tensao: "Presence ↔ Distance" },
  { id: "PIV",  tensao: "Clarity ↔ Action" },
  { id: "PV",   tensao: "Inside ↔ Outside" },
  { id: "PVI",  tensao: "Movement ↔ Pause" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
        {PILLS_DATA.map((p) => (
          <div key={p.id} className="r-list-item" onClick={() => navigate(`/pill/${p.id}`)} style={{ marginBottom: 12 }}>
            <div className="r-list-bar" />
            <span className="r-list-label">{p.tensao}</span>
          </div>
        ))}
      </div>
      <div className="r-line" />
      <div className="r-nav">
        {(["pills", "context", "reed"] as const).map((tab) => (
          <span key={tab} className={`r-nav-item${tab === "pills" ? " active" : ""}`}
            onClick={() => { if (tab === "context") navigate("/context"); if (tab === "reed") navigate("/reed"); }}>
            {tab}
          </span>
        ))}
        <div className="r-nav-dot" onClick={() => navigate("/settings")} />
      </div>
    </div>
  );
}
