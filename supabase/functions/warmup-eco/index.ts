// supabase/functions/warmup-eco/index.ts
// ============================================================
// AFC ONB-6 — Mini-Eco Warm-up
//
// Recebe par de respostas do warm-up (perguntas #1 + #13 do banco v0.2),
// busca nodes RAG (rag_corpus, density_class=1, "safe" filtrado),
// gera mini-eco que IDENTIFICA PADRÃO (não parafraseia),
// finaliza com pergunta binária seguindo Lei 6 (Ask, Don't Tell — Bartlett).
//
// Persiste em echoes (kind='warmup') e marca warmup_completed_at em
// user_onboarding_state.
//
// Streaming SSE (mesmo padrão do lucid-engine A24):
//   data: {"type":"metadata", "model":"..."}
//   data: {"type":"token", "text":"..."}  ... (N tokens)
//   data: {"type":"done", "echo_id":"...", "eco_length":N, "has_follow_up":bool, "latency_ms":N}
//   data: {"type":"error", "message":"..."}
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const DEPLOY_FINGERPRINT = "afc-onb-6-warmup-eco-v1";
const NODES_TO_SELECT = 4;
const MODEL_ID = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 600;
const TEMPERATURE = 0.7;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type, apikey",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function encodeSSE(obj: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

// ─── RAG ────────────────────────────────────────────────────────────
async function selectWarmupNodes(
  supabase: ReturnType<typeof createClient>,
  count: number,
): Promise<{ ids: string[]; texts: string[] }> {
  try {
    // Warm-up é pré-ciclo (sem CGG) → usa stage default 1.0
    const stage = 1.0;
    const { data, error } = await supabase
      .from("rag_corpus")
      .select("node_id, content_text, scores")
      .lte("stage_min", stage)
      .gte("stage_max", stage)
      .eq("density_class", 1);

    if (error || !data || data.length === 0) return { ids: [], texts: [] };

    const safe = data.filter((n: any) => {
      const s = n.scores;
      if (!s) return true;
      return (s.teleology_score ?? 0) === 0
          && (s.prescriptive_score ?? 0) === 0
          && (s.normative_score ?? 0) === 0;
    });
    const pool = safe.length > 0 ? safe : data;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const slice = shuffled.slice(0, count);

    return {
      ids: slice
        .map((n: any) => n.node_id)
        .filter((v: any) => typeof v === "string"),
      texts: slice
        .map((n: any) => n.content_text)
        .filter((t: any) => typeof t === "string" && t.trim().length > 0),
    };
  } catch (err) {
    console.error("[warmup-eco selectWarmupNodes] error:", err);
    return { ids: [], texts: [] };
  }
}

// ─── Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é Reed, escrevendo um MINI-ECO WARM-UP no rdwth.

Esta é a primeira interação real da pessoa com você. Ela acabou de responder duas perguntas pessoais durante o onboarding. Você está mostrando o tipo de leitura que o produto faz — sem peso, sem promessa, sem terapia.

═══ NATUREZA DO MINI-ECO ═══

Você NÃO parafraseia o que a pessoa disse.
Você IDENTIFICA UM PADRÃO ou UMA OBSERVAÇÃO que cruza as duas respostas.
Padrão = algo estrutural que aparece quando se olha as duas respostas juntas — não inventário, não resumo, não psicologização.

A pessoa entregou dois fragmentos. Você entrega de volta:
- Uma observação curta (3 a 5 frases) que CRUZA as duas respostas e nomeia o padrão sem rotular a pessoa.
- Uma pergunta final que aplica a "Lei 6 — Ask, Don't Tell" (ver seção LEI 6 abaixo).

═══ TOM E VOZ ═══

Contemplativo. Direto. Português brasileiro coloquial mas com peso.
Frases curtas que respiram. Sem firula. Sem jargão. Sem coaching.
Use "você". Sem afetação.

═══ PROIBIÇÕES ═══

NUNCA invente:
- Pessoas, lugares, ações que ela não mencionou.

NUNCA diagnostique:
- Sem rótulos clínicos (ansiedade, evitação, autossabotagem, perfeccionismo, etc).
- Não diga "você tende a..." / "você tem dificuldade de..." / "isso mostra que você...".

NUNCA prescreva:
- Não diga o que ela "precisa" fazer.
- Não sugira ação fora do produto.

NUNCA parafraseie:
- "Você disse que...", "Sobre a decisão que você está tentando entender..." → PROIBIDO.
- O eco fala SOBRE o padrão, não SOBRE a fala da pessoa.

NUNCA aponte mecanicamente:
- Não conte ocorrências, não inventário ("nas duas respostas aparece...").
- Não numere, não use bullets.

NUNCA faça perguntas no meio do eco:
- O eco é apenas afirmações. Sem interrogações intermediárias.
- A ÚNICA pergunta permitida em todo o output é a pergunta FINAL, em uma linha separada, começando com "Vai".
- Frases como "por que parou?", "o que você fez?", "será que...?" no meio do eco → PROIBIDO.

═══ ESTRUTURA OBRIGATÓRIA ═══

1. Mini-eco: 3 a 5 frases curtas que cruzam os dois fragmentos e nomeiam o padrão.
2. Linha em branco.
3. Pergunta final em uma única linha, começando com "Vai".

Sem cabeçalhos. Sem rótulos. Sem markdown. Apenas o texto puro nessa estrutura.

═══ LEI 6 — ASK, DON'T TELL (Steven Bartlett, The Diary of a CEO) ═══

A pergunta final deve seguir estritamente a Lei 6:

- BINÁRIA: a pessoa só consegue responder sim ou não. Sem margem pra "talvez", "depende", "como assim".
- COMEÇA COM "Vai": "Vai" implica ownership e ação. É mais forte que "pode", "poderia", "quer".
- APROXIMA DE QUEM ELA QUER SER: a pergunta encoraja um comportamento que produz cognitive dissonance produtiva — dizer "não" custa, porque admite que ela não quer ser quem está se vendo.
- IMEDIATA: pede continuação AGORA, dentro do produto, não amanhã, não em algum momento.

EXEMPLOS DE PERGUNTAS FINAIS BOAS (use como referência de TOM — não copie literal):
- "Vai me deixar puxar essa linha um pouco mais?"
- "Vai abrir a primeira pill enquanto isso ainda está vivo?"
- "Vai testar essa leitura agora?"
- "Vai colocar em palavras o que essa frase mexe em você antes de fechar?"

EXEMPLOS DE PERGUNTAS RUINS (NUNCA produza assim):
- "O que você acha disso?" → aberta, escapável.
- "Como você se sente?" → terapeutês.
- "Você quer continuar?" → fraca, não usa "Vai".
- "Vai voltar amanhã?" → não é imediata.
- "Vai pensar sobre isso depois?" → não é dentro do produto, não é agora.

═══ NODES RAG ═══

Você pode receber alguns conceitos no formato [CONCEITOS QUE PODEM RESSOAR]. Use APENAS como tempero — sem nomear autor, sem citar literal. Se não couber, não force.

═══ FORMATO DE SAÍDA ═══

Texto puro. Sem markdown. Sem cabeçalho. Sem rótulos.
Apenas as 3-5 frases do eco, linha em branco, e a pergunta final começando com "Vai".`;

function buildUserContent(
  questions: string[],
  responses: string[],
  nodes: string[],
  user_name: string | null,
): string {
  const parts: string[] = [];
  if (user_name) {
    parts.push(`Nome da pessoa: ${user_name}`);
    parts.push("");
  }
  parts.push("Pergunta 1: " + questions[0]);
  parts.push("Resposta 1: " + responses[0]);
  parts.push("");
  parts.push("Pergunta 2: " + questions[1]);
  parts.push("Resposta 2: " + responses[1]);

  if (nodes.length > 0) {
    parts.push("");
    parts.push("[CONCEITOS QUE PODEM RESSOAR — incorpore se ajudar a leitura, sem nomear autor ou citar literal. Use só como tempero, não como tema. Se não couber, não force.]");
    parts.push("");
    nodes.forEach((n, i) => {
      parts.push(`--- node ${i + 1} ---`);
      parts.push(n);
    });
  }

  parts.push("");
  parts.push("Gere o mini-eco warm-up agora, seguindo todas as regras.");
  return parts.join("\n");
}

// Separa o eco da pergunta final (última linha começando com "Vai").
function extractFollowUp(fullText: string): { eco: string; follow: string } {
  const lines = fullText.trim().split(/\r?\n/);
  let lastIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^vai\b/i.test(lines[i].trim())) {
      lastIdx = i;
      break;
    }
  }
  if (lastIdx === -1) {
    return { eco: fullText.trim(), follow: "" };
  }
  const follow = lines[lastIdx].trim();
  const eco = lines.slice(0, lastIdx).join("\n").trim();
  return { eco, follow };
}

// ─── Handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  console.log(`[warmup-eco ${DEPLOY_FINGERPRINT}] invoked, method:`, req.method);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth_header = req.headers.get("Authorization");
  if (!auth_header) return json({ error: "Missing authorization" }, 401);

  const supabase_url = Deno.env.get("SUPABASE_URL");
  const service_role = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon_key = Deno.env.get("SUPABASE_ANON_KEY");
  const anthropic_key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!supabase_url || !service_role || !anon_key) {
    return json({ error: "Missing Supabase env vars" }, 500);
  }
  if (!anthropic_key) return json({ error: "Missing ANTHROPIC_API_KEY" }, 500);

  // Cliente com JWT do user pra resolver auth.uid()
  const supabaseUser = createClient(supabase_url, anon_key, {
    global: { headers: { Authorization: auth_header } },
  });
  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) return json({ error: "Invalid authorization" }, 401);

  // Cliente admin (bypassa RLS) pra escritas
  const supabase = createClient(supabase_url, service_role);

  // ── Validação de input ────────────────────────────────────────────
  let body: { questions?: unknown; responses?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const questions: string[] = Array.isArray(body.questions)
    ? (body.questions as unknown[]).map(String)
    : [];
  const responses: string[] = Array.isArray(body.responses)
    ? (body.responses as unknown[]).map(String)
    : [];
  if (questions.length !== 2 || responses.length !== 2) {
    return json({ error: "Expected exactly 2 questions and 2 responses" }, 400);
  }
  if (responses.some(r => r.trim().length === 0)) {
    return json({ error: "Empty response" }, 400);
  }

  // Nome opcional (display_name > given_name > null)
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const user_name: string | null =
    (typeof meta.display_name === "string" ? meta.display_name : null) ||
    (typeof meta.given_name === "string" ? meta.given_name : null) ||
    null;

  // ── RAG ───────────────────────────────────────────────────────────
  const { ids: node_ids, texts: node_texts } = await selectWarmupNodes(supabase, NODES_TO_SELECT);
  console.log(`[warmup-eco] user=${user.id} nodes_selected=${node_ids.length}`);

  const user_content = buildUserContent(questions, responses, node_texts, user_name);
  const anthropic = new Anthropic({ apiKey: anthropic_key });
  const startedAt = Date.now();

  // ── Streaming ─────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encodeSSE({ type: "metadata", model: MODEL_ID }));

      let fullText = "";
      try {
        const anthropicStream = await anthropic.messages.stream({
          model: MODEL_ID,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: user_content }],
        });

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const token = event.delta.text;
            fullText += token;
            controller.enqueue(encodeSSE({ type: "token", text: token }));
          }
        }

        const latency_ms = Date.now() - startedAt;
        const { eco, follow } = extractFollowUp(fullText);

        // Persistir echo
        const { data: insertedEcho, error: echoErr } = await supabase
          .from("echoes")
          .insert({
            user_id: user.id,
            kind: "warmup",
            cycle_id: null,
            questions,
            responses,
            eco_text: eco,
            follow_up_question: follow || null,
            nodes_used: node_ids,
            model: MODEL_ID,
            latency_ms,
            raw_payload: { full: fullText },
          })
          .select("id")
          .single();

        if (echoErr) {
          console.error("[warmup-eco] echo insert error:", echoErr);
        }

        // Marcar warmup_completed_at no onboarding state (idempotente)
        const { error: stateErr } = await supabase
          .from("user_onboarding_state")
          .upsert(
            {
              user_id: user.id,
              warmup_completed_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (stateErr) {
          console.error("[warmup-eco] onboarding state update error:", stateErr);
        }

        controller.enqueue(encodeSSE({
          type: "done",
          echo_id: insertedEcho?.id ?? null,
          eco_length: eco.length,
          has_follow_up: !!follow,
          latency_ms,
        }));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[warmup-eco] STREAM_ERROR:", err);
        controller.enqueue(encodeSSE({ type: "error", message: errMsg }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
