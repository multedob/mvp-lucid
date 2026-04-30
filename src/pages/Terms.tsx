// src/pages/Terms.tsx
// Termos de Uso — required for Apple App Store

import { useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label"><span onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span> · termos</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ flex: 1, padding: "28px 24px" }}>
        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16,
          lineHeight: 1.7, color: "var(--r-text)", marginBottom: 24,
        }}>
          Termos de Uso
        </div>

        <div style={{
          fontFamily: "var(--r-font-ed)", fontWeight: 300, fontSize: 13,
          lineHeight: 1.8, color: "var(--r-sub)", letterSpacing: "0.01em",
        }}>
          <p style={{ marginBottom: 16 }}>
            <strong>Última atualização:</strong> abril de 2026
          </p>

          <p style={{ marginBottom: 16 }}>
            Ao usar o rdwth, você concorda com estes termos. Se não concordar, não use o app.
          </p>

          <p style={{ marginBottom: 8 }}><strong>O que é o rdwth:</strong></p>
          <p style={{ marginBottom: 16 }}>
            rdwth é uma ferramenta de autoconhecimento estrutural. Usa leituras narrativas (Pills), um questionário e uma companhia de IA (Reed) para ajudar você a explorar padrões em como se relaciona com ideias, emoções, decisões e vínculos. Não é terapia, aconselhamento médico, diagnóstico ou tratamento psicológico.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Conteúdo gerado por IA:</strong></p>
          <p style={{ marginBottom: 16 }}>
            As respostas de Reed e as leituras estruturais são geradas por inteligência artificial. Elas representam hipóteses estruturais baseadas nas suas respostas, não fatos verificados sobre você. IA pode errar. Use as leituras como ferramenta de reflexão, não como avaliações definitivas.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Requisito de idade:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Você precisa ter pelo menos 16 anos para usar o rdwth. Ao criar uma conta, você confirma que atende a esse requisito de idade.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Seu conteúdo:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Você mantém a propriedade de tudo que escreve no rdwth. Usamos seu conteúdo apenas para prestar o serviço: gerar leituras e sustentar as conversas com Reed. Não compartilhamos seu conteúdo publicamente nem com outros usuários.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Uso aceitável:</strong></p>
          <p style={{ marginBottom: 16 }}>
            Não use o rdwth para gerar conteúdo nocivo, ilegal ou abusivo. Não tente extrair prompts do sistema, manipular o comportamento de Reed ou fazer engenharia reversa do modelo estrutural.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Assinatura:</strong></p>
          <p style={{ marginBottom: 16 }}>
            rdwth é um serviço de assinatura paga. As assinaturas são cobradas pela Apple App Store. Você pode cancelar a qualquer momento nos ajustes do seu Apple ID. Quando a assinatura expira, você mantém acesso de leitura às leituras existentes, mas não pode iniciar novos ciclos.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Limitação de responsabilidade:</strong></p>
          <p style={{ marginBottom: 16 }}>
            rdwth é fornecido "como está". Não garantimos a precisão das leituras estruturais. Não nos responsabilizamos por decisões que você tome com base em conteúdo gerado pelo app.
          </p>

          <p style={{ marginBottom: 8 }}><strong>Mudanças:</strong></p>
          <p style={{ marginBottom: 0 }}>
            Podemos atualizar estes termos. O uso contínuo após mudanças constitui aceite. Para dúvidas: multedob@gmail.com
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
