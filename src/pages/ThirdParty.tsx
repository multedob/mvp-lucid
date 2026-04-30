// src/pages/ThirdParty.tsx
// ============================================================
// W20.2 — Página pública pra terceiros responderem questionário sobre o user.
// Sem auth do app. Acessada via link único: /third-party/:token
//
// Fases:
//   loading → onboarding → email → calibration → q1..q6 → reveal → finalizing → done → error
//
// Save incremental a cada Continue (chama submit-response).
// Ao finalizar: chama finalize → recebe mini-insight → mostra com CTA pro rdwth.
// ============================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToday } from "@/lib/api";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";

// LP do rdwth — atualizar quando estiver pronta
const RDWTH_LP_URL = "/";

// Capitaliza primeira letra de cada palavra (ex: "bruno" → "Bruno")
function capitalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

type Phase =
  | "loading"
  | "error"
  | "revoked"
  | "submitted"
  | "onboarding"
  | "email"
  | "calibration"
  | "question"
  | "reveal"
  | "finalizing"
  | "done";

interface CoreQuestion {
  id: string;
  type: "core";
  lines: string[];
  stem: string;
  episode_prompt: string;
  scale_label: string;
  scale_min_label: string;
  scale_max_label: string;
  open_prompt: string;
}

interface CalibrationQuestion {
  id: "calibration";
  type: "calibration";
  title: string;
  relationship_options: string[];
  duration_options: string[];
}

type Question = CoreQuestion | CalibrationQuestion;

interface ExistingResponse {
  question_id: string;
  scale_value: number | null;
  open_text: string | null;
  episode_text: string | null;
}

interface ValidateResponse {
  valid: boolean;
  invite_id: string;
  user_name: string;
  user_pronoun?: "ela" | "ele" | "elu";
  question_set?: "alpha" | "beta";
  questions: Question[];
  existing_responses: ExistingResponse[];
  responder?: { email: string | null; name: string | null };
}

const SUPABASE_URL = "https://tomtximafvrhmuchjyqt.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbXR4aW1hZnZyaG11Y2hqeXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjE4MzYsImV4cCI6MjA4NzI5NzgzNn0.4e7TbCSrL8fecsgKCHDBEerXO8ePd5-5QeaC6czEkzo";

function callEdge(path: string, body: unknown) {
  return fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  });
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function ThirdParty() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState<ValidateResponse | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [calibRelationship, setCalibRelationship] = useState("");
  const [calibDuration, setCalibDuration] = useState("");

  // Per-question state (keyed by question id)
  const [scales, setScales] = useState<Record<string, number | null>>({});
  const [opens, setOpens] = useState<Record<string, string>>({});
  const [episodes, setEpisodes] = useState<Record<string, string>>({});

  // Navigation through questions
  const [currentQIdx, setCurrentQIdx] = useState(0); // 0 = q1, 1 = q2, ... 5 = q6
  const [revealIdentity, setRevealIdentity] = useState<boolean | null>(null);
  const [miniInsight, setMiniInsight] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finalizeLoadingDone, setFinalizeLoadingDone] = useState(false);

  const validatedRef = useRef(false);

  // ─── Validate link on mount ────────────────────────────────
  useEffect(() => {
    if (validatedRef.current || !token) return;
    validatedRef.current = true;

    (async () => {
      try {
        const res: ValidateResponse = await callEdge("third-party-validate-link", { token });
        setData(res);
        // Pré-popula state se houver respostas anteriores
        if (res.responder?.email) setEmail(res.responder.email);
        if (res.responder?.name) setName(res.responder.name);
        const initScales: Record<string, number | null> = {};
        const initOpens: Record<string, string> = {};
        const initEps: Record<string, string> = {};
        for (const r of res.existing_responses) {
          initScales[r.question_id] = r.scale_value;
          initOpens[r.question_id] = r.open_text ?? "";
          initEps[r.question_id] = r.episode_text ?? "";
        }
        setScales(initScales);
        setOpens(initOpens);
        setEpisodes(initEps);
        // Calibration parsing
        if (initOpens["calibration"]) {
          const parts = initOpens["calibration"].split(" — ");
          setCalibRelationship(parts[0] ?? "");
          setCalibDuration(parts[1] ?? "");
        }
        setPhase(res.responder?.email ? "calibration" : "onboarding");
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (msg.includes("revoked")) setPhase("revoked");
        else if (msg.includes("submitted")) setPhase("submitted");
        else { setErrorMsg(msg); setPhase("error"); }
      }
    })();
  }, [token]);

  // ─── Helpers ────────────────────────────────────────────────
  const coreQuestions = useMemo(
    () => (data?.questions.filter((q) => q.type === "core") as CoreQuestion[]) ?? [],
    [data]
  );
  const currentQ = coreQuestions[currentQIdx];
  const isLastQuestion = currentQIdx >= coreQuestions.length - 1;

  const submitOne = async (qid: string, payload: Record<string, unknown>) => {
    if (!token) return;
    await callEdge("third-party-submit-response", { token, question_id: qid, ...payload });
  };

  // ─── Phase handlers ─────────────────────────────────────────
  const handleStartOnboarding = () => setPhase("email");

  const handleSubmitEmail = async () => {
    if (!isValidEmail(email)) { setErrorMsg("email inválido"); return; }
    if (!name.trim()) { setErrorMsg("escreva seu nome"); return; }
    setErrorMsg("");
    setSubmitting(true);
    try {
      // Save responder info no primeiro UPSERT (manda calibration vazia só pra registrar email)
      await submitOne("__contact__", { responder_email: email.trim(), responder_name: name.trim() });
      setPhase("calibration");
    } catch (err: any) {
      // Se backend não aceitar question_id "__contact__", ignora — vai gravar no calibration depois
      setPhase("calibration");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCalibration = async () => {
    if (!calibRelationship || !calibDuration) { setErrorMsg("escolha relacionamento e tempo"); return; }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await submitOne("calibration", {
        open_text: `${calibRelationship} — ${calibDuration}`,
        responder_email: email.trim(),
        responder_name: name.trim(),
      });
      setPhase("question");
      setCurrentQIdx(0);
    } catch (err: any) { setErrorMsg(err?.message ?? "erro ao salvar"); }
    finally { setSubmitting(false); }
  };

  const handleSubmitQuestion = async () => {
    if (!currentQ) return;
    const qid = currentQ.id;
    const scale = scales[qid];
    const ep = (episodes[qid] ?? "").trim();
    const op = (opens[qid] ?? "").trim();
    if (scale === null || scale === undefined) { setErrorMsg("escolha um valor na escala"); return; }
    if (ep.length < 30) { setErrorMsg("conta um pouco mais sobre a situação (mínimo 30 caracteres)"); return; }
    if (op.length < 5) { setErrorMsg("escreva uma frase no campo aberto"); return; }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await submitOne(qid, { scale_value: scale, episode_text: ep, open_text: op });
      if (isLastQuestion) setPhase("reveal");
      else setCurrentQIdx((i) => i + 1);
    } catch (err: any) { setErrorMsg(err?.message ?? "erro ao salvar"); }
    finally { setSubmitting(false); }
  };

  const handleBack = () => {
    setErrorMsg("");
    if (phase === "question" && currentQIdx > 0) { setCurrentQIdx((i) => i - 1); return; }
    if (phase === "question" && currentQIdx === 0) { setPhase("calibration"); return; }
    if (phase === "calibration") { setPhase("email"); return; }
    if (phase === "email") { setPhase("onboarding"); return; }
    if (phase === "reveal") { setCurrentQIdx(coreQuestions.length - 1); setPhase("question"); return; }
  };

  const handleFinalize = async () => {
    if (revealIdentity === null) { setErrorMsg("escolha uma opção"); return; }
    setErrorMsg("");
    setPhase("finalizing");
    try {
      const res = await callEdge("third-party-finalize", { token, reveal_identity: revealIdentity });
      setMiniInsight(res.insight_text || "obrigado pelo tempo.");
      setPhase("done");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "erro ao finalizar");
      setPhase("reveal"); // volta pra reveal
    }
  };

  // ─── RENDER ────────────────────────────────────────────────

  // Wordmark estático rdwth (reusa estilo do app, sem underscore)
  const Wordmark = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 0, lineHeight: 1 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 24, color: "var(--r-text)", letterSpacing: "-0.02em" }}>
        rdwth
      </span>
    </div>
  );

  if (phase === "loading") {
    return (
      <div className="r-screen" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="r-pulse" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="r-screen" style={{ padding: "60px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Wordmark />
        <div className="r-question">link inválido ou expirado.</div>
        <div className="r-sub">{errorMsg}</div>
      </div>
    );
  }

  if (phase === "revoked") {
    return (
      <div className="r-screen" style={{ padding: "60px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Wordmark />
        <div className="r-question">este link foi cancelado.</div>
        <div className="r-sub">peça pra {capitalizeName(data?.user_name) ?? "quem te enviou"} gerar um novo.</div>
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div className="r-screen" style={{ padding: "60px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <Wordmark />
        <div className="r-question">você já respondeu este questionário.</div>
        <div className="r-sub">obrigado.</div>
      </div>
    );
  }

  // Header reusable
  const Header = ({ subtitle }: { subtitle?: string }) => (
    <>
      <div className="r-header">
        <span className="r-header-label" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>rdwth</span>
        <span className="r-header-section">{subtitle || "convite"}</span>
        <span className="r-header-date">{getToday()}</span>
      </div>
      <div className="r-line" />
    </>
  );

  // Footer reusable (back + continue)
  const Footer = ({
    onContinue,
    continueLabel = "continuar",
    onBack,
    disabled = false,
  }: {
    onContinue?: () => void;
    continueLabel?: string;
    onBack?: () => void;
    disabled?: boolean;
  }) => (
    <>
      <div className="r-line" />
      <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 24px", gap: 16, flexShrink: 0 }}>
        {onBack && (
          <span onClick={onBack} style={{ fontFamily: "var(--r-font-sys)", fontSize: 13, color: "var(--r-muted)", cursor: "pointer" }}>‹</span>
        )}
        {onContinue && (
          <span
            onClick={!disabled && !submitting ? onContinue : undefined}
            style={{
              marginLeft: "auto",
              fontFamily: "var(--r-font-sys)", fontSize: 13,
              color: disabled || submitting ? "var(--r-ghost)" : "var(--r-text)",
              cursor: disabled || submitting ? "default" : "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {submitting ? "..." : continueLabel}
          </span>
        )}
      </div>
    </>
  );

  const ResponseInput = ({
    value,
    onChange,
    placeholder,
    minLength,
    onSend,
    recorder,
    minHeight,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    minLength: number;
    onSend: () => void;
    recorder?: ReactNode;
    minHeight?: number;
  }) => {
    const active = value.trim().length >= minLength && !submitting;
    return (
      <div className="r-input-wrap" style={minHeight ? { alignItems: "flex-end" } : undefined}>
        <AutoResizeTextarea
          className="r-textarea"
          style={minHeight ? { minHeight } : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend();
          }}
          placeholder={placeholder}
          rows={1}
          maxRows={5}
        />
        {recorder}
        <button
          type="button"
          className={`r-send-dot${active ? " active" : ""}`}
          onClick={active ? onSend : undefined}
          disabled={!active}
          aria-label="enviar"
          style={{ cursor: active ? "pointer" : "default" }}
        />
      </div>
    );
  };

  // ─── ONBOARDING ───────────────────────────────────────────
  if (phase === "onboarding") {
    return (
      <div className="r-screen">
        <Header />
        <div className="r-scroll" style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="r-question" style={{ fontSize: 18 }}>
            {(() => {
              const p = data?.user_pronoun ?? "ela";
              const direct = p === "ela" ? "a vê" : p === "ele" ? "o vê" : `vê ${capitalizeName(data?.user_name)}`;
              return `${capitalizeName(data?.user_name)} te pediu pra responder algumas perguntas sobre como você ${direct}.`;
            })()}
          </div>
          <div style={{ fontFamily: "var(--r-font-ed)", fontSize: 14, lineHeight: 1.75, color: "var(--r-text)", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            O <strong>rdwth</strong> é uma ferramenta de auto-conhecimento estrutural. Ajuda a pessoa a observar padrões de como ela organiza experiência — não é diagnóstico, não é coach, não prescreve nada. É uma leitura.
          </div>
          <div style={{ fontFamily: "var(--r-font-ed)", fontSize: 14, lineHeight: 1.75, color: "var(--r-text)", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            Pessoas próximas veem coisas que a própria pessoa não consegue ver. Sua perspectiva externa é parte importante dessa leitura.
          </div>
          <div className="r-sub" style={{ marginTop: 8 }}>
            <strong>Sobre anonimato:</strong> ao final você escolhe se {capitalizeName(data?.user_name)} pode ver suas respostas com seu nome, ou se prefere ficar anônimo/a — nesse caso, suas palavras não aparecem para {capitalizeName(data?.user_name)}, mas continuam sendo lidas pelo sistema na composição da leitura profunda.
          </div>
          <div className="r-sub">
            <strong>Tempo:</strong> ~10 minutos. 5 perguntas curtas. Não tem resposta certa.
          </div>
          <div style={{ fontFamily: "var(--r-font-ed)", fontSize: 13, fontStyle: "italic", lineHeight: 1.7, color: "var(--r-muted)", maxWidth: 600, marginLeft: "auto", marginRight: "auto", marginTop: 16, paddingTop: 16, borderTop: "0.5px solid var(--r-ghost)" }}>
            Sugestão: procure um lugar com calma pra responder. Sua atenção pelos próximos minutos é parte do presente que você vai dar para {capitalizeName(data?.user_name)}.
          </div>
        </div>
        <Footer onContinue={handleStartOnboarding} continueLabel="começar" />
      </div>
    );
  }

  // ─── EMAIL + NOME ─────────────────────────────────────────
  if (phase === "email") {
    return (
      <div className="r-screen">
        <Header />
        <div className="r-scroll" style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="r-question">como você se chama?</div>
          <div className="r-input-wrap">
            <input
              type="text"
              className="r-textarea"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="seu nome"
              autoFocus
            />
          </div>
          <div className="r-question" style={{ marginTop: 16 }}>seu email</div>
          <div className="r-input-wrap">
            <input
              type="email"
              className="r-textarea"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="r-sub">usado pra confirmar sua resposta. {capitalizeName(data?.user_name)} só verá se você decidir revelar no final.</div>
          {errorMsg && <div style={{ color: "var(--terracota, #b85a3e)", fontSize: 13 }}>{errorMsg}</div>}
        </div>
        <Footer onContinue={handleSubmitEmail} onBack={handleBack} disabled={!isValidEmail(email) || !name.trim()} />
      </div>
    );
  }

  // ─── CALIBRATION ──────────────────────────────────────────
  if (phase === "calibration") {
    const calib = data?.questions.find((q) => q.id === "calibration") as CalibrationQuestion | undefined;
    if (!calib) return null;
    return (
      <div className="r-screen">
        <Header subtitle={`sobre ${capitalizeName(data?.user_name)}`} />
        <div className="r-scroll" style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="r-question" style={{ textAlign: "center" }}>{calib.title.replace("[Nome]", capitalizeName(data?.user_name) ?? "")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, marginLeft: "auto", marginRight: "auto", width: "100%", alignItems: "flex-start" }}>
            {calib.relationship_options.map((opt) => (
              <div key={opt} className="r-choice" style={{ cursor: "pointer", alignSelf: "stretch", justifyContent: "flex-start" }} onClick={() => setCalibRelationship(opt)}>
                <span className={`r-choice-dot${calibRelationship === opt ? " selected" : ""}`} />
                <span className={`r-choice-text${calibRelationship === opt ? " selected" : ""}`}>{opt}</span>
              </div>
            ))}
          </div>
          <div className="r-question" style={{ marginTop: 20, textAlign: "center" }}>há quanto tempo conhece?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, marginLeft: "auto", marginRight: "auto", width: "100%", alignItems: "flex-start" }}>
            {calib.duration_options.map((opt) => (
              <div key={opt} className="r-choice" style={{ cursor: "pointer", alignSelf: "stretch", justifyContent: "flex-start" }} onClick={() => setCalibDuration(opt)}>
                <span className={`r-choice-dot${calibDuration === opt ? " selected" : ""}`} />
                <span className={`r-choice-text${calibDuration === opt ? " selected" : ""}`}>{opt}</span>
              </div>
            ))}
          </div>
          {errorMsg && <div style={{ color: "var(--terracota, #b85a3e)", fontSize: 13 }}>{errorMsg}</div>}
        </div>
        <Footer onContinue={handleSubmitCalibration} onBack={handleBack} disabled={!calibRelationship || !calibDuration} />
      </div>
    );
  }

  // ─── QUESTION (q1..q6) ────────────────────────────────────
  if (phase === "question" && currentQ) {
    const qid = currentQ.id;
    const pronoun = data?.user_pronoun ?? "ela";
    const adjEnd = pronoun === "ela" ? "a" : pronoun === "ele" ? "o" : "e";
    const replaceName = (s: string) => s
      .replace(/\[Nome\]/g, capitalizeName(data?.user_name) ?? "")
      .replace(/\[pronome\]/g, pronoun)
      .replace(/@/g, adjEnd);
    return (
      <div className="r-screen">
        <Header subtitle={`pergunta ${currentQIdx + 1} de ${coreQuestions.length}`} />
        <div className="r-scroll" style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="r-sub" style={{ fontStyle: "italic" }}>{replaceName(currentQ.stem)}</div>
          <div className="r-question">{replaceName(currentQ.episode_prompt)}</div>
          <ResponseInput
            value={episodes[qid] ?? ""}
            onChange={(value) => setEpisodes((prev) => ({ ...prev, [qid]: value }))}
            placeholder="conta a situação aqui (mínimo 30 caracteres)"
            minLength={30}
            minHeight={80}
            onSend={handleSubmitQuestion}
            recorder={data?.invite_id ? (
              <AudioRecorder
                userId={data.invite_id}
                cycleId={token ?? "third-party"}
                pillId={qid}
                moment="third-party"
                language="pt-BR"
                onLiveTranscript={text => setEpisodes((prev) => ({ ...prev, [qid]: text }))}
                onFinalTranscript={text => setEpisodes((prev) => ({ ...prev, [qid]: text }))}
                disabled={submitting}
              />
            ) : undefined}
          />
          <div className="r-sub" style={{ marginTop: 16 }}>{replaceName(currentQ.scale_label)}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0", maxWidth: 600, marginLeft: "auto", marginRight: "auto", width: "100%" }}>
            <div style={{ display: "flex", gap: 16, padding: "8px 0" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  onClick={() => setScales((prev) => ({ ...prev, [qid]: n }))}
                  className={`r-choice-dot${scales[qid] === n ? " selected" : ""}`}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "0 4px", gap: 24 }}>
              <span className="r-sub" style={{ fontSize: 11, flex: 1, textAlign: "left" }}>{replaceName(currentQ.scale_min_label)}</span>
              <span className="r-sub" style={{ fontSize: 11, flex: 1, textAlign: "right" }}>{replaceName(currentQ.scale_max_label)}</span>
            </div>
          </div>

          <div className="r-sub" style={{ marginTop: 16 }}>{replaceName(currentQ.open_prompt)}</div>
          <ResponseInput
            value={opens[qid] ?? ""}
            onChange={(value) => setOpens((prev) => ({ ...prev, [qid]: value }))}
            placeholder="uma frase"
            minLength={5}
            onSend={handleSubmitQuestion}
            recorder={data?.invite_id ? (
              <AudioRecorder
                userId={data.invite_id}
                cycleId={token ?? "third-party"}
                pillId={`${qid}_open`}
                moment="third-party"
                language="pt-BR"
                onLiveTranscript={text => setOpens((prev) => ({ ...prev, [qid]: text }))}
                onFinalTranscript={text => setOpens((prev) => ({ ...prev, [qid]: text }))}
                disabled={submitting}
              />
            ) : undefined}
          />

          {errorMsg && <div style={{ color: "var(--terracota, #b85a3e)", fontSize: 13 }}>{errorMsg}</div>}
        </div>
        <Footer onBack={handleBack} />
      </div>
    );
  }

  // ─── REVEAL (anonimato) ───────────────────────────────────
  if (phase === "reveal") {
    return (
      <div className="r-screen">
        <Header subtitle="último passo" />
        <div className="r-scroll" style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="r-question">
            suas respostas vão ajudar {capitalizeName(data?.user_name)} a se ver com mais clareza.
          </div>
          <div style={{ fontFamily: "var(--r-font-ed)", fontSize: 14, lineHeight: 1.75, color: "var(--r-text)", maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            Como você quer que sua contribuição apareça?
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600, marginLeft: "auto", marginRight: "auto", width: "100%", marginTop: 8 }}>
            <div className="r-choice" style={{ cursor: "pointer", flexDirection: "column", alignItems: "flex-start", gap: 6 }} onClick={() => setRevealIdentity(true)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`r-choice-dot${revealIdentity === true ? " selected" : ""}`} />
                <span className={`r-choice-text${revealIdentity === true ? " selected" : ""}`}>
                  pode dizer que fui eu — {name || "[seu nome]"}
                </span>
              </div>
              <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 11, color: "var(--r-muted)", lineHeight: 1.5, paddingLeft: 22 }}>
                {capitalizeName(data?.user_name)} verá seu nome e suas respostas escritas no painel.
              </div>
            </div>
            <div className="r-choice" style={{ cursor: "pointer", flexDirection: "column", alignItems: "flex-start", gap: 6 }} onClick={() => setRevealIdentity(false)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`r-choice-dot${revealIdentity === false ? " selected" : ""}`} />
                <span className={`r-choice-text${revealIdentity === false ? " selected" : ""}`}>
                  prefiro anônimo
                </span>
              </div>
              <div style={{ fontFamily: "var(--r-font-sys)", fontSize: 11, color: "var(--r-muted)", lineHeight: 1.5, paddingLeft: 22 }}>
                {capitalizeName(data?.user_name)} não verá seu nome nem suas respostas escritas. Suas palavras continuam sendo lidas pelo sistema e participam da leitura profunda — só não aparecem no painel dele/dela.
              </div>
            </div>
          </div>

          {errorMsg && <div style={{ color: "var(--terracota, #b85a3e)", fontSize: 13 }}>{errorMsg}</div>}
        </div>
        <Footer onContinue={handleFinalize} onBack={handleBack} continueLabel="enviar" disabled={revealIdentity === null} />
      </div>
    );
  }

  // ─── FINALIZING ───────────────────────────────────────────
  if (phase === "finalizing" || (phase === "done" && !finalizeLoadingDone)) {
    return (
      <LoadingScreen
        phrases={[
          "lendo o que você trouxe...",
          "enxergando o que tem por trás...",
          "pronto.",
        ]}
        loadComplete={phase === "done"}
        onDone={() => setFinalizeLoadingDone(true)}
      />
    );
  }

  // ─── DONE — mini-insight + CTA ────────────────────────────
  if (phase === "done") {
    return (
      <div className="r-screen">
        <div className="r-scroll" style={{ padding: "40px 24px 24px", display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Wordmark animado no topo. Altura fixa pra texto abaixo não saltitar com mudança de fonte. */}
          <div style={{ marginTop: 16, marginBottom: 8, height: "clamp(48px, 9vw, 88px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AnimatedWordmark fontSize="clamp(32px, 7vw, 64px)" />
          </div>

          <div className="r-sub" style={{ letterSpacing: "0.12em", textAlign: "center", marginTop: 8 }}>um pequeno espelho pra você</div>

          <div style={{ fontFamily: "var(--r-font-ed)", fontWeight: 800, fontSize: 16, lineHeight: 1.75, color: "var(--r-text)", maxWidth: 600, marginLeft: "auto", marginRight: "auto", whiteSpace: "pre-line" }}>
            {miniInsight}
          </div>

          <div style={{ height: 1, background: "var(--r-ghost)", opacity: 0.4, marginTop: 24, marginBottom: 8, maxWidth: 600, marginLeft: "auto", marginRight: "auto", width: "100%" }} />

          <div style={{ fontFamily: "var(--r-font-ed)", fontSize: 14, lineHeight: 1.75, color: "var(--r-text)", maxWidth: 600, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
            Obrigado pelo seu tempo. O que você trouxe vai ajudar {capitalizeName(data?.user_name)}.
          </div>
          <div style={{ fontFamily: "var(--r-font-ed)", fontSize: 14, lineHeight: 1.75, color: "var(--r-text)", maxWidth: 600, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
            Se quiser olhar isso de outro lado — sobre você dessa vez — o rdwth está aqui.
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
            <a
              href={RDWTH_LP_URL}
              style={{
                fontFamily: "var(--r-font-sys)", fontSize: 13,
                padding: "12px 24px",
                background: "var(--r-text)", color: "var(--r-bg)",
                border: "none", cursor: "pointer", letterSpacing: "0.06em",
                textDecoration: "none",
              }}
            >
              conhecer o rdwth →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
