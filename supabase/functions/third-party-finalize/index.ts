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
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const DEPLOY_FINGERPRINT = "w20.6-finalize-v2-trigger-scoring";
const APP_BASE_URL = "https://mvp-lucid.lovable.app";

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const { token, reveal_identity } = body;
  if (!token) return json({ error: "Missing token" }, 400);
  if (typeof reveal_identity !== "boolean") {
    return json({ error: "reveal_identity must be boolean" }, 400);
  }

  const supabase_url = Deno.env.get("SUPABASE_URL");
  const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase_url || !service_role) return json({ error: "Missing config" }, 500);

  const admin = createClient(supabase_url, service_role);

  // Valida invite
  const { data: invite, error: invErr } = await admin
    .from("third_party_invites")
    .select("id, status, responder_email")
    .eq("token", token)
    .single();
  if (invErr || !invite) return json({ error: "Invalid link" }, 404);
  if (invite.status === "revoked") return json({ error: "Link revoked" }, 403);
  if (invite.status === "submitted") return json({ error: "Already submitted" }, 403);

  // Busca responses do invite
  const { data: responses, error: rErr } = await admin
    .from("third_party_responses")
    .select("question_id, scale_value, open_text, episode_text")
    .eq("invite_id", invite.id);
  if (rErr) return json({ error: "Fetch responses failed", detail: rErr.message }, 500);
  if (!responses || responses.length === 0) {
    return json({ error: "No responses to finalize" }, 400);
  }

  // Monta corpus pra Sonnet (focado na FORMA como o terceiro respondeu)
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
  if (!anthropic_key) return json({ error: "Missing ANTHROPIC_API_KEY" }, 500);
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
    return json({ error: "LLM error", detail: err.message, debug_fingerprint: DEPLOY_FINGERPRINT }, 500);
  }

  if (!insight_text) {
    insight_text = "obrigada pelo tempo. o que você compartilhou vai ser cuidado por quem te chamou.";
  }

  // Persiste mini_insight
  const { error: insErr } = await admin
    .from("third_party_mini_insights")
    .upsert([{
      invite_id: invite.id,
      insight_text,
    }], { onConflict: "invite_id" });
  if (insErr) {
    console.error("[finalize] persist mini_insight error:", insErr);
    // Não aborta — seguimos finalizando o invite
  }

  // Marca invite como submitted + grava reveal_identity
  const { error: updErr } = await admin
    .from("third_party_invites")
    .update({
      status: "submitted",
      reveal_identity,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);
  if (updErr) {
    return json({ error: "Failed to finalize invite", detail: updErr.message }, 500);
  }

  // Wave 20.6 — dispara scoring de terceiros async (fire-and-forget)
  // Não aguarda resposta pra não atrasar retorno pro terceiro
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
  });
});
