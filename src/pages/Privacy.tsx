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

          <p style={{ marginBottom: 8 }}><strong>Serviços de terceiros:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Lovable Cloud (banco de dados e autenticação); Anthropic (modelo de linguagem usado nas conversas com Reed — o texto da conversa é enviado para processamento; a Anthropic não usa dados de API para treinamento). Não compartilhamos seus dados com outros terceiros.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Retenção de dados:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Seus dados são mantidos enquanto sua conta estiver ativa. Você pode exportar todos os seus dados a qualquer momento em Ajustes → Baixar meus dados. Você pode apagar permanentemente todos os seus dados em Ajustes → Apagar conta.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Seus direitos (LGPD / GDPR):</strong></p>
          <p style={{ marginBottom: 16 }}>
            Você tem o direito de acessar, exportar, corrigir e apagar seus dados pessoais. Para exercer esses direitos, use as ferramentas do app em Ajustes ou entre em contato pelo email multedob@gmail.com.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Restrição de idade:</strong></p>
          <p style={{ marginBottom: 16 }}>
            rdwth é destinado a pessoas com 16 anos ou mais. Ao criar uma conta, você confirma que tem pelo menos 16 anos.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Contato:</strong></p>
          <p style={{ marginBottom: 0 }}>
            Para dúvidas sobre esta política: multedob@gmail.com
          </p>
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span onClick={() => navigate(-1 as any)} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </div>
  );
}
