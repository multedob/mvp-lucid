// supabase/functions/third-party-validate-link/index.ts
// ============================================================
// W20.1 — Página pública chama com token. Valida e retorna:
//  - nome do user dono do convite
//  - perguntas (hardcoded por enquanto, pode ir pra DB depois)
//  - status atual do convite (pra retomar de onde parou)
//  - respostas parciais já salvas (se houver)
//
// SEM AUTH (terceiro não tem conta no app).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.1-validate-link-v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

// Perguntas v2 — hardcoded pra MVP. Pode migrar pra tabela depois.
const QUESTIONS = [
  {
    id: "calibration",
    type: "calibration",
    title: "Como você conhece [Nome]?",
    relationship_options: [
      "Família próxima (pai/mãe/irmã/parceiro)",
      "Amigo/a próximo/a (anos de convivência)",
      "Colega de trabalho (atual ou recente)",
      "Mentor/a, gestor/a, ou orientador/a",
      "Cliente, sócio/a, ou parceiro de projeto",
      "Outra",
    ],
    duration_options: [
      "Menos de 1 ano",
      "1 a 5 anos",
      "Mais de 5 anos",
    ],
  },
  {
    id: "q1",
    type: "core",
    lines: ["L1.1", "L1.2"],
    stem: "Pensando em [Nome] em momentos onde algo importante estava em jogo —",
    episode_prompt: "Lembre uma situação em que você viu [Nome] sob pressão real — quando algo precisava ser feito mesmo sem condições ideais. O que ela fez? E o que parecia estar organizando a ação dela ali?",
    scale_label: "No que você viu, [Nome] tem clareza sobre o que a orienta sob pressão.",
    scale_min_label: "Parece reagir ao que vem",
    scale_max_label: "Sabe muito claramente o que prioriza",
    open_prompt: "O que te faz dizer isso?",
  },
  {
    id: "q2",
    type: "core",
    lines: ["L2.1", "L4.4"],
    stem: "Pensando em [Nome] quando emoções intensas aparecem (dela ou de quem está perto) —",
    episode_prompt: "Conta uma situação em que você presenciou [Nome] em um momento emocionalmente carregado — alegria forte, frustração, perda, conflito. Como ela esteve ali?",
    scale_label: "A presença de [Nome] em momentos emocionalmente intensos —",
    scale_min_label: "Tende a se desorganizar ou desaparecer",
    scale_max_label: "Estabiliza o ambiente ao redor",
    open_prompt: "Descreva em poucas palavras como você sentiu a presença dela ali.",
  },
  {
    id: "q3",
    type: "core",
    lines: ["L3.1", "L3.4"],
    stem: "Pensando em [Nome] em ações conjuntas (trabalho, projeto, decisão em grupo, organização de algo coletivo) —",
    episode_prompt: "Lembre uma situação em que você fez algo junto com [Nome] — ou viu ela fazendo com outros. O que ela trouxe pra essa ação coletiva? E como ela lidou se algo deu errado por causa dela ou de alguém?",
    scale_label: "Quando algo coletivo dá errado, [Nome] —",
    scale_min_label: "Tende a culpar contexto ou outros",
    scale_max_label: "Reconhece e integra o que veio dela",
    open_prompt: "Conta uma cena que te fez ver isso.",
  },
  {
    id: "q4",
    type: "core",
    lines: ["L3.3"],
    stem: "Pensando em momentos de tensão entre [Nome] e alguém —",
    episode_prompt: "Lembre uma situação em que viu [Nome] em desacordo ou conflito com alguém — não precisa ter sido com você. Como ela esteve nessa tensão? Ficou com o desconforto, fugiu dele, ou tentou resolver rápido demais?",
    scale_label: "No conflito, [Nome] —",
    scale_min_label: "Foge ou cala",
    scale_max_label: "Fica na tensão até ela ser real",
    open_prompt: "O que você observou sobre como ela ficou (ou não) na tensão?",
  },
  {
    id: "q5",
    type: "core",
    lines: ["L4.1", "L4.2"],
    stem: "Pensando em decisões que [Nome] tomou que tinham efeitos em outras pessoas ou em sistemas maiores —",
    episode_prompt: "Lembre uma decisão de [Nome] que você acompanhou — algo que afetou mais do que ela mesma. Como ela pesou o que estava em jogo? O que ela levou em conta sobre o que vinha depois?",
    scale_label: "Em decisões com impacto além dela mesma, [Nome] —",
    scale_min_label: "Decide focando no imediato",
    scale_max_label: "Pesa efeitos em cadeia, prazos longos, contextos amplos",
    open_prompt: "O que te chamou atenção nessa decisão dela?",
  },
  {
    id: "q6",
    type: "core",
    lines: ["L1.4", "L2.2"],
    stem: "Pensando em [Nome] em momentos de interesse genuíno — não algo que tinha que fazer, mas algo que ela quis explorar ou criar —",
    episode_prompt: "Lembre uma situação em que viu [Nome] envolvida com algo que a interessou de verdade — pode ter sido um projeto, um livro, uma pessoa, uma ideia, uma habilidade. O que ela fazia ali? E o que parecia te dizer que aquilo era genuíno pra ela, e não obrigação?",
    scale_label: "O movimento de [Nome] quando algo a interessa —",
    scale_min_label: "Pega leve, abandona logo, fica na superfície",
    scale_max_label: "Mergulha, volta, deixa o interesse trabalhar nela ao longo do tempo",
    open_prompt: "Como você viu o que ela aprendeu (ou virou) por causa desse envolvimento?",
  },
];

Deno.serve(async (req) => {
  console.log(`[${DEPLOY_FINGERPRINT}] invoked, method:`, req.method);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const { token } = body;
  if (!token || typeof token !== "string") return json({ error: "Missing token" }, 400);

  const supabase_url = Deno.env.get("SUPABASE_URL");
  const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase_url || !service_role) return json({ error: "Missing config" }, 500);

  const admin = createClient(supabase_url, service_role);

  // Busca invite + dados do user
  const { data: invite, error: invErr } = await admin
    .from("third_party_invites")
    .select("id, ipe_cycle_id, user_id, status, responder_email, responder_name, created_at")
    .eq("token", token)
    .single();
  if (invErr || !invite) return json({ error: "Invalid or expired link" }, 404);

  if (invite.status === "revoked") return json({ error: "This link was revoked", status: "revoked" }, 403);
  if (invite.status === "submitted") return json({ error: "This link was already submitted", status: "submitted" }, 403);

  // Pega nome do dono via auth.users (display_name no metadata)
  const { data: userInfo } = await admin.auth.admin.getUserById(invite.user_id);
  const user_name =
    (userInfo?.user?.user_metadata?.display_name as string) ??
    (userInfo?.user?.email as string)?.split("@")[0] ??
    "alguém";

  // Carrega respostas parciais existentes (pra retomar de onde parou)
  const { data: existing } = await admin
    .from("third_party_responses")
    .select("question_id, scale_value, open_text, episode_text")
    .eq("invite_id", invite.id);

  return json({
    valid: true,
    invite_id: invite.id,
    user_name,
    questions: QUESTIONS,
    existing_responses: existing ?? [],
    responder: {
      email: invite.responder_email,
      name: invite.responder_name,
    },
    debug_fingerprint: DEPLOY_FINGERPRINT,
  });
});
