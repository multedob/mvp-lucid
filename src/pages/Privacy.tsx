// src/pages/Privacy.tsx
// Política de Privacidade — required for Apple App Store + LGPD/GDPR

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label">rdwth · privacidade</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ flex: 1, padding: "28px 24px" }}>
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16,
          lineHeight: 1.7, color: "var(--r-text)", marginBottom: 24,
        }}>
          Política de Privacidade
        </div>

        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 300, fontSize: 13,
          lineHeight: 1.8, color: "var(--r-sub)", letterSpacing: "0.01em",
        }}>
          <p style={{ marginBottom: 16 }}>
            <strong>Última atualização:</strong> abril de 2026
          </p>

          <p style={{ marginBottom: 16 }}>
            rdwth é uma aplicação de autoconhecimento estrutural. Levamos sua privacidade a sério. Esta política explica quais dados coletamos, como usamos esses dados e quais são seus direitos.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Dados que coletamos:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Endereço de email e credenciais de autenticação; seu primeiro nome, informado no onboarding; suas respostas às Pills; suas respostas ao questionário; suas conversas com Reed; dados de análise estrutural derivados das suas respostas; metadados de dispositivo e uso.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Como usamos seus dados:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Para gerar suas leituras estruturais e seu perfil de autoconhecimento; para permitir que Reed ofereça respostas personalizadas; para melhorar a precisão do instrumento estrutural ao longo do tempo. Não vendemos seus dados. Não usamos seus dados para publicidade.
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
