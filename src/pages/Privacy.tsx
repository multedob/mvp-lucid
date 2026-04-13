// src/pages/Privacy.tsx
// Privacy Policy — required for Apple App Store + LGPD/GDPR

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">
          <span onClick={() => navigate(-1 as any)} style={{ cursor: "pointer" }}>← back</span>
        </span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ flex: 1, padding: "28px 24px" }}>
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16,
          lineHeight: 1.7, color: "var(--r-text)", marginBottom: 24,
        }}>
          Privacy Policy
        </div>

        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 300, fontSize: 13,
          lineHeight: 1.8, color: "var(--r-sub)", letterSpacing: "0.01em",
        }}>
          <p style={{ marginBottom: 16 }}>
            <strong>Last updated:</strong> April 2026
          </p>

          <p style={{ marginBottom: 16 }}>
            rdwth ("we", "us") is a structural self-knowledge application. We take your privacy seriously. This policy explains what data we collect, how we use it, and your rights.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Data we collect:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Email address and authentication credentials; your first name (provided during onboarding); your responses to pills (narrative readings); your answers to the questionnaire; your conversations with Reed (our AI companion); structural analysis data derived from your responses; device and usage metadata.
          </p>

          <p style={{ marginBottom: 8 }}><strong>How we use your data:</strong></p>
          <p style={{ marginBottom: 16 }}>
            To generate your structural readings and self-knowledge profile; to enable Reed to provide personalized responses; to improve the accuracy of the structural instrument over time. We do not sell your data. We do not use your data for advertising.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Third-party services:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Supabase (database and authentication, hosted in AWS); Anthropic (AI language model for Reed conversations — your conversation text is sent to Anthropic's API for processing; Anthropic does not use API data for training). We do not share your data with any other third parties.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Data retention:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Your data is retained for as long as your account is active. You can export all your data at any time via Settings → Download my data. You can permanently delete all your data via Settings → Delete account.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Your rights (LGPD / GDPR):</strong></p>
          <p style={{ marginBottom: 16 }}>
            You have the right to access, export, correct, and delete your personal data. To exercise these rights, use the in-app tools in Settings or contact us at multedob@gmail.com.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Age restriction:</strong></p>
          <p style={{ marginBottom: 16 }}>
            rdwth is intended for users aged 16 and older. By creating an account, you confirm that you are at least 16 years old.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Contact:</strong></p>
          <p style={{ marginBottom: 0 }}>
            For questions about this policy: multedob@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}
