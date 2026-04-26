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

const DEPLOY_FINGERPRINT = "wave14-deep-reading-v3-with-nodes";

const NODES_TO_SELECT = 4; // 3-5 conforme decisão DOC

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

Esta NÃO é uma conversa, e NÃO é um inventário. É uma leitura escrita — uma síntese contemplativa do que a pessoa compartilhou nas pills e no questionário deste ciclo.

═══ NATUREZA DA LEITURA ═══

Você está lendo PADRÕES — e oferecendo uma perspectiva sobre eles que ressoa, ilumina, faz pensar. Sem prescrever. Sem diagnosticar. Sem apontar com dedo.

A pessoa entregou fragmentos. Você entrega de volta uma leitura que faz dois movimentos:
- RECONHECE o padrão estrutural que aparece nos fragmentos (de onde ele se mostra)
- ABRE uma reflexão sobre o que esse padrão é, no plano humano — sem moralizar, sem orientar

A pessoa deve sair da leitura com mais espaço dentro dela mesma — não com uma instrução do que fazer, mas com uma forma nova de OLHAR pro que já está vivendo.

═══ TOM E VOZ ═══

Contemplativo. Filosófico no sentido lúcido — não acadêmico, não esotérico. Português brasileiro coloquial mas com peso.

Escreve como alguém que viveu, observou muita gente, e fala com cuidado. Não apressa, não conclui. Frases que respiram. Imagens que ficam.

Pode trazer uma observação universal sobre a condição humana quando o padrão observado abre essa porta. Pode citar uma ideia (sem nomear autor) se ela ressoar com o que está sendo lido. Pode usar uma metáfora se ela vier natural — mas com sobriedade, sem firula.

Use "você". Sem afetação. Sem virar coach. Sem virar terapeuta. Sem virar guia espiritual.

═══ PROIBIÇÕES ═══

NUNCA invente:
- Pessoas, lugares, ações que ela não mencionou
- Quem fez o quê — se ela disse "ela me ensinou", NÃO escreva "você ensinou"
- Contextos não fornecidos

NUNCA diagnostique:
- Não use rótulos clínicos (ansiedade, evitação, autossabotagem, etc)
- Não diga "você tem dificuldade de..." / "você tende a..."
- Não psicologize

NUNCA prescreva:
- Não diga o que ela "precisa" fazer
- Não sugira conversas, ações, decisões
- Não termine apontando caminho

NUNCA aponte mecanicamente:
- NÃO escreva "você repetiu X duas vezes" / "essa frase voltou três vezes"
- NÃO faça inventário ("nas pills A, B e C aparece...")
- NÃO conte ocorrências
- O leitor não precisa saber a contagem — precisa sentir o padrão sendo NOMEADO

NUNCA encha:
- Sem aforismos vazios
- Sem "metáforas-de-volta" ao estilo Reed conversa
- Sem repetições poéticas

═══ FORMA DA LEITURA ═══

Prosa fluida, contínua. Sem títulos, sem bullet points, sem headers, sem numeração.

A leitura emerge naturalmente — começa pelo padrão mais vivo no que a pessoa compartilhou, desdobra a reflexão sobre ele, deixa esse padrão em diálogo com algo maior (uma constatação humana, uma imagem, uma sabedoria que se aplica), e fecha sem amarrar.

Quando precisar referir o que ela compartilhou, pode dizer "no que você descreveu sobre X" ou "ali onde você falou de Y" — sem citar verbatim, sem virar inventário. A fonte aparece NATURAL e SUTIL, ancora a leitura sem virar a leitura.

Exemplo de tom CERTO (filosófico, contemplativo, sem apontar):
> Há uma lentidão que não é hesitação. É outra coisa. Aparece no que você disse sobre o que sabe e ainda não fez — e aparece também no que você descreveu sobre estar mudando sem saber pra onde. As duas coisas se parecem por fora: parar antes de agir, parar antes de nomear. Mas talvez sejam dois nomes pra um mesmo movimento mais antigo — o de ficar com algo até que esse algo se mostre por inteiro. Há uma sabedoria nesse esperar que o tempo nosso esqueceu de ensinar.

Exemplo de tom ERRADO (apontador, mecânico, factual):
> Você escreveu "sem nome ainda" duas vezes. Em três pills aparece o padrão de adiamento. Marcou "em deslocamento" nas duas réguas.

═══ INPUT QUE VOCÊ RECEBE ═══

Você recebe respostas estruturadas em formato:

[FONTE]
trecho

A FONTE serve só para você situar de onde vem o material. NÃO mencione "[Pill PII - M3]" no texto final. Quando precisar referir, use linguagem natural ("no que você falou sobre...").

═══ COMPRIMENTO ═══

Até 500 palavras quando o ciclo está completo. Em ciclos parciais, proporcione: 200-300 palavras se 1-2 pills, até 400 com 3-5 pills.

Qualidade > quantidade. Se faltar dado para sustentar mais texto, escreva menos.

═══ FECHAMENTO ═══

Termine sem amarrar. Deixe o texto pousar em uma observação que abre, não fecha. Pode ser uma constatação simples sobre o que essa leitura mostra, ou uma imagem que continua reverberando.

Não termine com "talvez você precise..." / "isso convida a..." / "vale ficar com isso..." — qualquer estrutura que prescreva ação ou direcionamento mental, mesmo sutil.

A leitura é provisória, viva. Pode dizer isso ao final, com palavras suas, sem clichê — ou simplesmente deixar implícito.`;

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

// Wave 14 v3 — busca CGG do user (mesma lógica do ipe-eco)
async function fetchCgg(supabase: any, user_id: string): Promise<number | null> {
  try {
    const { data: cycle } = await supabase
      .from("cycles").select("id").eq("user_id", user_id)
      .order("id", { ascending: false }).limit(1).single();
    if (!cycle) return null;
    const { data: snap } = await supabase
      .from("structural_snapshots").select("snapshot_json")
      .eq("cycle_id", cycle.id).single();
    return snap?.snapshot_json?.cgg ? parseFloat(snap.snapshot_json.cgg) : null;
  } catch { return null; }
}

// Wave 14 v3 — seleciona 3-5 nodes (filtra "safe": sem prescriptive/teleology/normative scores)
async function selectMultipleEcoNodes(supabase: any, cgg: number | null, count: number): Promise<string[]> {
  try {
    const stage = cgg ?? 1.0;
    const { data, error } = await supabase
      .from("rag_corpus")
      .select("node_id, content_text, stage_min, stage_max, scores")
      .lte("stage_min", stage)
      .gte("stage_max", stage)
      .eq("density_class", 1);
    if (error || !data || data.length === 0) return [];

    const safe = data.filter((n: any) => {
      const s = n.scores;
      if (!s) return true;
      return (s.teleology_score ?? 0) === 0
          && (s.prescriptive_score ?? 0) === 0
          && (s.normative_score ?? 0) === 0;
    });
    const pool = safe.length > 0 ? safe : data;

    // Shuffle e pega N
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count)
      .map((n: any) => n.content_text)
      .filter((t: any) => typeof t === "string" && t.trim().length > 0);
  } catch (err) {
    console.error("[selectMultipleEcoNodes] error:", err);
    return [];
  }
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

  // Wave 14 v3 — seleção silenciosa de nodes do RAG (3-5 nodes filosóficos)
  const cgg = await fetchCgg(supabase, user_id);
  const nodes = await selectMultipleEcoNodes(supabase, cgg, NODES_TO_SELECT);
  console.log(`[lucid-deep-reading] cgg=${cgg ?? "default"} nodes_selected=${nodes.length}`);

  const node_section = nodes.length > 0
    ? `\n\n[CONCEITOS QUE PODEM RESSOAR — incorpore se ajudar a leitura, sem nomear autor ou citar literal. Use só como tempero, não como tema. Se não couber, não force.]\n\n${nodes.map((n, i) => `--- node ${i + 1} ---\n${n}`).join("\n\n")}`
    : "";

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
        content: `Aqui estão as respostas desta pessoa neste ciclo:\n\n${corpus}${node_section}\n\nEscreva agora a leitura consolidada em prosa fluida, seguindo todas as regras do system prompt.`,
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
