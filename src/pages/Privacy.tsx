// src/pages/Privacy.tsx
// Política de Privacidade — required for Apple App Store + LGPD/GDPR.
// Padrão visual: seções colapsáveis (mesmo do ContextSystem).

import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import CollapsibleSections, { type CollapsibleSection } from "@/components/CollapsibleSections";

const PRIVACY_SECTIONS: CollapsibleSection[] = [
  {
    section: "O que coletamos",
    items: [
      {
        label: "Email e autenticação",
        text: ["Endereço de email e credenciais usadas pra criar e acessar sua conta."],
      },
      {
        label: "Identidade básica",
        text: ["Seu primeiro nome, informado durante o onboarding."],
      },
      {
        label: "Suas respostas",
        text: ["Respostas das Pills, do questionário, conversas com Reed e respostas de pessoas próximas via questionário de terceiros."],
      },
      {
        label: "Análises derivadas",
        text: ["Leituras estruturais geradas a partir das suas respostas, perfis de ciclo, padrões agregados."],
      },
      {
        label: "Metadados de uso",
        text: ["Dispositivo, sistema operacional, navegador, eventos de uso anônimos."],
      },
    ],
  },
  {
    section: "Como usamos seus dados",
    items: [
      {
        label: "Pra gerar leituras",
        text: ["Construímos suas leituras estruturais e seu perfil de autoconhecimento ao longo dos ciclos."],
      },
      {
        label: "Pra alimentar o Reed",
        text: ["O Reed recebe contexto das suas respostas pra oferecer reflexões personalizadas."],
      },
      {
        label: "Pra refinar o sistema",
        text: ["Usamos padrões agregados pra melhorar a precisão do instrumento — nunca dados individuais identificáveis."],
      },
      {
        label: "O que NÃO fazemos",
        text: [
          "Não vendemos seus dados.",
          "Não usamos seus dados pra publicidade.",
          "Não compartilhamos com terceiros além dos listados aqui.",
        ],
      },
    ],
  },
  {
    section: "Onde seus dados ficam",
    items: [
      {
        label: "Supabase",
        text: ["Banco de dados e autenticação, hospedado em servidores AWS. Acesso restrito ao time do rdwth."],
      },
      {
        label: "Anthropic (Claude)",
        text: ["Conversas com Reed são processadas pela API da Anthropic. A Anthropic não usa dados de API para treinamento."],
      },
      {
        label: "Transferência internacional",
        text: ["Seus dados podem ser processados em servidores fora do Brasil (EUA). Ao usar o rdwth, você consente com essa transferência, conforme art. 33 da LGPD."],
      },
    ],
  },
  {
    section: "Base legal",
    items: [
      {
        label: "Consentimento",
        text: ["Tratamos seus dados com base no seu consentimento, dado ao aceitar esta política durante o onboarding (art. 7º, I da LGPD; art. 6º GDPR)."],
      },
      {
        label: "Execução do serviço",
        text: ["Alguns dados são necessários pra prestar o serviço — sem eles, o rdwth não funciona (art. 7º, V da LGPD)."],
      },
    ],
  },
  {
    section: "Retenção e exclusão",
    items: [
      {
        label: "Enquanto sua conta existir",
        text: ["Seus dados são mantidos enquanto a conta estiver ativa."],
      },
      {
        label: "Exportar",
        text: ["Você pode baixar todos os seus dados em Ajustes → Baixar meus dados."],
      },
      {
        label: "Apagar",
        text: ["Em Ajustes → Apagar conta você remove permanentemente seus dados. A exclusão é irreversível."],
      },
    ],
  },
  {
    section: "Seus direitos",
    items: [
      {
        label: "LGPD e GDPR",
        text: ["Você tem direito a: acessar, exportar, corrigir, apagar, revogar consentimento e solicitar portabilidade dos seus dados pessoais."],
      },
      {
        label: "Como exercer",
        text: ["Use as ferramentas em Ajustes ou escreva pra multedob@gmail.com."],
      },
    ],
  },
  {
    section: "Idade mínima",
    items: [
      {
        label: "16 anos ou mais",
        text: ["rdwth é destinado a pessoas com pelo menos 16 anos. A idade é confirmada no onboarding."],
      },
    ],
  },
  {
    section: "Contato e atualização",
    items: [
      {
        label: "Dúvidas",
        text: ["multedob@gmail.com"],
      },
      {
        label: "Última atualização",
        text: ["maio de 2026"],
      },
    ],
  },
];

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <AppHeader section="privacidade" />

      <CollapsibleSections sections={PRIVACY_SECTIONS} />

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span
          onClick={() => navigate(-1 as any)}
          style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}
        >
          ‹
        </span>
      </div>
    </div>
  );
}
