// supabase/functions/third-party-validate-link/index.ts
// ============================================================
// W20.1 — Página pública chama com token. Valida e retorna:
//  - nome do user dono do convite
//  - perguntas (hardcoded por enquanto, pode ir pra DB depois)
//  - status atual do convite (pra retomar de onde parou)
//  - respostas parciais já salvas (se houver)
//
// SEM AUTH (terceiro não tem conta no app).
// F4 hardening: CORS restrito, rate limit, body limit, token regex,
// erros unificados, expiração 30d, try/catch global.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEPLOY_FINGERPRINT = "w20.2-validate-link-v3-f4-hardening";

const ALLOWED_ORIGINS = new Set([
  "https://rdwth.com",
  "https://www.rdwth.com",
  "http://localhost:8080",
  "http://localhost:5173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://rdwth.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
    "Vary": "Origin",
  };
}

const json = (data: unknown, status = 200, req?: Request) => {
  const origin = req?.headers.get("origin") ?? null;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
};

const TOKEN_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVITE_TTL_DAYS = 30;

// Rate limit simples: max 30 requests/min por IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Calibration aparece em ambos os sets
const CALIBRATION = {
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
};

// ALPHA — 5 perguntas, cobre L1.1, L1.2, L2.1, L2.4, L3.1, L3.4, L4.1, L4.3
const ALPHA_QUESTIONS = [
  {
    id: "q1",
    type: "core",
    lines: ["L1.1", "L1.2"],
    stem: "Pensando em [Nome] em momentos onde algo importante estava em jogo —",
    episode_prompt: "Lembre uma situação em que você viu [Nome] sob pressão real — quando algo precisava ser feito mesmo sem condições ideais. O que [Nome] fez? E o que parecia estar organizando a ação ali?",
    scale_label: "No que você viu, [Nome] tem clareza sobre o que [pronome] orienta sob pressão.",
    scale_min_label: "Parece reagir ao que vem",
    scale_max_label: "Sabe claramente o que prioriza",
    open_prompt: "O que te faz dizer isso?",
  },
  {
    id: "q2",
    type: "core",
    lines: ["L2.1", "L2.4"],
    stem: "Pensando em [Nome] em momentos de intensidade emocional, ou em situações que parecem ter mexido com quem [pronome] é —",
    episode_prompt: "Conta uma cena em que você presenciou [Nome] num momento emocional forte (alegria, frustração, perda), ou em que algo aconteceu que parecia estar mudando a forma como [Nome] se via. Como [Nome] esteve ali?",
    scale_label: "Em momentos intensos, [Nome] —",
    scale_min_label: "Se desorganiza ou se afasta",
    scale_max_label: "Permanece em si, atravessa sem se perder",
    open_prompt: "O que você notou ali?",
  },
  {
    id: "q3",
    type: "core",
    lines: ["L3.1", "L3.4"],
    stem: "Pensando em [Nome] em ações coletivas — quando [pronome] faz algo junto com outras pessoas —",
    episode_prompt: "Lembre uma situação em que você viu [Nome] em ação conjunta (trabalho, projeto, decisão em grupo). O que [Nome] trouxe pra essa ação? E como [pronome] lidou com efeitos que [Nome] teve em outras pessoas — bons ou ruins?",
    scale_label: "Em ações coletivas, [Nome] —",
    scale_min_label: "Atua sem perceber muito o efeito em outros",
    scale_max_label: "Reconhece e integra o impacto que tem em outros",
    open_prompt: "Conta uma cena que ilustre isso.",
  },
  {
    id: "q4",
    type: "core",
    lines: ["L4.1"],
    stem: "Pensando em [Nome] em situações onde várias coisas se influenciam — relações, sistemas, contextos amplos —",
    episode_prompt: "Lembre uma situação em que [Nome] estava lidando com algo onde o que [pronome] fazia dependia de como várias coisas se conectavam. O que [Nome] percebeu sobre essas conexões?",
    scale_label: "A capacidade de [Nome] ver conexões num sistema —",
    scale_min_label: "Foca no que está mais próximo",
    scale_max_label: "Vê elementos distantes se influenciando",
    open_prompt: "O que ilustra essa percepção?",
  },
  {
    id: "q5",
    type: "core",
    lines: ["L4.3"],
    stem: "Pensando em [Nome] em situações onde [pronome] tinha algo a oferecer mas o ambiente não estava pedindo —",
    episode_prompt: "Conta uma situação em que [Nome] tinha um conhecimento, uma perspectiva ou uma visão que poderia ter contribuído, mas o contexto não estava receptivo. O que [Nome] fez com isso?",
    scale_label: "Quando o ambiente não pede o que [Nome] sabe, [pronome] —",
    scale_min_label: "Guarda pra si, espera ser convidad@",
    scale_max_label: "Encontra forma de oferecer sem forçar",
    open_prompt: "Como você viu isso aparecer?",
  },
];

// BETA — 5 perguntas, cobre L1.3, L1.4, L2.2, L2.3, L3.2, L3.3, L4.2, L4.4
const BETA_QUESTIONS = [
  {
    id: "q1",
    type: "core",
    lines: ["L1.3", "L1.4"],
    stem: "Pensando em [Nome] em algo que [pronome] entregou ou criou — onde o resultado importava —",
    episode_prompt: "Lembre algo que [Nome] entregou ou produziu — um projeto, uma criação, uma decisão concretizada. O que parece definir 'bom o suficiente' pra [Nome]? E como [pronome] usou o que aprendeu ao fazer?",
    scale_label: "O critério de qualidade de [Nome] —",
    scale_min_label: "Vem do que outros vão achar",
    scale_max_label: "Vem de critério próprio que [pronome] revisa ao longo do tempo",
    open_prompt: "O que ilustra isso?",
  },
  {
    id: "q2",
    type: "core",
    lines: ["L2.2", "L2.3"],
    stem: "Pensando em [Nome] em momentos de interesse genuíno e em momentos de muita coisa ao mesmo tempo —",
    episode_prompt: "Lembre algo que [Nome] foi atrás por curiosidade — não obrigação. E também: uma situação em que [pronome] estava com várias demandas simultâneas. Como [Nome] se moveu nas duas?",
    scale_label: "Quando algo interessa [Nome] e quando [pronome] está sob muitas demandas —",
    scale_min_label: "Pega leve no interesse, se dispersa quando lotad@",
    scale_max_label: "Mergulha quando interessa, sustenta foco em pressão",
    open_prompt: "Como você viu isso?",
  },
  {
    id: "q3",
    type: "core",
    lines: ["L3.2", "L3.3"],
    stem: "Pensando em [Nome] em grupos onde [pronome] sentia diferente do coletivo, ou em conflitos —",
    episode_prompt: "Lembre uma situação em que [Nome] estava num grupo (trabalho, família, amigos) e percebeu que pensava ou sentia diferente do que estava ali. Ou: uma tensão entre [Nome] e alguém. Como [pronome] se posicionou?",
    scale_label: "Em situações onde [Nome] discorda ou diverge —",
    scale_min_label: "Cala ou se adapta pra evitar atrito",
    scale_max_label: "Sustenta posição mesmo quando o grupo pressiona",
    open_prompt: "Como [Nome] esteve ali?",
  },
  {
    id: "q4",
    type: "core",
    lines: ["L4.2"],
    stem: "Pensando em decisões de [Nome] que olharam pra frente —",
    episode_prompt: "Lembre uma decisão que [Nome] tomou pensando no que ia acontecer depois — pequena ou grande. O que [Nome] levou em conta sobre o futuro? Quanto tempo à frente?",
    scale_label: "O alcance temporal nas decisões de [Nome] —",
    scale_min_label: "Foca no curto prazo",
    scale_max_label: "Pesa efeitos em meses ou anos à frente",
    open_prompt: "O que te chamou atenção?",
  },
  {
    id: "q5",
    type: "core",
    lines: ["L4.4"],
    stem: "Pensando em [Nome] em ambientes coletivos — como a presença de [Nome] afeta o que está ao redor —",
    episode_prompt: "Lembre uma situação em que [Nome] estava num espaço com várias pessoas. Como você sentiu a presença de [Nome] no campo? Mudou algo no ambiente?",
    scale_label: "A presença de [Nome] em ambientes coletivos —",
    scale_min_label: "Quase neutra, não mexe muito",
    scale_max_label: "Organiza ou ancora o coletivo",
    open_prompt: "Conta o que você sentiu.",
  },
];

Deno.serve(async (req) => {
  console.log(`[${DEPLOY_FINGERPRINT}] invoked, method:`, req.method);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, req);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (!checkRateLimit(ip)) return json({ error: "Too many requests" }, 429, req);

    const contentLength = parseInt(req.headers.get("content-length") ?? "0");
    if (contentLength > 10_000) return json({ error: "Payload too large" }, 413, req);

    const body = await req.json().catch(() => ({}));
    const { token, slug } = body;
    const SLUG_REGEX = /^[a-zA-Z0-9]{8}$/;
    const hasValidToken = typeof token === "string" && TOKEN_REGEX.test(token);
    const hasValidSlug = typeof slug === "string" && SLUG_REGEX.test(slug);
    if (!hasValidToken && !hasValidSlug) {
      return json({ error: "Invalid link" }, 400, req);
    }

    const supabase_url = Deno.env.get("SUPABASE_URL");
    const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabase_url || !service_role) return json({ error: "Missing config" }, 500, req);

    const admin = createClient(supabase_url, service_role);

    const lookupCol = hasValidSlug ? "slug" : "token";
    const lookupVal = hasValidSlug ? slug : token;
    const { data: invite, error: invErr } = await admin
      .from("third_party_invites")
      .select("id, ipe_cycle_id, user_id, status, responder_email, responder_name, created_at, question_set, user_pronoun, token, slug")
      .eq(lookupCol, lookupVal)
      .single();
    if (invErr || !invite) return json({ error: "Link unavailable" }, 404, req);

    if (invite.status === "revoked" || invite.status === "submitted") {
      return json({ error: "Link unavailable", status: invite.status }, 403, req);
    }

    // Expiração 30d
    const createdAt = new Date(invite.created_at);
    const ageMs = Date.now() - createdAt.getTime();
    if (ageMs > INVITE_TTL_DAYS * 24 * 60 * 60 * 1000) {
      return json({ error: "Link unavailable", status: "expired" }, 403, req);
    }

    const { data: userInfo } = await admin.auth.admin.getUserById(invite.user_id);
    const user_name =
      (userInfo?.user?.user_metadata?.display_name as string) ??
      (userInfo?.user?.email as string)?.split("@")[0] ??
      "alguém";

    const { data: existing } = await admin
      .from("third_party_responses")
      .select("question_id, scale_value, open_text, episode_text")
      .eq("invite_id", invite.id);

    const set = invite.question_set === "beta" ? BETA_QUESTIONS : ALPHA_QUESTIONS;
    const questions = [CALIBRATION, ...set];

    return json({
      valid: true,
      invite_id: invite.id,
      token: invite.token,
      slug: invite.slug,
      user_name,
      user_pronoun: invite.user_pronoun ?? "ela",
      question_set: invite.question_set ?? "alpha",
      questions,
      existing_responses: existing ?? [],
      responder: {
        email: invite.responder_email,
        name: invite.responder_name,
      },
      debug_fingerprint: DEPLOY_FINGERPRINT,
    }, 200, req);
  } catch (err) {
    console.error(`[${DEPLOY_FINGERPRINT}] unhandled error:`, err);
    return json({ error: "Internal error" }, 500, req);
  }
});
