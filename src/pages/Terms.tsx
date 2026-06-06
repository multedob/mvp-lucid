// src/pages/Terms.tsx
// Termos de Uso — required for Apple App Store.
// Padrão visual: seções colapsáveis (mesmo do ContextSystem).

import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import CollapsibleSections, { type CollapsibleSection } from "@/components/CollapsibleSections";

const TERMS_SECTIONS: CollapsibleSection[] = [
  {
    section: "Aceite dos termos",
    items: [
      {
        label: "Ao usar o rdwth",
        text: ["Ao acessar e usar o rdwth, você concorda com estes termos. Se não concordar, não use o app."],
      },
    ],
  },
  {
    section: "O que é o rdwth",
    items: [
      {
        label: "Ferramenta de autoconhecimento",
        text: ["Sistema de leituras estruturais a partir das suas respostas. Composto por tensões, ciclo, convite de amigos e companhia de IA (Reed)."],
      },
      {
        label: "O que NÃO é",
        text: ["Não é terapia, aconselhamento médico, diagnóstico clínico ou tratamento psicológico. Não substitui psicólogos, psiquiatras ou outros profissionais de saúde."],
      },
    ],
  },
  {
    section: "Conteúdo gerado por IA",
    items: [
      {
        label: "Como funciona",
        text: ["As respostas do Reed e as leituras estruturais são geradas por inteligência artificial. Representam hipóteses estruturais baseadas nas suas respostas, não fatos verificados sobre você."],
      },
      {
        label: "Falibilidade",
        text: ["IA pode errar. Use as leituras como ferramenta de reflexão, não como avaliação definitiva da sua identidade ou valor."],
      },
    ],
  },
  {
    section: "Seu conteúdo",
    items: [
      {
        label: "Propriedade",
        text: ["Você mantém a propriedade total de tudo que escreve no rdwth."],
      },
      {
        label: "Uso interno",
        text: ["Usamos seu conteúdo apenas pra prestar o serviço: gerar leituras e sustentar conversas com Reed."],
      },
      {
        label: "Confidencialidade",
        text: ["Não compartilhamos seu conteúdo publicamente nem com outros usuários do app."],
      },
    ],
  },
  {
    section: "Idade mínima",
    items: [
      {
        label: "16 anos ou mais",
        text: ["Você precisa ter pelo menos 16 anos pra usar o rdwth. Ao criar conta, você confirma que atende a esse requisito."],
      },
    ],
  },
  {
    section: "Uso aceitável",
    items: [
      {
        label: "Conteúdo proibido",
        text: ["Não use o rdwth pra gerar conteúdo nocivo, ilegal, abusivo ou que viole direitos de terceiros."],
      },
      {
        label: "Sem engenharia reversa",
        text: ["Não tente extrair prompts do sistema, manipular o comportamento do Reed ou fazer engenharia reversa do modelo estrutural."],
      },
    ],
  },
  {
    section: "Assinatura e cobrança",
    items: [
      {
        label: "Serviço pago",
        text: ["rdwth é um serviço de assinatura paga. As cobranças são feitas pela Apple App Store, sujeitas aos termos da Apple."],
      },
      {
        label: "Cancelamento",
        text: ["Você pode cancelar a qualquer momento nos ajustes do seu Apple ID."],
      },
      {
        label: "Após cancelamento",
        text: ["Quando a assinatura expira, você mantém acesso de leitura ao histórico existente, mas não pode iniciar novos ciclos."],
      },
    ],
  },
  {
    section: "Limitação de responsabilidade",
    items: [
      {
        label: 'Fornecimento "como está"',
        text: ["O rdwth é fornecido sem garantias de qualquer tipo. Não garantimos a precisão das leituras estruturais."],
      },
      {
        label: "Decisões com base no app",
        text: ["Não nos responsabilizamos por decisões que você tome com base no conteúdo gerado pelo app. As leituras são reflexões, não prescrições."],
      },
    ],
  },
  {
    section: "Mudanças nestes termos",
    items: [
      {
        label: "Atualizações",
        text: ["Podemos atualizar estes termos. Mudanças relevantes serão comunicadas no app. O uso continuado após atualização constitui aceite."],
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

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="r-screen">
      <AppHeader section="termos" />

      <CollapsibleSections sections={TERMS_SECTIONS} />

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
