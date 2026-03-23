// src/pages/pill/PillFlow.tsx
import { useNavigate, useParams } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function PillFlow() {
  const navigate = useNavigate();
  const { pillId } = useParams<{ pillId: string }>();

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">_rdwth · pills · {pillId?.toLowerCase()}</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div style={{ flex: 1 }} />

      <div className="r-line" />
      <div className="r-footer">
        <span
          className="r-footer-back"
          onClick={() => navigate("/home")}
        >
          ‹
        </span>
        <span className="r-footer-sep">|</span>
        <span className="r-footer-action">coming soon</span>
      </div>
    </div>
  );
}
