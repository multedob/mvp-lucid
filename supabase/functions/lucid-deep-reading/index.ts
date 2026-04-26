// supabase/functions/lucid-deep-reading/index.ts
// ============================================================
// LUCID DEEP READING (Wave 14)
// Edge function dedicada — gera leitura consolidada do ciclo
// (pills + questionário) e salva em ipe_cycles.deep_reading_text.
//
// Disparada async (fire-and-forget) pelo frontend após:
//   - cada pill completed (eco gerado)
//   - cada bloco do questionário completed
//
// Independente do lucid-engine (que gera llm_response do Reed chat).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const DEPLOY_FINGERPRINT = "wave14-deep-reading-v1";

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

const PILL_LABEL: Record<string, string> = {
  PI:   "Pill I — Eu ↔ Pertencimento",
  PII:  "Pill II — Eu ↔ Papel",
  PIII: "Pill III — Presença ↔ Distância",
  PIV:  "Pill IV — Clareza ↔ Ação",
  PV:   "Pill V — Dentro ↔ Fora",
  PVI:  "Pill VI — Movimento ↔ Pausa",
};

// Extrai recursivamente strings não vazias (mesma função usada no ipe-eco)
function extractStringsRecursive(obj: unknown, acc: string[] = []): string[] {
  if (typeof obj === "string") {
    const t = obj.trim();
    if (t.length > 0) acc.push(t);
  } else if (Array.isArray(obj)) {
    obj.forEach(v => extractStringsRecursive(v, acc));
  } else if (obj && typeof obj === "object") {
    Object.values(obj).forEach(v => extractStringsRecursive(v, acc));
  }
  return acc;
}

const SYSTEM_PROMPT = `Você é Reed, escrevendo uma LEITURA CONSOLIDADA de ciclo no rdwth.

Esta NÃO é uma conversa. É uma leitura escrita — uma síntese estrutural do que a pessoa compartilhou nas pills e no questionário deste ciclo.

═══ NATUREZA DA LEITURA ═══

Você está lendo PADRÕES — não interpretando vidas. A pessoa entregou fragmentos: respostas a pills + perguntas do questionário. Sua tarefa é DEVOLVER esses fragmentos organizados em uma leitura que:

- Mostra o que ela disse, não o que você imagina que ela quis dizer
- Identifica padrões ESTRUTURAIS (como ela organiza experiência, não quem ela é)
- Aponta tensões e movimentos visíveis no que ela escreveu
- Devolve linguagem dela, não traduz para sua

═══ PROIBIÇÕES ABSOLUTAS ═══

NUNCA invente:
- Pessoas, lugares, ações que ela não mencionou
- Quem fez o quê — se ela disse "ela me ensinou", NÃO escreva "você ensinou"
- Contextos não fornecidos (quanto tempo, com quem, onde)
- Sentimentos que ela não nomeou

NUNCA diagnostique:
- Não diga "você é alguém que..." / "você está protegendo..."
- Não rotule (ansiedade, autossabotagem, evitação, etc)
- Não dê interpretação psicológica

NUNCA prescreva:
- Não diga o que ela "precisa" fazer
- Não sugira conversas, ações, decisões
- Não termine com "você só vai saber se..."

NUNCA encha:
- Sem repetições poéticas
- Sem analogias domésticas inventadas
- Sem "metáforas-de-volta" — isso é tom de Reed conversa, não leitura escrita

═══ FORMA DA LEITURA ═══

Prosa fluida, sem estrutura compartimentada. Sem títulos, bullet points, headers, numeração ou rótulos.

A leitura deve se desenvolver organicamente — entrelaçando o que apareceu nas pills e no questionário, deixando os padrões emergirem do próprio texto. Não force separação por categoria. Deixe a leitura encontrar seu próprio fio.

Use PARÁFRASE do que a pessoa disse + identificação natural da fonte quando ajudar a sustentar o que está sendo lido. A fonte pode aparecer integrada ao texto, sem formato fixo.

Exemplo bom:
> Na pill sobre papel, você descreveu o que vem fazendo como uma armadura — algo que protege e limita ao mesmo tempo. Esse movimento de proteção que vira aprisionamento volta no questionário, em outro lugar: na pergunta sobre mudança, aparece de novo o medo de descobrir o que sustenta as coisas quando você tira a peça central.

Não invente trechos. Não diga "você falou sobre X" se ela não falou. Se um padrão não tem sustentação no que ela escreveu, não escreva o parágrafo.

═══ TOM ═══

Sóbrio. Direto. Português brasileiro coloquial — não formal, não acadêmico, não terapêutico.

Use "você" para se referir à pessoa. Frases curtas. Sem afetação.

═══ INPUT QUE VOCÊ RECEBE ═══

Você recebe respostas estruturadas em formato:

[FONTE]
trecho parafraseável

Cada trecho identifica claramente a FONTE. Use só o que está marcado — nunca extrapole além disso.

═══ COMPRIMENTO ═══

Até 500 palavras quando o ciclo está completo (6 pills + questionário inteiro). Em ciclos parciais, proporcione: 200-300 palavras se 1-2 pills, até 400 com 3-5 pills.

Se faltar dado para sustentar mais texto, escreva menos. Qualidade > quantidade.

═══ FECHAMENTO ═══

Termine com uma observação sóbria do que esta leitura mostra — sem promessa, sem direção. Lembre que esta leitura é provisória: muda quando a pessoa responde mais (mais pills, mais questionário, conversas com Reed). Cada nova fala recompõe o quadro. Pode dizer isso ao final, com palavras suas, sem clichê.`;

interface PillResponseRow {
  pill_id: string;
  m2_resposta: string | null;
  m3_respostas: Record<string, unknown> | null;
  m4_resposta: Record<string, unknown> | null;
  eco_text: string | null;
}

interface QuestionnaireResponseRow {
  block_id: string;
  responses: Record<string, unknown> | null;
}

function buildCorpusFromPills(pills: PillResponseRow[]): string {
  if (!pills.length) return "";
  const sections: string[] = [];
  for (const p of pills) {
    const label = PILL_LABEL[p.pill_id] ?? p.pill_id;
    const parts: string[] = [];
    if (p.m2_resposta && p.m2_resposta.trim()) {
      parts.push(`M2 (cena): ${p.m2_resposta.trim()}`);
    }
    const m3_strs = p.m3_respostas ? extractStringsRecursive(p.m3_respostas) : [];
    if (m3_strs.length) {
      parts.push(`M3 (escolhas e inventário): ${m3_strs.join(" | ")}`);
    }
    const m4_strs = p.m4_resposta ? extractStringsRecursive(p.m4_resposta) : [];
    if (m4_strs.length) {
      parts.push(`M4 (auto-observação): ${m4_strs.join(" | ")}`);
    }
    if (parts.length) {
      sections.push(`[${label}]\n${parts.join("\n")}`);
    }
  }
  return sections.join("\n\n");
}

function buildCorpusFromQuestionnaire(rows: QuestionnaireResponseRow[]): string {
  if (!rows.length) return "";
  const sections: string[] = [];
  for (const r of rows) {
    const strs = r.responses ? extractStringsRecursive(r.responses) : [];
    if (strs.length) {
      sections.push(`[Questionário — bloco ${r.block_id}]\n${strs.join(" | ")}`);
    }
  }
  return sections.join("\n\n");
}

Deno.serve(async (req) => {
  console.log(`[lucid-deep-reading ${DEPLOY_FINGERPRINT}] invoked, method:`, req.method);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth_header = req.headers.get("Authorization");
  if (!auth_header) return json({ error: "Missing authorization" }, 401);

  const token = auth_header.replace("Bearer ", "");
  const supabase_url = Deno.env.get("SUPABASE_URL");
  const supabase_anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabase_url || !supabase_anon) return json({ error: "Missing config" }, 500);

  const supabase = createClient(supabase_url, supabase_anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: auth_data, error: auth_err } = await supabase.auth.getUser(token);
  if (auth_err || !auth_data.user) return json({ error: "Unauthorized" }, 401);
  const user_id = auth_data.user.id;

  const body = await req.json().catch(() => ({}));
  const { ipe_cycle_id } = body;
  if (!ipe_cycle_id) return json({ error: "Missing ipe_cycle_id" }, 400);

  // Confirma que o cycle pertence ao user
  const { data: cycle, error: cycleErr } = await supabase
    .from("ipe_cycles")
    .select("id, user_id")
    .eq("id", ipe_cycle_id)
    .single();
  if (cycleErr || !cycle || cycle.user_id !== user_id) {
    return json({ error: "Cycle not found or unauthorized" }, 404);
  }

  // Busca pill_responses do cycle
  const { data: pills } = await supabase
    .from("pill_responses")
    .select("pill_id, m2_resposta, m3_respostas, m4_resposta, eco_text")
    .eq("ipe_cycle_id", ipe_cycle_id)
    .not("m2_resposta", "is", null);

  // Busca questionnaire_responses do cycle (se a tabela existir)
  let questionnaire: QuestionnaireResponseRow[] = [];
  try {
    const { data: qrows } = await supabase
      .from("questionnaire_responses")
      .select("block_id, responses")
      .eq("ipe_cycle_id", ipe_cycle_id);
    if (qrows) questionnaire = qrows as QuestionnaireResponseRow[];
  } catch (err) {
    console.warn("[lucid-deep-reading] questionnaire_responses fetch failed (table may not exist yet):", err);
  }

  const pillsCorpus = buildCorpusFromPills((pills ?? []) as PillResponseRow[]);
  const qCorpus = buildCorpusFromQuestionnaire(questionnaire);

  if (!pillsCorpus && !qCorpus) {
    return json({
      ok: true,
      skipped: "no data yet",
      debug_fingerprint: DEPLOY_FINGERPRINT,
    });
  }

  const corpus = [pillsCorpus, qCorpus].filter(Boolean).join("\n\n");
  console.log(`[lucid-deep-reading] corpus length: ${corpus.length}`);

  const anthropic_key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropic_key) return json({ error: "Missing ANTHROPIC_API_KEY" }, 500);
  const anthropic = new Anthropic({ apiKey: anthropic_key });

  let deep_reading = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1200,
      temperature: 0.5,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Aqui estão as respostas desta pessoa neste ciclo:\n\n${corpus}\n\nEscreva agora a leitura consolidada em prosa fluida, seguindo todas as regras do system prompt.`,
      }],
    });
    const c = response.content[0];
    if (c && "text" in c) deep_reading = c.text.trim();
  } catch (err: any) {
    console.error("[lucid-deep-reading] Anthropic error:", err.message);
    return json({ error: "LLM error", detail: err.message, debug_fingerprint: DEPLOY_FINGERPRINT }, 500);
  }

  if (!deep_reading) {
    return json({ error: "Empty LLM response", debug_fingerprint: DEPLOY_FINGERPRINT }, 500);
  }

  // Persiste em ipe_cycles.deep_reading_text com timestamp
  const admin = createClient(supabase_url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error: updErr } = await admin
    .from("ipe_cycles")
    .update({
      deep_reading_text: deep_reading,
      deep_reading_updated_at: new Date().toISOString(),
    })
    .eq("id", ipe_cycle_id);
  if (updErr) {
    console.error("[lucid-deep-reading] persist error:", updErr);
    return json({ error: "Persist failed", detail: updErr.message, debug_fingerprint: DEPLOY_FINGERPRINT }, 500);
  }

  return json({
    ok: true,
    deep_reading_length: deep_reading.length,
    debug_fingerprint: DEPLOY_FINGERPRINT,
  });
});
