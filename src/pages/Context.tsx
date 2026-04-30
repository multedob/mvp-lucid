// src/pages/Context.tsx
// Subviews inline (sem rotas separadas):
//   → ContextCycle       — leitura salva de ciclo individual
//   → ContextDeep        — leitura profunda do ciclo
//   → ContextSystem      — "Como o rdwth funciona"
//   → ContextThirdParty  — convites pra terceiros (W20.4)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getToday } from "@/lib/api";
import { useUserName } from "@/hooks/useUserName";
import NavBottom from "@/components/NavBottom";
import { fetchQuestionnaireProgress } from "@/lib/questionnaireProgress";
import { LoadingScreen } from "@/components/LoadingScreen";

const SUPABASE_URL = "https://tomtximafvrhmuchjyqt.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbXR4aW1hZnZyaG11Y2hqeXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjE4MzYsImV4cCI6MjA4NzI5NzgzNn0.4e7TbCSrL8fecsgKCHDBEerXO8ePd5-5QeaC6czEkzo";

// Capitaliza primeira letra de cada palavra (ex: "bruno" → "Bruno", "maria-clara" → "Maria-clara")
function capitalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// LocalStorage keys pra onboardings
const ONBOARDING_CONTEXT_SEEN = "rdwth_onb_context_seen";
const ONBOARDING_THIRD_PARTY_SEEN = "rdwth_onb_thirdparty_seen";

// ─── OnboardingOverlay — tela cheia, primeira visita ──────────────
function OnboardingOverlay({ title, blocks, onClose }: {
  title: string;
  blocks: Array<{ label?: string; text: string | string[] }>;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "var(--r-bg)", zIndex: 100,
      display: "flex", flexDirection: "column",
      animation: "fadeIn 300ms ease",
    }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div className="r-scroll" style={{ padding: "60px 24px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.12em" }}>
          primeira visita
        </div>
        <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 22, lineHeight: 1.4, color: "var(--r-text)", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
          {title}
        </div>
        {blocks.map((b, i) => (
          <div key={i} style={{ borderLeft: "1px solid var(--r-ghost)", paddingLeft: 16, maxWidth: 600, marginLeft: "auto", marginRight: "auto", width: "100%" }}>
            {b.label && (
              <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 10, color: "var(--r-sub)", letterSpacing: "0.1em", marginBottom: 8 }}>
                {b.label}
              </div>
            )}
            {(Array.isArray(b.text) ? b.text : [b.text]).map((p, j) => (
              <div key={j} style={{ fontFamily: "var(--r-font-ed)", fontSize: 14, lineHeight: 1.7, color: "var(--r-text)", marginBottom: 8 }}>
                {p}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="r-line" />
      <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", flexShrink: 0 }}>
        <span onClick={onClose} style={{
          fontFamily: "var(--r-font-sys)", fontSize: 13, color: "var(--r-text)",
          cursor: "pointer", letterSpacing: "0.06em",
          padding: "8px 24px", border: "1px solid var(--r-text)",
        }}>
          entendi →
        </span>
      </div>
    </div>
  );
}

// ─── ContextSystem — "Como o rdwth funciona" ──────────────────────
export function ContextSystem({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1 as any));
  const ITEMS = [
    {
      label: "O que é isso",
      text: ["O rdwth mapeia padrões estruturais de como você organiza experiência. Não quem você é — como você organiza no momento."],
    },
    {
      label: "Leitura",
      text: ["Cada ciclo produz uma leitura estrutural baseada nas suas respostas. A leitura descreve padrões predominantes — não identidade, não diagnóstico, não direção."],
    },
    {
      label: "Ciclos",
      text: ["Um ciclo é um conjunto completo de respostas. Cada ciclo é independente. Com o tempo, padrões recorrentes ficam visíveis. A recorrência é observada, não prescrita."],
    },
    {
      label: "Natureza provisória",
      text: ["Uma única leitura é hipótese, não conclusão. Vai ficando mais legível ao longo do tempo."],
    },
    {
      label: "Por que linguagem, não números",
      text: ["Números não trazem clareza aqui — trazem ruído. A interface mostra linguagem porque padrões estruturais se leem melhor em palavras do que em pontuação."],
    },
    {
      label: "Reed",
      text: [
        "Reed traduz a saída estrutural em linguagem. Ele não improvisa — as respostas vêm da leitura estrutural do seu ciclo, não das suas respostas brutas.",
        "Ele usa uma biblioteca curada de obras de psicologia, filosofia e teoria organizacional. Ele não acessa a internet. Ele não gera opinião.",
      ],
    },
    {
      label: "Sem direção",
      text: ["O sistema não sugere o que você deve fazer com o que mostra. A leitura é sua. A interpretação é sua.",
      ],
    },
  ];

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">sistema</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.12em" }}>
          Como o rdwth funciona
        </div>

        {ITEMS.map(item => (
          <div key={item.label} style={{ borderLeft: "1px solid var(--r-ghost)", paddingLeft: 16 }}>
            <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 400, fontSize: 10, color: "var(--r-sub)", letterSpacing: "0.1em", marginBottom: 8 }}>
              {item.label}
            </div>
            {item.text.map((p, i) => (
              <div key={i} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-dim)", lineHeight: 1.7, letterSpacing: "0.03em", marginBottom: i < item.text.length - 1 ? 10 : 0 }}>
                {p}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={handleBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </div>
  );
}

// ─── ContextCycle — leitura salva ────────────────────────────────
function ContextCycle({ cycle, onBack, userName }: { cycle: CycleData; onBack: () => void; userName: string | null }) {
  const navigate = useNavigate();
  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">contexto · {cycle.id}</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.12em" }}>
          {cycle.id} — leitura salva
        </div>
        <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16, lineHeight: 1.7, color: "var(--r-text)" }}>
          {cycle.description}
        </div>
        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.5 }} />
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.7 }}>
          {userName
                ? `${userName}, esta é uma leitura estrutural de um momento. Não define quem você é.`
                : "Esta é uma leitura estrutural de um momento. Não define quem você é."}
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </div>
  );
}

// ─── ContextDeep — deep reading ──────────────────────────────────
function ContextDeep({ cycle, onBack, userName }: { cycle: CycleData; onBack: () => void; userName: string | null }) {
  const navigate = useNavigate();
  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">contexto · {cycle.id}</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 9, color: "var(--r-accent)", letterSpacing: "0.12em" }}>
          {cycle.id} — leitura profunda
        </div>
        <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16, lineHeight: 1.7, color: "var(--r-text)" }}>
          {cycle.deep}
        </div>
        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.5 }} />
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.7 }}>
          {userName
                ? `${userName}, esta é uma leitura estrutural de um momento. Não define quem você é.`
                : "Esta é uma leitura estrutural de um momento. Não define quem você é."}
        </div>
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </div>
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
function ContextThirdParty({ ipeCycleId, onBack, userName }: {
  ipeCycleId: string;
  onBack: () => void;
  userName: string | null;
}) {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<ThirdPartyInvite[]>([]);
  const [responses, setResponses] = useState<Record<string, ThirdPartyResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingScreenDone, setLoadingScreenDone] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedPronoun, setSelectedPronoun] = useState<"ela" | "ele" | "elu">("ela");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null); // invite_id expandido
  const [errorMsg, setErrorMsg] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}`, apikey: ANON_KEY };

      const invR = await fetch(
        `${SUPABASE_URL}/rest/v1/third_party_invites?ipe_cycle_id=eq.${ipeCycleId}&order=created_at.desc`,
        { headers }
      );
      const invs: ThirdPartyInvite[] = await invR.json();
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
        body: JSON.stringify({ ipe_cycle_id: ipeCycleId, user_pronoun: selectedPronoun }),
      });
      const d = await r.json();
      if (!r.ok) { setErrorMsg(d.error ?? "erro"); return; }
      setCreatedUrl(d.url);
      // Copia automaticamente
      try { await navigator.clipboard.writeText(d.url); } catch {}
      await loadAll();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "erro");
    }
  };

  const revokeInvite = async (inviteId: string) => {
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
    const url = `https://mvp-lucid.lovable.app/third-party/${token}`;
    try { await navigator.clipboard.writeText(url); } catch {}
  };

  const statusLabel = (s: string) =>
    s === "pending" ? "aguardando" :
    s === "submitted" ? "respondido" :
    s === "revoked" ? "cancelado" :
    s === "expired" ? "expirado" : s;

  const activeCount = invites.filter(i => i.status === "pending" || i.status === "submitted").length;
  const submittedCount = invites.filter(i => i.status === "submitted").length;

  if (!loadingScreenDone) {
    return <LoadingScreen
      phrases={["buscando perspectivas...", "organizando...", "pronto."]}
      loadComplete={!loading}
      onDone={() => setLoadingScreenDone(true)}
    />;
  }

  return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">contexto · terceiros</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />

      <div className="r-scroll" style={{ padding: "28px 24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.7 }}>
          {userName
            ? `${capitalizeName(userName)}, convide até 8 pessoas próximas que conhecem você. As respostas delas alimentam suas leituras com perspectiva externa.`
            : "Convide até 8 pessoas próximas. As respostas delas alimentam suas leituras com perspectiva externa."}
        </div>

        <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.4 }} />

        {/* Painel criar */}
        {!creating && activeCount < 8 && (
          <div onClick={() => { setCreating(true); setCreatedUrl(null); }}
            style={{
              fontFamily: "var(--r-font-sys)", fontSize: 13, padding: "12px 16px",
              background: "var(--r-text)", color: "var(--r-bg)",
              cursor: "pointer", textAlign: "center", letterSpacing: "0.04em",
              maxWidth: 400, marginLeft: "auto", marginRight: "auto", width: "100%",
            }}>
            + novo convite
          </div>
        )}

        {creating && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 16px", border: "1px solid var(--r-ghost)", maxWidth: 480, marginLeft: "auto", marginRight: "auto", width: "100%" }}>
            {!createdUrl && (
              <>
                <div className="r-sub">como você quer ser referida pelos terceiros?</div>
                <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                  {(["ela", "ele", "elu"] as const).map(p => (
                    <span key={p} onClick={() => setSelectedPronoun(p)}
                      style={{
                        fontFamily: "var(--r-font-sys)", fontSize: 13,
                        padding: "6px 14px", borderRadius: 4, cursor: "pointer",
                        border: selectedPronoun === p ? "1px solid var(--r-text)" : "1px solid var(--r-ghost)",
                        color: selectedPronoun === p ? "var(--r-text)" : "var(--r-muted)",
                      }}>
                      {p}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                  <span onClick={() => setCreating(false)} style={{ fontFamily: "var(--r-font-sys)", fontSize: 12, color: "var(--r-muted)", cursor: "pointer" }}>cancelar</span>
                  <span onClick={createInvite} style={{ fontFamily: "var(--r-font-sys)", fontSize: 12, color: "var(--r-text)", cursor: "pointer", letterSpacing: "0.04em" }}>gerar link →</span>
                </div>
                {errorMsg && <div style={{ color: "var(--terracota, #b85a3e)", fontSize: 12 }}>{errorMsg}</div>}
              </>
            )}
            {createdUrl && (
              <>
                <div className="r-sub">link gerado e copiado pra área de transferência:</div>
                <div style={{ fontFamily: "monospace", fontSize: 11, padding: 8, background: "var(--r-bg)", border: "1px dashed var(--r-ghost)", wordBreak: "break-all" }}>
                  {createdUrl}
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

        {activeCount >= 8 && !creating && (
          <div className="r-sub" style={{ textAlign: "center", fontStyle: "italic" }}>
            limite de 8 convites por ciclo atingido.
          </div>
        )}

        {/* Lista de invites */}
        {loading && <div className="r-sub" style={{ textAlign: "center" }}>carregando...</div>}

        {!loading && invites.length === 0 && (
          <div className="r-sub" style={{ textAlign: "center", padding: "20px 0" }}>
            nenhum convite ainda. clique em "novo convite" pra começar.
          </div>
        )}

        {!loading && invites.length > 0 && (
          <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-ghost)", letterSpacing: "0.12em", marginTop: 8 }}>
            {submittedCount} respondidos · {activeCount} ativos · {invites.length} no total
          </div>
        )}

        {!loading && (() => {
          const anonCount = invites.filter(i => i.status === "submitted" && i.reveal_identity === false).length;
          if (anonCount === 0) return null;
          return (
            <div style={{
              marginTop: 12,
              padding: "10px 12px",
              border: "0.5px solid var(--r-ghost)",
              borderLeft: "2px solid var(--r-ghost)",
              fontFamily: "var(--r-font-ed)",
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--r-muted)",
              fontStyle: "italic",
            }}>
              {anonCount === 1 ? "1 pessoa optou" : `${anonCount} pessoas optaram`} por anonimato. As respostas escritas não aparecem aqui, mas estão sendo lidas pelo sistema e participam da sua leitura profunda.
            </div>
          );
        })()}

        {!loading && invites.map(inv => {
          const VALID_QIDS = new Set(["calibration", "q1", "q2", "q3", "q4", "q5"]);
          const respList = (responses[inv.id] ?? []).filter(r => VALID_QIDS.has(r.question_id));
          const respCount = respList.length;
          const expectedTotal = 6; // calibration + 5 perguntas
          const showDetails = expanded === inv.id;
          const canShowResponses = inv.status === "submitted" && inv.reveal_identity === true;

          // Display do nome:
          // - submitted + reveal=true → nome capitalizado
          // - submitted + reveal=false → "respondeu sem se identificar"
          // - pending → "aguardando resposta"
          // - revoked → "—"
          const displayName =
            inv.status === "submitted"
              ? (inv.reveal_identity === true && inv.responder_name
                  ? capitalizeName(inv.responder_name)
                  : "respondeu sem se identificar")
              : inv.status === "pending"
                ? "convite aguardando"
                : "—";

          return (
            <div key={inv.id} style={{ borderTop: "1px solid var(--r-ghost)", paddingTop: 14, paddingBottom: 4 }}>
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
                  {respList.map(r => (
                    <div key={r.question_id} style={{ marginBottom: 12, fontFamily: "var(--r-font-sys)", fontSize: 11, color: "var(--r-text)" }}>
                      <div style={{ color: "var(--r-muted)", letterSpacing: "0.06em", marginBottom: 4 }}>
                        {r.question_id}
                        {r.scale_value !== null && ` · escala: ${r.scale_value}/5`}
                      </div>
                      {r.episode_text && <div style={{ marginBottom: 4, lineHeight: 1.5 }}>{r.episode_text}</div>}
                      {r.open_text && <div style={{ fontStyle: "italic", color: "var(--r-muted)" }}>{r.open_text}</div>}
                    </div>
                  ))}
                  {/* W20.5b: mini-insight do terceiro NÃO aparece pro user — é só do terceiro */}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="r-line" />
      <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
      </div>
    </div>
  );
}

// ─── Context principal ────────────────────────────────────────────
export default function Context() {
  const navigate = useNavigate();
  const userName = useUserName();
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showDeep, setShowDeep] = useState(false);
  const [showCycle, setShowCycle] = useState(false);
  const [showThirdParty, setShowThirdParty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingScreenDone, setLoadingScreenDone] = useState(false);
  const [showOnbContext, setShowOnbContext] = useState(false);
  const [showOnbThirdParty, setShowOnbThirdParty] = useState(false);

  // Onboarding /contexto: primeira visita ao /context
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_CONTEXT_SEEN)) {
        setShowOnbContext(true);
      }
    } catch {}
  }, []);

  const dismissOnbContext = () => {
    try { localStorage.setItem(ONBOARDING_CONTEXT_SEEN, "true"); } catch {}
    setShowOnbContext(false);
  };

  // Click em "terceiros": abre onboarding na primeira vez, depois vai direto
  const handleOpenThirdParty = () => {
    try {
      if (!localStorage.getItem(ONBOARDING_THIRD_PARTY_SEEN)) {
        setShowOnbThirdParty(true);
        return;
      }
    } catch {}
    setShowThirdParty(true);
  };

  const dismissOnbThirdParty = () => {
    try { localStorage.setItem(ONBOARDING_THIRD_PARTY_SEEN, "true"); } catch {}
    setShowOnbThirdParty(false);
    setShowThirdParty(true);
  };

  useEffect(() => { loadCycles(); }, []);

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

      if (!ipeCycles || ipeCycles.length === 0) { setLoading(false); return; }

      // Wave 14 — apenas deep_reading_text (incremental). Sem fallback pra cycles.llm_response
      // (esse legado tinha invenções/diagnósticos). Sem texto = mensagem de pending.
      const cycleData: CycleData[] = await Promise.all(ipeCycles.map(async (ipe: any) => {
        const text: string = ipe.deep_reading_text ?? "";
        const paragraphs = text.split("\n\n").filter(Boolean);
        const hasPending = !text;
        const progress = await fetchQuestionnaireProgress(ipe.id);
        const description = hasPending
          ? "A leitura aparece conforme você responde — pills e questionário alimentam ela."
          : paragraphs.slice(0, 2).join("\n\n");
        const deep = hasPending
          ? "Esta leitura se constrói conforme você fala. Responda uma pill ou um bloco do questionário pra ela aparecer aqui."
          : text;
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

  // Onboardings (overlays primeira-visita)
  if (showOnbContext) {
    return <OnboardingOverlay
      onClose={dismissOnbContext}
      title={userName ? `${capitalizeName(userName)}, este é o seu Contexto.` : "Este é o seu Contexto."}
      blocks={[
        {
          label: "o que você encontra aqui",
          text: "Cada ciclo do rdwth produz uma leitura estrutural — um retrato dos padrões que aparecem no que você compartilha. Aqui você acessa essa leitura, navega entre ciclos passados e vê como as coisas se desenham ao longo do tempo.",
        },
        {
          label: "ciclos",
          text: "Um ciclo é um conjunto completo de respostas — pills, questionário e perspectivas de pessoas próximas. Cada ciclo gera sua própria leitura. O sistema amadurece com você ao longo deles.",
        },
        {
          label: "terceiros",
          text: "Você também pode convidar pessoas próximas pra responder um questionário curto sobre como veem você. A perspectiva externa traz coisas que de dentro ficam invisíveis.",
        },
        {
          label: "leitura profunda",
          text: "A leitura se constrói conforme você responde. Não é diagnóstico, não é prescrição. É devolução estruturada do que você compartilhou.",
        },
      ]}
    />;
  }
  if (showOnbThirdParty) {
    return <OnboardingOverlay
      onClose={dismissOnbThirdParty}
      title="Sobre o questionário de pessoas próximas"
      blocks={[
        {
          label: "por que isso importa",
          text: "A forma como alguém de fora observa traz dados que você sozinho não enxerga. O rdwth integra essas perspectivas à sua leitura estrutural, principalmente em dimensões internas onde o olhar externo é fundamental.",
        },
        {
          label: "como funciona",
          text: "Você gera um link único por convite e envia para quem você quiser (5-10 minutos pra responder). A pessoa responde 5 perguntas curtas, e ajuda o sistema a enxergar padrões antes invisíveis.",
        },
        {
          label: "primeiro ciclo: opcional",
          text: "No seu primeiro ciclo, você pode fechar a leitura só com suas respostas. Convidar terceiros é encorajado, mas não obrigatório.",
        },
        {
          label: "a partir do segundo ciclo: necessário",
          text: "Pra fechar ciclos seguintes (2 em diante), você precisará de pelo menos 2 perspectivas externas. Isso é parte do amadurecimento da leitura — quanto mais entradas, mais nuance.",
        },
        {
          label: "limite",
          text: "Você pode convidar até 8 pessoas por ciclo. Anonimato é decisão do terceiro: ele escolhe se você enxerga as respostas e quem respondeu.",
        },
        {
          label: "um ato de coragem",
          text: "Pedir que alguém te descreva é um ato de coragem — não há como fazer isso sem se expor um pouco. E é justo aí que algo se abre: a perspectiva interna não consegue ocupar dois lugares ao mesmo tempo, então o que escolhemos esconder de nós mesmos costuma ser exatamente o que um outro olhar entrega de volta sem peso.",
        },
      ]}
    />;
  }

  // Loading inicial — overlay com identidade rdwth (mostra enquanto carrega
  // E também durante phase 3 + fade out, controlado por loadingScreenDone)
  if (!loadingScreenDone) {
    return <LoadingScreen
      phrases={["buscando seu ciclo...", "compondo a leitura...", "pronto."]}
      loadComplete={!loading}
      onDone={() => setLoadingScreenDone(true)}
    />;
  }

  // Subviews
  if (showDeep && cycles[selectedIdx]) return <ContextDeep cycle={cycles[selectedIdx]} onBack={() => setShowDeep(false)} userName={userName} />;
  if (showCycle && cycles[selectedIdx]) return <ContextCycle cycle={cycles[selectedIdx]} onBack={() => setShowCycle(false)} userName={userName} />;
  if (showThirdParty && cycles[selectedIdx]) {
    // Pega ipe_cycle_id real (CycleData.id é tipo "C1"; precisa do uuid).
    // ipeCyclesRef guardado em closure: vamos buscar de novo.
    return <ContextThirdParty
      ipeCycleId={cycles[selectedIdx].ipeCycleId}
      onBack={() => setShowThirdParty(false)}
      userName={userName}
    />;
  }

  // Empty state
  if (!loading && cycles.length === 0) return (
    <div className="r-screen">
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">contexto</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px 40px" }}>
        <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-ghost)", letterSpacing: "0.06em", lineHeight: 1.8 }}>
          Nenhuma leitura ainda.<br />Complete um questionário pra começar.
        </div>
      </div>
      <NavBottom active="context" />
    </div>
  );

  const cycle = cycles[selectedIdx];

  return (
    <div className="r-screen">

      {/* Header */}
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">contexto</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
      {cycle && (
        <div style={{ padding: "10px 24px 0", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-muted)", letterSpacing: "0.04em" }}>
            {cycle.questionnaireRemaining} de 16 perguntas restantes do questionário
          </span>
        </div>
      )}

      {/* Conteúdo principal */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 16px", overflow: "hidden" }}>

        {/* TOP — leitura atual */}
        {cycle && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 10, color: "var(--r-muted)", letterSpacing: "0.04em", lineHeight: 1.6, marginBottom: 14 }}>
              {userName
                ? `${userName}, esta é uma leitura estrutural de um momento. Não define quem você é.`
                : "Esta é uma leitura estrutural de um momento. Não define quem você é."}
            </div>
            <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.4, marginBottom: 14 }} />

            {/* Descrição — scroll interno */}
            <div style={{ overflowY: "auto", maxHeight: 120, marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 14, lineHeight: 1.65, color: "var(--r-text)" }}>
                {cycle.description}
              </div>
            </div>

            {/* Deep reading */}
            <div
              onClick={() => setShowDeep(true)}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            >
              <div style={{ width: 1, height: 12, background: "var(--r-accent)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-sub)", letterSpacing: "0.06em" }}>
                leitura profunda
              </span>
            </div>
          </div>
        )}

        {/* MIDDLE — respiro */}
        <div style={{ flex: 1 }} />

        {/* BOTTOM */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.4, marginBottom: 16 }} />

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
                    onClick={() => { setSelectedIdx(i); }}
                    style={{
                      fontFamily: "var(--r-font-sys)",
                      fontWeight: selectedIdx === i ? 400 : 300,
                      fontSize: 11,
                      color: selectedIdx === i ? "var(--r-accent)" : "var(--r-sub)",
                      letterSpacing: "0.06em",
                      borderBottom: selectedIdx === i ? "1px solid var(--r-accent)" : "1px solid transparent",
                      paddingBottom: 2,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {c.id}
                  </span>
                ))}
              </div>

              {/* Terceiros */}
              <div
                onClick={handleOpenThirdParty}
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              >
                <div style={{ width: 1, height: 12, background: "var(--r-ghost)", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--r-font-sys)", fontWeight: 300, fontSize: 11, color: "var(--r-muted)", letterSpacing: "0.06em" }}>
                  terceiros
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <NavBottom active="context" />
    </div>
  );
}
