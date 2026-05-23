// supabase/functions/third-party-finalize/index.ts
// ============================================================
// W20.1 — Terceiro clica "enviar". Finaliza:
//  1. Valida invite + responses mínimas
//  2. Marca invite=submitted + grava reveal_identity
//  3. Chama Sonnet pra gerar mini-insight (sobre o TERCEIRO, não o user)
//  4. Salva em third_party_mini_insights
//  5. Retorna texto pro terceiro ver
//
// SEM AUTH (terceiro não tem conta no app).
// F4 hardening: CORS restrito, rate limit, body limit, token regex,
// erros unificados, try/catch global.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const DEPLOY_FINGERPRINT = "w20.6-finalize-v3-f4-hardening";
const APP_BASE_URL = "https://rdwth.com";

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

const SYSTEM_PROMPT = `Você é Reed, escrevendo um mini-eco para alguém que acabou de responder um questionário sobre OUTRA pessoa.

A pessoa que está lendo seu eco NÃO é o user do app — é alguém que conhece o user e que respondeu observações sobre ele/ela.

═══ TAREFA ═══

Devolver um eco curto (3 a 5 linhas) sobre como ESTA PESSOA OBSERVOU. Não sobre o user que ela descreveu — sobre ELA, a observadora.

A premissa: a forma como alguém descreve outra pessoa diz algo sobre quem está descrevendo. O foco que ela escolheu, o que viu primeiro, o que enfatizou, o que ficou de fora.

═══ O QUE OBSERVAR NAS RESPOSTAS DO TERCEIRO ═══

Padrões possíveis (escolha 1-2 mais salientes — não force todos):
- Foco em ações vs. estados internos (descreveu o que [Nome] FEZ ou o que ela SENTIU?)
- Atribuição (descreveu como [Nome] sendo agente, ou como reagindo a circunstâncias?)
- Distância emocional na narrativa (envolvimento vivo ou observação distanciada?)
- Padrão de detalhe (cenas concretas com gestos, ou impressões abstratas?)
- O que privilegiou (qual pergunta despertou mais texto/cuidado?)

═══ PROIBIÇÕES ═══

- NUNCA fale sobre o user (a pessoa observada). Foco TOTAL na observadora.
- NUNCA diagnostique a observadora.
- NUNCA prescreva nada.
- NUNCA mencione "padrão" / "tipo" / "perfil" — sem rótulos psicológicos.
- NUNCA fale "você tem dificuldade de" / "você tende a".
- Sem aforismos vazios.

═══ TOM ═══

Caloroso, sóbrio, contemplativo. Reed escrevendo direto pra essa pessoa. PT-BR coloquial.

═══ FORMA ═══

3 a 5 linhas curtas, em prosa. Sem títulos, bullet points, numeração.

Exemplo de tom CERTO:
> Algo na forma como você descreveu — você foi pra cena, pro gesto, pro que aconteceu na frente dos olhos. Quase nunca pro que estava por dentro. Há uma economia no jeito que você observa: vê o que se mostra, e guarda o que ainda não pediu pra ser visto. Talvez isso diga algo de como você lê outras pessoas.

Exemplo de tom ERRADO (sobre o user, prescritivo, ou clínico):
> Você descreveu uma pessoa muito reflexiva. Você parece valorizar profundidade. Você deve continuar observando assim.

═══ FECHAMENTO ═══

Termine sem prescrever. Pode terminar abrindo uma observação simples, sem amarrar.

Renderize agora.`;

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
    const { token, reveal_identity } = body;
    if (!token || typeof token !== "string" || !TOKEN_REGEX.test(token)) {
      return json({ error: "Invalid link" }, 400, req);
    }
    if (typeof reveal_identity !== "boolean") {
      return json({ error: "reveal_identity must be boolean" }, 400, req);
    }

    const supabase_url = Deno.env.get("SUPABASE_URL");
    const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabase_url || !service_role) return json({ error: "Missing config" }, 500, req);

    const admin = createClient(supabase_url, service_role);

    const { data: invite, error: invErr } = await admin
      .from("third_party_invites")
      .select("id, status, responder_email")
      .eq("token", token)
      .single();
    if (invErr || !invite) return json({ error: "Link unavailable" }, 404, req);
    if (invite.status === "revoked" || invite.status === "submitted") {
      return json({ error: "Link unavailable", status: invite.status }, 403, req);
    }

    const { data: responses, error: rErr } = await admin
      .from("third_party_responses")
      .select("question_id, scale_value, open_text, episode_text")
      .eq("invite_id", invite.id);
    if (rErr) return json({ error: "Fetch responses failed", detail: rErr.message }, 500, req);
    if (!responses || responses.length === 0) {
      return json({ error: "No responses to finalize" }, 400, req);
    }

    const corpus = responses
      .map(r => {
        const parts: string[] = [];
        parts.push(`[${r.question_id}]`);
        if (r.episode_text) parts.push(`Episódio: ${r.episode_text}`);
        if (r.scale_value !== null) parts.push(`Escala: ${r.scale_value}/5`);
        if (r.open_text) parts.push(`Comentário: ${r.open_text}`);
        return parts.join("\n");
      })
      .join("\n\n---\n\n");

    console.log(`[finalize] corpus length: ${corpus.length}`);

    const anthropic_key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropic_key) return json({ error: "Missing ANTHROPIC_API_KEY" }, 500, req);
    const anthropic = new Anthropic({ apiKey: anthropic_key });

    let insight_text = "";
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 400,
        temperature: 0.55,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Aqui estão as respostas dessa pessoa:\n\n${corpus}\n\nGere agora o mini-eco curto sobre como ELA observou. Foco TOTAL nela, não na pessoa que ela descreveu.`,
        }],
      });
      const c = response.content[0];
      if (c && "text" in c) insight_text = c.text.trim();
    } catch (err: any) {
      console.error("[finalize] Anthropic error:", err.message);
      return json({ error: "LLM error", detail: err.message, debug_fingerprint: DEPLOY_FINGERPRINT }, 500, req);
    }

    if (!insight_text) {
      insight_text = "obrigada pelo tempo. o que você compartilhou vai ser cuidado por quem te chamou.";
    }

    const { error: insErr } = await admin
      .from("third_party_mini_insights")
      .upsert([{
        invite_id: invite.id,
        insight_text,
      }], { onConflict: "invite_id" });
    if (insErr) {
      console.error("[finalize] persist mini_insight error:", insErr);
    }

    const { error: updErr } = await admin
      .from("third_party_invites")
      .update({
        status: "submitted",
        reveal_identity,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
    if (updErr) {
      return json({ error: "Failed to finalize invite", detail: updErr.message }, 500, req);
    }

    // Wave 20.6 — dispara scoring de terceiros async (fire-and-forget)
    (async () => {
      try {
        await fetch(`${supabase_url}/functions/v1/ipe-scoring-third-party`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${service_role}`,
            "apikey": service_role,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invite_id: invite.id }),
        });
      } catch (err) {
        console.warn("[finalize] scoring trigger failed:", err);
      }
    })();

    return json({
      ok: true,
      insight_text,
      cta_url: `${APP_BASE_URL}/`,
      debug_fingerprint: DEPLOY_FINGERPRINT,
    }, 200, req);
  } catch (err) {
    console.error(`[${DEPLOY_FINGERPRINT}] unhandled error:`, err);
    return json({ error: "Internal error" }, 500, req);
  }
});
