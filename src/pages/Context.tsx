// src/pages/Context.tsx
// Subviews inline (sem rotas separadas):
//   → ContextCycle       — leitura salva de ciclo individual
//   → ContextDeep        — leitura profunda do ciclo
//   → ContextSystem      — "Como o rdwth funciona"
//   → ContextThirdParty  — convites pra terceiros (W20.4)
//
// Refactor B-S5.D: voz sistema padronizada via SystemTerminalLine /
// SystemTerminalCounter. Contador de perguntas usa Counter (só o número
// re-anima quando muda; prefixo permanece estável). Disclaimer espera o
// contador terminar (delayMs=700) pra digitar — sequencial, não simultâneo.

import { useState, useEffect, useMemo, useRef } from "react";
import SystemVoiceSequence from "@/components/SystemVoiceSequence";
import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { useUserName } from "@/hooks/useUserName";
import NavBottom from "@/components/NavBottom";
import { useShell } from "@/hooks/useShell";
import { useFlow } from "@/hooks/useFlow";
import { FLOW_CONTENT_DELAY_MS } from "@/components/FlowVoice";
import SystemCyclingLine from "@/components/SystemCyclingLine";

// Pool de frases pra voz do sistema durante abertura de Terceiros.
// Tudo lowercase, ≤ 38 chars (não quebra em mobile).
const THIRD_PARTY_DIABLOS = [
  "olhares de fora afinam o ciclo.",
  "terceiros veem o que você não vê.",
  "perspectiva externa amplia a leitura.",
  "pessoas próximas refletem padrões.",
  "pontos cegos viram visíveis.",
  "quem te conhece te lê melhor.",
  "olhares próximos revelam ângulos.",
  "o de fora amplia o de dentro.",
];

function pickTwoDistinct(pool: string[]): [string, string] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return [shuffled[0] ?? "", shuffled[1] ?? shuffled[0] ?? ""];
}
import SystemTerminalLine from "@/components/SystemTerminalLine";
import SystemTerminalCounter from "@/components/SystemTerminalCounter";
import { fetchQuestionnaireProgress } from "@/lib/questionnaireProgress";
import { LoadingScreen } from "@/components/LoadingScreen";
import { track } from "@/lib/analytics";

const SUPABASE_URL = "https://tomtximafvrhmuchjyqt.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbXR4aW1hZnZyaG11Y2hqeXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjE4MzYsImV4cCI6MjA4NzI5NzgzNn0.4e7TbCSrL8fecsgKCHDBEerXO8ePd5-5QeaC6czEkzo";

// Capitaliza primeira letra de cada palavra (ex: "bruno" → "Bruno", "maria-clara" → "Maria-clara")
function capitalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// LocalStorage keys pra onboardings
// Item #7 (consolidação Sistema) — removidos:
// - ONBOARDING_CONTEXT_SEEN / ONBOARDING_THIRD_PARTY_SEEN (localStorage flags)
// - OnboardingOverlay (componente de tela cheia primeira-visita)
// O conteúdo dos overlays foi migrado pra ContextSystem com sub-seções.

// ─── ContextSystem — "Como o rdwth funciona" ──────────────────────
export function ContextSystem({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1 as any));

  // Estrutura em sub-seções (consolidação dos onboardings — item #7).
  // Cada seção agrupa items relacionados; cada item tem label + text[].
  const SECTIONS: { section: string; items: { label: string; text: string[] }[] }[] = [
    {
      section: "Como o rdwth funciona",
      items: [
        {
          label: "O que é isso",
          text: ["O rdwth mapeia como você organiza experiência. Não quem você é — a forma que você dá pro que vive, agora."],
        },
        {
          label: "Por que linguagem, não números",
          text: ["A leitura é em palavras, não em escala. O que você é não cabe num número."],
        },
        {
          label: "Sem direção",
          text: ["O sistema mostra. Não diz o que fazer com isso. A leitura é sua."],
        },
      ],
    },
    {
      section: "As quatro partes",
      items: [
        {
          label: "Reed",
          text: ["Reed é a voz do rdwth nas conversas. Traduz a saída estrutural em linguagem. Sua referência é uma biblioteca curada de psicologia, filosofia e teoria organizacional. Sem internet, sem opinião própria."],
        },
        {
          label: "Pills",
          text: ["Seis leituras curtas, uma por dimensão. Você reage; a forma da reação é o sinal. As tensões: Eu↔Pertencimento, Eu↔Papel, Presença↔Distância, Clareza↔Ação, Dentro↔Fora, Movimento↔Pausa."],
        },
        {
          label: "Questionário",
          text: ["Perguntas em 4 dimensões. No seu ritmo — pode pausar e voltar. Com as pills, forma a base da leitura."],
        },
        {
          label: "Questionário de terceiros",
          text: [
            "Um link único pra pessoas próximas. 5 perguntas curtas, 5-10 minutos do lado delas. O olhar de fora vê o que de dentro escapa.",
            "O anonimato é decisão de quem responde — você só vê quem aceitou aparecer. Limite: 8 convites por ciclo.",
            "No 1º ciclo, opcional. Do 2º em diante, precisa de ao menos 2 respostas pra fechar.",
          ],
        },
      ],
    },
    {
      section: "Sua leitura",
      items: [
        {
          label: "Ciclos",
          text: ["Um ciclo é um momento fechado: pills, questionário e olhar de fora. Cada um se sustenta sozinho. Conforme se acumulam, padrões emergem por si — o sistema observa, não impõe."],
        },
        {
          label: "Leitura por ciclo",
          text: ["Cada ciclo produz sua própria leitura estrutural. Descreve padrões predominantes naquele momento — não identidade, não diagnóstico, não direção."],
        },
        {
          label: "Leitura profunda",
          text: ["Integra pills, questionário e terceiros num só lugar. Não diagnostica, não prescreve — devolve forma ao que você trouxe."],
        },
        {
          label: "Natureza provisória",
          text: ["Toda leitura é provisória. Sozinha, é hipótese; somada, vira mapa."],
        },
      ],
    },
    {
      section: "Sobre se mostrar",
      items: [
        {
          label: "Um ato de coragem",
          text: ["Pedir que alguém te descreva exige coragem — não dá pra fazer isso sem se expor. E é aí que algo se abre: o olhar de dentro não cabe em dois lugares. O que mais resistimos em ver costuma voltar sem peso, no olhar do outro."],
        },
      ],
    },
  ];

  return (
    <div className="r-screen">
      <AppHeader section="sistema" />

      <SystemSections sections={SECTIONS} />

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={handleBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </div>
  );
}

// Sub-seções colapsáveis. Cada seção começa fechada; click no header toggle.
function SystemSections({ sections }: {
  sections: { section: string; items: { label: string; text: string[] }[] }[]
}) {
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    setOpenIdx(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="r-scroll" style={{ padding: "24px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      {sections.map((sec, i) => {
        const isOpen = openIdx.has(i);
        return (
          <div key={sec.section} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header clicável */}
            <div
              onClick={() => toggle(i)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--r-font-sys)",
                fontWeight: 400,
                fontSize: 10,
                color: "var(--r-text)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--r-ghost)",
                paddingBottom: 8,
                paddingTop: 4,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <span>{sec.section}</span>
              <span aria-hidden="true" style={{
                fontSize: 12,
                color: "var(--r-muted)",
                marginLeft: 12,
                transition: "transform 200ms ease",
                transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                display: "inline-block",
                lineHeight: 1,
              }}>
                +
              </span>
            </div>

            {/* Items — só aparecem quando expandido */}
            {isOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 12 }}>
                {sec.items.map(item => (
                  <div key={item.label} style={{ borderLeft: "1px solid var(--r-ghost)", paddingLeft: 16 }}>
                    <div style={{
                      fontFamily: "var(--r-font-sys)",
                      fontWeight: 400,
                      fontSize: 10,
                      color: "var(--r-sub)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}>
                      {item.label}
                    </div>
                    {item.text.map((p, idx) => (
                      <div key={idx} style={{
                        fontFamily: "var(--r-font-sys)",
                        fontWeight: 300,
                        fontSize: 11,
                        color: "var(--r-dim)",
                        lineHeight: 1.7,
                        letterSpacing: "0.03em",
                        marginBottom: idx < item.text.length - 1 ? 10 : 0,
                      }}>
                        {p}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ContextCycle — leitura salva ────────────────────────────────
function ContextCycle({ cycle, onBack, userName }: { cycle: CycleData; onBack: () => void; userName: string | null }) {
  useShell({ section: `contexto · ${cycle.id}`, active: "context" });
  const navigate = useNavigate();
  const disclaimerText = userName
    ? `${userName}, esta é uma leitura estrutural de um momento. Não define quem você é.`
    : "Esta é uma leitura estrutural de um momento. Não define quem você é.";

  return (
    <>
      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-telha)", letterSpacing: "0.12em" }}>
          {cycle.id} — leitura salva
        </div>
        <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16, lineHeight: 1.7, color: "var(--r-text)" }}>
          {cycle.description}
        </div>
        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.5 }} />
        <SystemTerminalLine text={disclaimerText} />
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </>
  );
}

// ─── ContextDeep — deep reading ──────────────────────────────────
function ContextDeep({ cycle, onBack, userName }: { cycle: CycleData; onBack: () => void; userName: string | null }) {
  useShell({ section: `contexto · ${cycle.id}`, active: "context" });
  const navigate = useNavigate();
  const disclaimerText = userName
    ? `${userName}, esta é uma leitura estrutural de um momento. Não define quem você é.`
    : "Esta é uma leitura estrutural de um momento. Não define quem você é.";

  // Cascade: voz sistema topo entra primeiro, leitura entra com fade depois.
  const [bodyVisible, setBodyVisible] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setBodyVisible(true), 2700);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {/* Voz sistema sempre no topo — posição canônica */}
      <div style={{ padding: "12px 24px 0", flexShrink: 0 }}>
        <SystemTerminalLine text={disclaimerText} />
      </div>

      <div
        className="r-scroll"
        style={{
          padding: "20px 24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          opacity: bodyVisible ? 1 : 0,
          transition: "opacity 500ms ease-in",
        }}
      >
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-telha)", letterSpacing: "0.12em" }}>
          {cycle.id} — leitura profunda
        </div>
        <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16, lineHeight: 1.7, color: "var(--r-text)" }}>
          {cycle.deep}
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </>
  );
}

// ─── Types ────────────────────────────────────────────────────────
interface CycleData {
  id: string;          // display "C1", "C2", etc
  ipeCycleId: string;  // uuid real do ipe_cycles
  cycleNumber: number;
  description: string;
  deep: string;
  questionnaireRemaining: number;
}

interface ThirdPartyInvite {
  id: string;
  ipe_cycle_id: string;
  token: string;
  status: "pending" | "submitted" | "revoked" | "expired";
  responder_email: string | null;
  responder_name: string | null;
  reveal_identity: boolean | null;
  user_pronoun: string | null;
  question_set: string | null;
  created_at: string;
  submitted_at: string | null;
}

interface ThirdPartyResponse {
  invite_id: string;
  question_id: string;
  scale_value: number | null;
  open_text: string | null;
  episode_text: string | null;
}

// ─── ContextThirdParty — convites pra terceiros (W20.4) ──────────
// NOTA W20.5b/W20.6.5: mini_insight do terceiro NUNCA é exibido pro user.
// Por isso esse componente NÃO faz fetch de third_party_mini_insights — só
// `service_role` tem permissão de leitura (defesa em profundidade).
export function ContextThirdParty({ ipeCycleId, onBack, userName }: {
  ipeCycleId: string;
  onBack: () => void;
  userName: string | null;
}) {
  // useShell é responsabilidade do caller (ThirdPartyPage seta section="terceiros").
  const navigate = useNavigate();
  const [invites, setInvites] = useState<(ThirdPartyInvite & { cycle_number?: number })[]>([]);
  const [responses, setResponses] = useState<Record<string, ThirdPartyResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"main" | "history">("main");
  const [openCycle, setOpenCycle] = useState<number | null>(null);
  // Pronome eliminado da UI — inferido do primeiro nome do user.
  // Heurística PT-BR: termina em 'a' → ela; em 'o' → ele; outros → elu (neutro).
  function inferPronoun(name: string | null | undefined): "ela" | "ele" | "elu" {
    if (!name) return "elu";
    const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    if (!first) return "elu";
    const last = first[first.length - 1];
    if (last === "a") return "ela";
    if (last === "o") return "ele";
    return "elu";
  }
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null); // invite_id expandido
  const [errorMsg, setErrorMsg] = useState("");

  // Quando link é gerado (e auto-copiado), mostra check brevemente — depois reseta pra ícone copy.
  useEffect(() => {
    if (!createdUrl) { setLinkCopied(false); return; }
    setLinkCopied(true);
    const t = window.setTimeout(() => setLinkCopied(false), 2200);
    return () => window.clearTimeout(t);
  }, [createdUrl]);

  const copyCreatedUrl = async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2200);
    } catch {}
  };

  const headerText = userName
    ? `${capitalizeName(userName)}, convide até 8 pessoas próximas que conhecem você. as respostas delas alimentam suas leituras com perspectiva externa.`
    : "convide até 8 pessoas próximas. as respostas delas alimentam suas leituras com perspectiva externa.";

  // ─── Voice sequence (abertura da página de Terceiros) ──────────────
  // Voz fluida (SystemVoiceSequence):
  //   linha 1: diablo1 → reverse → some
  //   linha 2: diablo2 → reverse → some
  //   hint multi-linha: cada linha typewriter SEQUENCIAL — fica pra sempre
  // Conteúdo principal entra após última linha da hint completar.
  const diablosRef = useRef<[string, string]>(pickTwoDistinct(THIRD_PARTY_DIABLOS));
  const [contentVisible, setContentVisible] = useState(false);
  const [voiceFadeOut, setVoiceFadeOut] = useState(false);
  const firstName = (userName ?? "").toLowerCase().trim().split(/\s+/)[0] ?? "";
  // 3 linhas. L1 e L2 com prefixo "> ". L3 é continuação da L2 (sem ">", indent 2ch).
  const hintLines = useMemo<Array<string | { text: string; continuation?: boolean }>>(() => {
    const intro = firstName
      ? `${firstName}, convide até 8 pessoas próximas.`
      : "convide até 8 pessoas próximas.";
    return [
      intro,
      "as respostas delas alimentam",
      { text: "suas leituras com outra perspectiva.", continuation: true },
    ];
  }, [firstName]);
  const voiceSlots = useMemo(() => {
    const first = hintLines[0];
    const firstText = typeof first === "string" ? first : first.text;
    return [
      { first: diablosRef.current[0], reverseAfterFirst: true },
      { first: diablosRef.current[1], reverseAfterFirst: true },
      { first: firstText }, // first do slot[2] não usado em modo multilineHint, mas precisa pra calcular timing
    ];
  }, [hintLines]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}`, apikey: ANON_KEY };

      // 1. Puxa todos ciclos do user pra agrupar invites por ciclo na History view
      const { data: cycles } = await supabase
        .from("ipe_cycles")
        .select("id, cycle_number")
        .eq("user_id", session.user.id);
      const cycleMap: Record<string, number> = {};
      (cycles ?? []).forEach((c) => { cycleMap[c.id] = c.cycle_number; });
      const cycleIds = Object.keys(cycleMap);

      // 2. Puxa invites de TODOS os ciclos do user (não só o atual) — necessário
      //    pra agrupar por ciclo na view "convites enviados".
      let invs: (ThirdPartyInvite & { cycle_number?: number })[] = [];
      if (cycleIds.length > 0) {
        const idsCsv = cycleIds.map((id) => `"${id}"`).join(",");
        const invR = await fetch(
          `${SUPABASE_URL}/rest/v1/third_party_invites?ipe_cycle_id=in.(${idsCsv})&order=created_at.desc`,
          { headers }
        );
        const rawInvs: ThirdPartyInvite[] = await invR.json();
        if (Array.isArray(rawInvs)) {
          invs = rawInvs.map((i) => ({ ...i, cycle_number: cycleMap[i.ipe_cycle_id] }));
        }
      }
      setInvites(invs);

      // Carrega responses dos invites com status submitted.
      // mini_insights NÃO são puxados — eles são privados do terceiro (W20.5b/W20.6.5).
      const submittedIds = invs.filter(i => i.status === "submitted").map(i => i.id);
      if (submittedIds.length > 0) {
        const idsCsv = submittedIds.map(id => `"${id}"`).join(",");
        const respR = await fetch(
          `${SUPABASE_URL}/rest/v1/third_party_responses?invite_id=in.(${idsCsv})`,
          { headers }
        );
        const resps: ThirdPartyResponse[] = await respR.json();
        const grouped: Record<string, ThirdPartyResponse[]> = {};
        for (const r of resps) {
          if (!grouped[r.invite_id]) grouped[r.invite_id] = [];
          grouped[r.invite_id].push(r);
        }
        setResponses(grouped);
      }
    } catch (err) {
      console.error("[ContextThirdParty] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [ipeCycleId]);

  const createInvite = async () => {
    setErrorMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const r = await fetch(`${SUPABASE_URL}/functions/v1/third-party-create-invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ipe_cycle_id: ipeCycleId, user_pronoun: inferPronoun(userName) }),
      });
      const d = await r.json();
      if (!r.ok) { setErrorMsg(d.error ?? "erro"); return; }
      setCreatedUrl(d.url);
      track("third_party_invite_created", { pronoun: inferPronoun(userName) });
      // Copia automaticamente
      try { await navigator.clipboard.writeText(d.url); } catch {}
      await loadAll();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "erro");
    }
  };

  const revokeInvite = async (inviteId: string) => {
    track("third_party_invite_revoked");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(
        `${SUPABASE_URL}/rest/v1/third_party_invites?id=eq.${inviteId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: ANON_KEY,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ status: "revoked", revoked_at: new Date().toISOString() }),
        }
      );
      await loadAll();
    } catch (err) {
      console.error("[ContextThirdParty] revoke error:", err);
    }
  };

  const copyUrl = async (token: string) => {
    const url = `https://rdwth.com/third-party/${token}`;
    try { await navigator.clipboard.writeText(url); } catch {}
  };

  const statusLabel = (s: string) =>
    s === "pending" ? "aguardando" :
    s === "submitted" ? "respondido" :
    s === "revoked" ? "cancelado" :
    s === "expired" ? "expirado" : s;

  const activeCount = invites.filter(i => i.status === "pending" || i.status === "submitted").length;
  const submittedCount = invites.filter(i => i.status === "submitted").length;

  // Helpers de UI
  const minimalBtn = {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 12,
    cursor: "pointer" as const,
    padding: "14px 0",
  };
  const minimalBtnLine = {
    width: 1,
    height: 14,
    background: "var(--r-text)",
    flexShrink: 0,
  };
  const minimalBtnLabel = {
    fontFamily: "var(--r-font-sys)",
    fontWeight: 300,
    fontSize: 12,
    color: "var(--r-text)",
    letterSpacing: "0.06em",
  };

  // Agrupa invites por cycle_number (decrescente)
  const groupsByCycle = (() => {
    const map = new Map<number, typeof invites>();
    invites.forEach((inv) => {
      const cn = inv.cycle_number ?? 1;
      if (!map.has(cn)) map.set(cn, []);
      map.get(cn)!.push(inv);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  })();

  return (
    <>
      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Voz do sistema — diablo1 → diablo2 → reverse → hint typewriter.
            Após hint completar: conteúdo entra + timer de leitura (1500ms) +
            fade-out da voz (400ms). Voz fica no DOM com opacity 0 pra
            preservar a posição do conteúdo (não sobe). */}
        <SystemVoiceSequence
          slots={voiceSlots}
          fadeOut={voiceFadeOut}
          multilineHint
          hintLines={hintLines}
          onHintReady={() => {
            setContentVisible(true);
            // Tempo de leitura da hint antes do fade out
            window.setTimeout(() => setVoiceFadeOut(true), 1500);
          }}
        />

        {/* Conteúdo só aparece após hint typewriter terminar.
            marginTop extra pra dar respiro entre a voz e os KPIs. */}
        {contentVisible && view === "main" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 12 }}>
            {/* KPIs */}
            {!loading && invites.length > 0 && (
              <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-ghost)", letterSpacing: "0.12em" }}>
                {submittedCount} respondidos · {activeCount} ativos · {invites.length} no total
              </div>
            )}

            {/* Botões minimalistas */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {activeCount < 8 && !creating && (
                <div
                  style={minimalBtn}
                  onClick={() => { setCreating(true); setCreatedUrl(null); createInvite(); }}
                >
                  <div style={minimalBtnLine} />
                  <span style={minimalBtnLabel}>+ novo convite</span>
                </div>
              )}
              {activeCount >= 8 && !creating && (
                <div className="r-sub" style={{ fontStyle: "italic", padding: "10px 0" }}>
                  limite de 8 convites por ciclo atingido.
                </div>
              )}

              {invites.length > 0 && (
                <div style={minimalBtn} onClick={() => setView("history")}>
                  <div style={minimalBtnLine} />
                  <span style={minimalBtnLabel}>convites enviados ›</span>
                </div>
              )}
            </div>

            {/* Painel de criação (após click "novo convite") */}
            {creating && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px", border: "1px solid var(--r-ghost)", maxWidth: 480, marginLeft: "auto", marginRight: "auto", width: "100%" }}>
                {!createdUrl && (
                  <>
                    <div className="r-sub" style={{ fontStyle: "italic" }}>gerando link...</div>
                    {errorMsg && <div style={{ color: "var(--terracota, #b85a3e)", fontSize: 12 }}>{errorMsg}</div>}
                  </>
                )}
                {createdUrl && (
                  <>
                    <div className="r-sub">link gerado e copiado pra área de transferência:</div>
                    <div style={{ position: "relative", fontFamily: "monospace", fontSize: 11, padding: "8px 36px 8px 8px", background: "var(--r-bg)", border: "1px dashed var(--r-ghost)", wordBreak: "break-all" }}>
                      {createdUrl}
                      <button
                        type="button"
                        onClick={copyCreatedUrl}
                        aria-label={linkCopied ? "copiado" : "copiar link"}
                        title={linkCopied ? "copiado" : "copiar link"}
                        style={{
                          position: "absolute", top: 6, right: 6, width: 24, height: 24,
                          background: "transparent", border: 0, padding: 0,
                          cursor: "pointer", display: "inline-flex",
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <span style={{ position: "relative", width: 14, height: 14, display: "inline-block" }}>
                          <Copy size={14} style={{ position: "absolute", inset: 0, opacity: linkCopied ? 0 : 1, transition: "opacity 220ms ease", color: "var(--r-muted-dk, #585860)" }} />
                          <Check size={14} style={{ position: "absolute", inset: 0, opacity: linkCopied ? 1 : 0, transition: "opacity 220ms ease", color: "var(--r-text)" }} />
                        </span>
                      </button>
                    </div>
                    <div className="r-sub" style={{ fontStyle: "italic" }}>
                      envie esse link pra quem você quer que responda.
                    </div>
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                      <span onClick={() => { setCreating(false); setCreatedUrl(null); }} style={{ fontFamily: "var(--r-font-sys)", fontSize: 12, color: "var(--r-text)", cursor: "pointer" }}>fechar</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* History view — convites agrupados por ciclo, cada ciclo expansível.
            NB: botão "‹ voltar" removido — usar o ‹ do footer (que volta
            contextualmente pro main view dentro desta página). */}
        {contentVisible && view === "history" && (
          <>
            {!loading && invites.length === 0 && (
              <div className="r-sub" style={{ textAlign: "center", padding: "20px 0" }}>
                nenhum convite enviado ainda.
              </div>
            )}

            {groupsByCycle.map(([cycleNumber, invs]) => {
              const isOpen = openCycle === cycleNumber;
              const respondedInCycle = invs.filter((i) => i.status === "submitted").length;
              return (
                <div key={cycleNumber} style={{ borderTop: "0.5px solid var(--r-ghost)", paddingTop: 12 }}>
                  <div
                    style={{ ...minimalBtn, padding: "10px 0" }}
                    onClick={() => setOpenCycle(isOpen ? null : cycleNumber)}
                  >
                    <div style={minimalBtnLine} />
                    <span style={minimalBtnLabel}>
                      ciclo c{cycleNumber} · {invs.length} convites · {respondedInCycle} respondidos {isOpen ? "▾" : "▸"}
                    </span>
                  </div>

                  {isOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 12, paddingBottom: 10 }}>
                      {invs.map((inv) => {
                        const VALID_QIDS = new Set(["calibration", "q1", "q2", "q3", "q4", "q5"]);
                        const respList = (responses[inv.id] ?? []).filter((r) => VALID_QIDS.has(r.question_id));
                        const respCount = respList.length;
                        const expectedTotal = 6;
                        const showDetails = expanded === inv.id;
                        const canShowResponses = inv.status === "submitted" && inv.reveal_identity === true;
                        const displayName =
                          inv.status === "submitted"
                            ? inv.reveal_identity === true && inv.responder_name
                              ? capitalizeName(inv.responder_name)
                              : "respondeu sem se identificar"
                            : inv.status === "pending"
                              ? "convite aguardando"
                              : "—";

                        return (
                          <div key={inv.id} style={{ paddingTop: 8, paddingBottom: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 12, color: "var(--r-text)", letterSpacing: "0.04em" }}>
                                  {displayName}
                                </div>
                                <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 10, color: "var(--r-muted)", marginTop: 2 }}>
                                  {statusLabel(inv.status)}
                                  {inv.status === "submitted" && respCount > 0 && ` · ${respCount}/${expectedTotal} respostas`}
                                  {inv.question_set && ` · grupo ${inv.question_set === "alpha" ? "α" : "β"}`}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                {inv.status === "pending" && (
                                  <>
                                    <span onClick={() => copyUrl(inv.token)} style={{ fontFamily: "var(--r-font-sys)", fontSize: 11, color: "var(--r-muted)", cursor: "pointer" }} title="copiar link">copiar link</span>
                                    <span onClick={() => revokeInvite(inv.id)} style={{ fontFamily: "var(--r-font-sys)", fontSize: 11, color: "var(--terracota, #b85a3e)", cursor: "pointer" }}>revogar</span>
                                  </>
                                )}
                                {canShowResponses && (
                                  <span onClick={() => setExpanded(showDetails ? null : inv.id)} style={{ fontFamily: "var(--r-font-sys)", fontSize: 11, color: "var(--r-text)", cursor: "pointer", letterSpacing: "0.04em" }}>
                                    {showDetails ? "fechar" : "ver respostas"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {showDetails && canShowResponses && (
                              <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(0,0,0,0.02)", borderLeft: "1px solid var(--r-ghost)" }}>
                                {respList.map((r) => (
                                  <div key={r.question_id} style={{ marginBottom: 12, fontFamily: "var(--r-font-sys)", fontSize: 11, color: "var(--r-text)" }}>
                                    <div style={{ color: "var(--r-muted)", letterSpacing: "0.06em", marginBottom: 4 }}>
                                      {r.question_id}
                                      {r.scale_value !== null && ` · escala: ${r.scale_value}/5`}
                                    </div>
                                    {r.episode_text && <div style={{ marginBottom: 4, lineHeight: 1.5 }}>{r.episode_text}</div>}
                                    {r.open_text && <div style={{ fontStyle: "italic", color: "var(--r-muted)" }}>{r.open_text}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        {/* ‹ contextual: se está em history view, volta pro main view (mesma rota);
            senão, dispara onBack (que volta pra página anterior via navigate(-1)). */}
        <span
          onClick={() => {
            if (view === "history") {
              setView("main");
              setOpenCycle(null);
            } else {
              onBack();
            }
          }}
          style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}
        >‹</span>
      </div>
    </>
  );
}

// ─── Context principal ────────────────────────────────────────────
export default function Context() {
  const navigate = useNavigate();
  const userName = useUserName();
  const location = useLocation();
  const fromFlow = !!(location.state as { fromFlow?: boolean } | null)?.fromFlow;

  // Section "contexto" como default — sub-componentes sobrescrevem com section própria.
  useShell({ section: "contexto", active: "context" });
  const { markFlowReady } = useFlow();

  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showDeep, setShowDeep] = useState(false);
  const [showCycle, setShowCycle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingScreenDone, setLoadingScreenDone] = useState(fromFlow);


  useEffect(() => { loadCycles(); }, []);

  // Cascade. Sem flow: 2700ms (espera voz própria).
  // Com flow: delay fixo desde mount (Modo A — 3 frases empilhadas + hint).
  // IMPORTANTE: hooks DEVEM estar antes de qualquer return condicional (regra dos hooks).
  const [canvasVisible, setCanvasVisible] = useState(false);
  useEffect(() => {
    const delay = fromFlow ? FLOW_CONTENT_DELAY_MS : 2700;
    const t = window.setTimeout(() => setCanvasVisible(true), delay);
    return () => window.clearTimeout(t);
  }, [fromFlow]);

  // Sinaliza ao FlowVoice quando dados do Context carregaram
  useEffect(() => {
    if (!fromFlow) return;
    if (!loading) markFlowReady();
  }, [fromFlow, loading, markFlowReady]);

  async function loadCycles() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      // Wave 14 — agora também puxamos deep_reading_text de ipe_cycles (incremental).
      // Fallback para cycles.llm_response (gerado pelo lucid-engine ao final do questionário).
      const { data: ipeCycles } = await (supabase as any)
        .from("ipe_cycles")
        .select("id, cycle_number, status, deep_reading_text")
        .eq("user_id", session.user.id)
        .in("status", ["pills", "complete", "questionnaire"])
        .order("cycle_number", { ascending: true });

      // TA-S6.1b — Busca warmup_deep_reading do user (usado em 2 cenários):
      //   1. user sem ciclo nenhum → vira card L0
      //   2. user com C1 vazio (sem deep_reading_text) → fallback do C1 (opção B)
      const { data: warmupDeep } = await (supabase as any)
        .from("echoes")
        .select("id, eco_text, follow_up_question, created_at")
        .eq("user_id", session.user.id)
        .eq("kind", "warmup_deep_reading")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const warmupEco: string | null = warmupDeep?.eco_text ?? null;
      const warmupFollowUp: string | null = warmupDeep?.follow_up_question ?? null;

      // Cenário 1: user sem ciclo — mostra warmup como L0 (leitura inicial)
      if (!ipeCycles || ipeCycles.length === 0) {
        if (warmupEco) {
          const fullDeep = warmupFollowUp ? `${warmupEco}\n\n${warmupFollowUp}` : warmupEco;
          const paragraphs = warmupEco.split("\n\n").filter(Boolean);
          const description = paragraphs.slice(0, 2).join("\n\n");

          setCycles([{
            id: "L0",
            ipeCycleId: "", // warmup-only — sem ciclo real
            cycleNumber: 0,
            description,
            deep: fullDeep,
            questionnaireRemaining: 0,
          }]);
        }
        setLoading(false);
        return;
      }

      // Wave 14 — apenas deep_reading_text (incremental). Sem fallback pra cycles.llm_response
      // (esse legado tinha invenções/diagnósticos). Sem texto = mensagem de pending.
      // TA-S6.1b — fallback: C1 vazio E há warmup_deep_reading → usa warmup no lugar do placeholder.
      const cycleData: CycleData[] = await Promise.all(ipeCycles.map(async (ipe: any) => {
        const text: string = ipe.deep_reading_text ?? "";
        const paragraphs = text.split("\n\n").filter(Boolean);
        const hasPending = !text;
        const progress = await fetchQuestionnaireProgress(ipe.id);

        // TA-S6.1b — só aplica fallback no PRIMEIRO ciclo (cycle_number === 1)
        const useWarmupFallback = hasPending && ipe.cycle_number === 1 && warmupEco;

        let description: string;
        let deep: string;
        if (useWarmupFallback) {
          const wEco = warmupEco as string; // type narrowed pelo guard
          const wFull = warmupFollowUp ? `${wEco}\n\n${warmupFollowUp}` : wEco;
          const wParas = wEco.split("\n\n").filter(Boolean);
          description = wParas.slice(0, 2).join("\n\n");
          deep = wFull;
        } else if (hasPending) {
          description = "A leitura aparece conforme você responde — pills e questionário alimentam ela.";
          deep = "Esta leitura se constrói conforme você fala. Responda uma pill ou um bloco do questionário pra ela aparecer aqui.";
        } else {
          description = paragraphs.slice(0, 2).join("\n\n");
          deep = text;
        }

        return {
          id: `C${ipe.cycle_number}`,
          ipeCycleId: ipe.id,
          cycleNumber: ipe.cycle_number,
          description,
          deep,
          questionnaireRemaining: progress.remaining,
        };
      }));

      setCycles(cycleData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Loading inicial — overlay com identidade rdwth (mostra enquanto carrega
  // E também durante phase 3 + fade out, controlado por loadingScreenDone)
  if (!loadingScreenDone) {
    return <LoadingScreen
      loadComplete={!loading}
      onDone={() => setLoadingScreenDone(true)}
      section="contexto"
      active="context"
    />;
  }

  // Subviews
  if (showDeep && cycles[selectedIdx]) return <ContextDeep cycle={cycles[selectedIdx]} onBack={() => setShowDeep(false)} userName={userName} />;
  if (showCycle && cycles[selectedIdx]) return <ContextCycle cycle={cycles[selectedIdx]} onBack={() => setShowCycle(false)} userName={userName} />;
  // Terceiros agora é rota standalone (/terceiros via NavBottom), não acessado por dentro do Context.

  // Empty state — nenhum ciclo ainda
  if (!loading && cycles.length === 0) return (
    <>
      <div style={{ minHeight: 110, flexShrink: 0, padding: "12px 24px 0" }}>
        {!fromFlow && (
          <SystemTerminalLine
            text={"nenhuma leitura ainda.\ncomplete um questionário pra começar."}
          />
        )}
      </div>
      <div style={{ flex: 1 }} />
    </>
  );

  const cycle = cycles[selectedIdx];
  const disclaimerText = userName
    ? `${userName}, aqui tem histórico de leituras dos seus ciclos e o canal para questionário de terceiros.`
    : "Aqui tem histórico de leituras dos seus ciclos e o canal para questionário de terceiros.";

  return (
    <>
      {/* Voice slot — espaço reservado (~110px). Sem flow: counter + disclaimer.
          Com flow: vazio (FlowVoice ocupa via overlay). Após flow: vazio. */}
      <div style={{ minHeight: 110, flexShrink: 0, padding: "12px 24px 0" }}>
        {!fromFlow && cycle && (
          <>
            {cycle.questionnaireRemaining > 0 && (
              <SystemTerminalCounter
                prefix="perguntas restantes: "
                value={cycle.questionnaireRemaining}
              />
            )}
            <SystemTerminalLine
              text={disclaimerText}
              delayMs={cycle.questionnaireRemaining > 0 ? 700 : 0}
            />
          </>
        )}
      </div>

      {/* Conteúdo principal — cascade após voz sistema (~2700ms) */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "16px 24px 16px",
        overflow: "hidden",
        opacity: canvasVisible ? 1 : 0,
        transition: "opacity 500ms ease-in",
      }}>

        {/* TOP — leitura atual */}
        {cycle && (
          <div style={{ flexShrink: 0 }}>
            {/* Descrição — scroll interno */}
            <div style={{ overflowY: "auto", maxHeight: 120, marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 14, lineHeight: 1.65, color: "var(--r-text)" }}>
                {cycle.description}
              </div>
            </div>

            {/* Deep reading */}
            <div
              onClick={() => { track("context_deep_reading_opened"); setShowDeep(true); }}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            >
              <div style={{ width: 1, height: 12, background: "var(--r-telha)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-sub)", letterSpacing: "0.06em" }}>
                leitura profunda
              </span>
            </div>
          </div>
        )}

        {/* MIDDLE — spacer */}
        <div style={{ flex: 1 }} />

        {/* BOTTOM */}
        <div style={{ flexShrink: 0 }}>
          {/* Cycles */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-ghost)", letterSpacing: "0.12em", marginBottom: 10 }}>
              Ciclos
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 20 }}>
                {cycles.map((c, i) => (
                  <span
                    key={c.id}
                    onClick={() => { track("context_cycle_clicked", { cycle_number: c.cycleNumber }); setSelectedIdx(i); }}
                    style={{
                      fontFamily: "var(--r-font-sys)",
                      fontWeight: selectedIdx === i ? 400 : 300,
                      fontSize: 11,
                      color: selectedIdx === i ? "var(--r-telha)" : "var(--r-sub)",
                      letterSpacing: "0.06em",
                      borderBottom: selectedIdx === i ? "1px solid var(--r-telha)" : "1px solid transparent",
                      paddingBottom: 2,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {c.id}
                  </span>
                ))}
              </div>

              {/* Terceiros agora é acessado pelo NavBottom (não mais aqui dentro) */}
            </div>
          </div>

        </div>
      </div>

    </>
  );
}
