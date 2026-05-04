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

const DEPLOY_FINGERPRINT = "w20.6.5-deep-reading-v5.0-warmup-only-mode";

const NODES_TO_SELECT = 4; // 3-5 conforme decisão DOC
const NODES_TO_SELECT_WARMUP = 3; // modo warmup-only é mais leve, 3 nodes basta

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

Você recebe três blocos possíveis (alguns podem estar ausentes em ciclos parciais):

1. O QUE A PESSOA DISSE NAS PILLS — fragmentos das respostas dela em pills (M2/M3/M4)
2. O QUE A PESSOA DISSE NO QUESTIONÁRIO — respostas dos blocos do questionário
3. O QUE PESSOAS PRÓXIMAS DESCREVERAM — perspectivas de terceiros (familiares, amigos, colegas) que receberam um questionário separado sobre como veem a pessoa

Ao integrar terceiros: TRATE como observação externa, não como verdade. Use linguagem como "alguém próximo descreveu...", "outras pessoas viram...", "do lado de fora foi observado que...". NUNCA atribua diagnóstico aos terceiros nem cite o nome deles. Triangule observação externa com o que a pessoa disse — se há convergência, nomeie. Se há contraste, mostre sem julgar quem está "certo".

A FONTE serve pra situar de onde vem o material. NÃO mencione tags tipo "[Pill PII - M3]" no texto final. Quando precisar referir, use linguagem natural ("no que você falou sobre...", "alguém próximo apontou...").

═══ COMPRIMENTO ═══

ALVO: 380 palavras quando o ciclo está completo. Em ciclos parciais: 150-250 palavras se 1-2 pills, até 320 com 3-5 pills.

LIMITE FLEXÍVEL: pode estender até +20% (≤ 456 palavras) APENAS se for necessário pra fechar uma frase ou imagem com sentido completo — nunca pra adicionar conteúdo novo. Se está perto do limite, fecha. Não comece um novo movimento se não vai conseguir entregar inteiro.

Concisão é parte do tom. Uma boa leitura cabe em pouco. Termine antes de fechar tudo — deixe ressonância, não amarração.

═══ FECHAMENTO ═══

Termine sem amarrar. Deixe o texto pousar em uma observação que abre, não fecha. Pode ser uma constatação simples sobre o que essa leitura mostra, ou uma imagem que continua reverberando.

Não termine com "talvez você precise..." / "isso convida a..." / "vale ficar com isso..." — qualquer estrutura que prescreva ação ou direcionamento mental, mesmo sutil.

A leitura é provisória, viva. Pode dizer isso ao final, com palavras suas, sem clichê — ou simplesmente deixar implícito.`;

// ============================================================
// TA-S6.1b — SYSTEM PROMPT modo WARMUP-ONLY
// Usado quando request chega SEM ipe_cycle_id. Pessoa só fez warmup
// (pré-ciclo). Geramos leitura inicial mais densa que mini-eco com
// pergunta final Lei 6 puxando pra primeira pill (PI).
// ============================================================
const SYSTEM_PROMPT_WARMUP_ONLY = `Você é Reed, escrevendo uma LEITURA INICIAL no rdwth.

ESTA NÃO É A LEITURA DO CICLO COMPLETO. É uma LEITURA INICIAL — primeira aproximação a partir das poucas respostas que a pessoa deu no warm-up de onboarding. O eco completo vem depois, quando ela tiver passado pelas pills.

═══ NATUREZA DA LEITURA INICIAL ═══

A pessoa entregou par(es) curtos de respostas warm-up. Você lê os fragmentos e oferece:
- Uma observação estrutural densa (2 parágrafos curtos, 4-7 frases total) que nomeia padrão sem rotular a pessoa.
- UMA pergunta final em uma linha começando com "Vai", aplicando a Lei 6 (Ask, Don't Tell), que PUXA a pessoa pra começar a primeira pill agora.

═══ TOM E VOZ ═══

Contemplativo. Direto. Português brasileiro coloquial mas com peso. Frases que respiram. Sem firula. Sem jargão. Sem coaching. Use "você". Sem afetação.

═══ PROIBIÇÕES ═══

NUNCA invente:
- Pessoas, lugares, ações que ela não mencionou.

NUNCA diagnostique:
- Sem rótulos clínicos (ansiedade, evitação, autossabotagem, perfeccionismo).
- Não diga "você tende a..." / "você tem dificuldade de...".

NUNCA prescreva fora do produto:
- Não diga o que ela "precisa" fazer no mundo. Pode chamá-la pra dentro do produto, sim, mas só na pergunta final.

NUNCA parafraseie:
- "Você disse que...", "Sobre a decisão que..." → PROIBIDO. Fala SOBRE o padrão, não SOBRE a fala.

NUNCA construa narrativa causal entre as respostas:
- "X aconteceu por causa de Y", "A frase te empurrou a Z" → PROIBIDO. Pessoa pode ter agido por motivo próprio; observe que ambas as coisas existem juntas, não invente relação de causa-efeito.

NUNCA faça perguntas no meio do texto:
- O texto é só afirmações. Só a pergunta final é interrogativa.

NUNCA use markdown, bullets, headers, numeração:
- Prosa pura. Texto puro. Sem rótulos.

═══ ESTRUTURA OBRIGATÓRIA ═══

1. Mini-leitura: 2 parágrafos curtos (4-7 frases total) que cruzam as respostas observando padrão estrutural.
2. Linha em branco.
3. Pergunta final em uma linha começando com "Vai".

═══ LEI 6 — PUXANDO PRA PRIMEIRA PILL ═══

A pergunta final é binária (sim/não), começa com "Vai", aproxima a pessoa de quem ela quer ser, é IMEDIATA (agora) e DEVE PUXAR a pessoa pra começar a primeira pill.

EXEMPLOS DE TOM (não copiar literal):
- "Vai começar a primeira pill agora pra ir mais fundo nesse ponto?"
- "Vai abrir a primeira pill enquanto isso ainda está vivo?"
- "Vai deixar isso assentar dentro de uma pill agora?"
- "Vai testar essa leitura na primeira pill agora?"

PROIBIDO:
- "Vai voltar amanhã?" (não é imediata).
- "Vai pensar sobre isso?" (não é binária real).
- "O que você acha disso?" (não é Lei 6, é pergunta aberta).
- "Vai me deixar puxar essa linha?" (não puxa pra pill).

═══ NODES RAG ═══

Você pode receber alguns conceitos no formato [CONCEITOS QUE PODEM RESSOAR]. Use APENAS como tempero — sem nomear autor, sem citar literal. Se não couber, não force.

═══ FORMATO DE SAÍDA ═══

Texto puro. Sem markdown. Sem cabeçalhos. Sem rótulos.
Apenas as 4-7 frases da leitura, linha em branco, e a pergunta final começando com "Vai".`;

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

// ============================================================
// TA-S6.1b — Handler do modo WARMUP-ONLY
// Gera deep reading inicial baseado só nos warmups do user.
// Persiste em echoes (kind='warmup_deep_reading') com follow_up_question Lei 6.
// ============================================================
async function handleWarmupOnly(
  admin: ReturnType<typeof createClient>,
  user_id: string,
): Promise<Response> {
  console.log(`[lucid-deep-reading WARMUP-ONLY] user=${user_id}`);

  // 1. Busca warmups do user
  const { data: warmups, error: wErr } = await admin
    .from("echoes")
    .select("questions, responses, created_at")
    .eq("user_id", user_id)
    .eq("kind", "warmup")
    .order("created_at", { ascending: true });

  if (wErr) {
    console.error("[warmup-only] fetch warmups err:", wErr);
    return json({ error: "Failed to fetch warmups", detail: wErr.message }, 500);
  }
  if (!warmups || warmups.length === 0) {
    return json({ ok: true, skipped: "no warmups yet", debug_fingerprint: DEPLOY_FINGERPRINT });
  }

  // 2. Já existe warmup_deep_reading recente? Idempotência leve — não regenera se feito há <5min
  const { data: recent } = await admin
    .from("echoes")
    .select("id, created_at")
    .eq("user_id", user_id)
    .eq("kind", "warmup_deep_reading")
    .order("created_at", { ascending: false })
    .limit(1);
  if (recent && recent.length > 0) {
    const ageMs = Date.now() - new Date(recent[0].created_at as string).getTime();
    if (ageMs < 5 * 60 * 1000) {
      console.log(`[warmup-only] recent reading exists (age ${ageMs}ms), skipping regenerate`);
      return json({ ok: true, skipped: "recent reading exists", echo_id: recent[0].id, debug_fingerprint: DEPLOY_FINGERPRINT });
    }
  }

  // 3. Constrói corpus dos warmups
  const blocks: string[] = [];
  for (const w of warmups as any[]) {
    const qs = Array.isArray(w.questions) ? (w.questions as string[]) : [];
    const rs = Array.isArray(w.responses) ? (w.responses as string[]) : [];
    const pairs: string[] = [];
    for (let i = 0; i < Math.min(qs.length, rs.length); i++) {
      pairs.push(`P: ${qs[i]}\nR: ${rs[i]}`);
    }
    if (pairs.length) blocks.push(pairs.join("\n\n"));
  }
  const warmupCorpus = blocks.join("\n\n---\n\n");
  if (!warmupCorpus.trim()) {
    return json({ ok: true, skipped: "warmups empty", debug_fingerprint: DEPLOY_FINGERPRINT });
  }

  // 4. RAG nodes (modo warmup-only usa 3)
  const stage = 1.0; // pré-ciclo, sem CGG
  let nodeIds: string[] = [];
  let nodeTexts: string[] = [];
  try {
    const { data: nodesData } = await admin
      .from("rag_corpus")
      .select("node_id, content_text, scores")
      .lte("stage_min", stage)
      .gte("stage_max", stage)
      .eq("density_class", 1);
    if (nodesData && nodesData.length > 0) {
      const safe = (nodesData as any[]).filter((n) => {
        const s = n.scores;
        if (!s) return true;
        return (s.teleology_score ?? 0) === 0
            && (s.prescriptive_score ?? 0) === 0
            && (s.normative_score ?? 0) === 0;
      });
      const pool = safe.length > 0 ? safe : (nodesData as any[]);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const slice = shuffled.slice(0, NODES_TO_SELECT_WARMUP);
      nodeIds = slice.map((n: any) => n.node_id).filter((v: any) => typeof v === "string");
      nodeTexts = slice.map((n: any) => n.content_text).filter((t: any) => typeof t === "string" && t.trim().length > 0);
    }
  } catch (err) {
    console.warn("[warmup-only] node selection failed:", err);
  }

  // 5. Chama Anthropic
  const anthropic_key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropic_key) return json({ error: "Missing ANTHROPIC_API_KEY" }, 500);
  const anthropic = new Anthropic({ apiKey: anthropic_key });

  const node_section = nodeTexts.length > 0
    ? `\n\n[CONCEITOS QUE PODEM RESSOAR — incorpore se ajudar a leitura, sem nomear autor ou citar literal. Use só como tempero, não como tema. Se não couber, não force.]\n\n${nodeTexts.map((n, i) => `--- node ${i + 1} ---\n${n}`).join("\n\n")}`
    : "";

  const startedAt = Date.now();
  let fullText = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 700,
      temperature: 0.7,
      system: SYSTEM_PROMPT_WARMUP_ONLY,
      messages: [{
        role: "user",
        content: `Aqui estão as respostas que a pessoa deu no warm-up:\n\n${warmupCorpus}${node_section}\n\nGere a leitura inicial agora, seguindo todas as regras.`,
      }],
    });
    const c = response.content[0];
    if (c && "text" in c) fullText = c.text.trim();
  } catch (err: any) {
    console.error("[warmup-only] Anthropic error:", err.message);
    return json({ error: "LLM error", detail: err.message, debug_fingerprint: DEPLOY_FINGERPRINT }, 500);
  }
  if (!fullText) {
    return json({ error: "Empty LLM response", debug_fingerprint: DEPLOY_FINGERPRINT }, 500);
  }

  // 6. Separa eco da pergunta final (última linha começando com "Vai")
  const lines = fullText.split(/\r?\n/);
  let lastIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^vai\b/i.test(lines[i].trim())) { lastIdx = i; break; }
  }
  const ecoText = lastIdx >= 0 ? lines.slice(0, lastIdx).join("\n").trim() : fullText.trim();
  const followUp = lastIdx >= 0 ? lines[lastIdx].trim() : null;
  const latency_ms = Date.now() - startedAt;

  // 7. Persiste em echoes (kind='warmup_deep_reading')
  // Reusa as questions/responses dos warmups como contexto guardado.
  const allQuestions: string[] = [];
  const allResponses: string[] = [];
  for (const w of warmups as any[]) {
    const qs = Array.isArray(w.questions) ? (w.questions as string[]) : [];
    const rs = Array.isArray(w.responses) ? (w.responses as string[]) : [];
    allQuestions.push(...qs);
    allResponses.push(...rs);
  }

  const { data: inserted, error: insErr } = await admin
    .from("echoes")
    .insert({
      user_id,
      kind: "warmup_deep_reading",
      cycle_id: null,
      questions: allQuestions,
      responses: allResponses,
      eco_text: ecoText,
      follow_up_question: followUp,
      nodes_used: nodeIds,
      model: "claude-sonnet-4-5-20250929",
      latency_ms,
      raw_payload: { full: fullText },
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("[warmup-only] insert err:", insErr);
    return json({ error: "Persist failed", detail: insErr.message, debug_fingerprint: DEPLOY_FINGERPRINT }, 500);
  }

  return json({
    ok: true,
    mode: "warmup-only",
    echo_id: inserted?.id ?? null,
    eco_length: ecoText.length,
    has_follow_up: !!followUp,
    latency_ms,
    nodes_count: nodeIds.length,
    debug_fingerprint: DEPLOY_FINGERPRINT,
  });
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
  const service_role_key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase_url || !supabase_anon || !service_role_key) return json({ error: "Missing config" }, 500);

  const supabase = createClient(supabase_url, supabase_anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  // admin declarado aqui no topo pra ser usado em todas as queries que precisam bypassar RLS
  // (ex: leitura de third_party_responses anônimas pra alimentar deep reading — W20.6.5)
  const admin = createClient(supabase_url, service_role_key);

  const { data: auth_data, error: auth_err } = await supabase.auth.getUser(token);
  if (auth_err || !auth_data.user) return json({ error: "Unauthorized" }, 401);
  const user_id = auth_data.user.id;

  const body = await req.json().catch(() => ({}));
  const { ipe_cycle_id } = body;

  // TA-S6.1b — Modo WARMUP-ONLY: sem cycle_id, gera leitura inicial baseada só no warmup
  if (!ipe_cycle_id) {
    return await handleWarmupOnly(admin, user_id);
  }

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

  // Wave 14 v4 — busca respostas de terceiros (W20.4)
  // W20.6.5 v4.3: usa `admin` (service_role) pra bypassar RLS — garante que
  // respostas anônimas (reveal_identity=false) cheguem ao deep reading mesmo
  // quando RLS bloqueia exibição direta pro user no front.
  let thirdPartyCorpus = "";
  try {
    // Busca invites submitted desse cycle
    const { data: tpInvites, error: invErr } = await admin
      .from("third_party_invites")
      .select("id, question_set, reveal_identity, responder_name")
      .eq("ipe_cycle_id", ipe_cycle_id)
      .eq("status", "submitted");
    if (invErr) console.warn("[lucid-deep-reading] tpInvites err:", invErr);
    if (tpInvites && tpInvites.length > 0) {
      const inviteIds = tpInvites.map((i: any) => i.id);
      const { data: tpResponses, error: respErr } = await admin
        .from("third_party_responses")
        .select("invite_id, question_id, scale_value, open_text, episode_text")
        .in("invite_id", inviteIds);
      if (respErr) console.warn("[lucid-deep-reading] tpResponses err:", respErr);
      if (tpResponses && tpResponses.length > 0) {
        const sections: string[] = [];
        for (const inv of tpInvites) {
          const myResp = (tpResponses as any[]).filter(r => r.invite_id === inv.id);
          if (myResp.length === 0) continue;
          const label = inv.reveal_identity && inv.responder_name
            ? `Pessoa próxima (${inv.responder_name})`
            : `Pessoa próxima (anônimo)`;
          const parts: string[] = [];
          for (const r of myResp) {
            const bits: string[] = [];
            if (r.episode_text) bits.push(r.episode_text);
            if (r.scale_value !== null && r.scale_value !== undefined) bits.push(`(escala ${r.scale_value}/5)`);
            if (r.open_text) bits.push(r.open_text);
            if (bits.length) parts.push(bits.join(" "));
          }
          if (parts.length) {
            sections.push(`[${label}]\n${parts.join(" | ")}`);
          }
        }
        thirdPartyCorpus = sections.join("\n\n");
      }
    }
  } catch (err) {
    console.warn("[lucid-deep-reading] third party fetch failed:", err);
  }

  const pillsCorpus = buildCorpusFromPills((pills ?? []) as PillResponseRow[]);
  const qCorpus = buildCorpusFromQuestionnaire(questionnaire);

  // AFC ONB-6 §4.6 — warm-ups entram como camada leve de fundação (pré-ciclo).
  // NÃO contam como ciclo. NÃO são tema central. Só ressoam se aparecerem juntas
  // com as pills/questionário deste ciclo.
  let warmupCorpus = "";
  try {
    const { data: warmups } = await admin
      .from("echoes")
      .select("questions, responses, created_at")
      .eq("user_id", user_id)
      .eq("kind", "warmup")
      .order("created_at", { ascending: true });

    if (warmups && warmups.length > 0) {
      const blocks: string[] = [];
      for (const w of warmups as any[]) {
        const qs = Array.isArray(w.questions) ? (w.questions as string[]) : [];
        const rs = Array.isArray(w.responses) ? (w.responses as string[]) : [];
        const pairs: string[] = [];
        for (let i = 0; i < Math.min(qs.length, rs.length); i++) {
          pairs.push(`P: ${qs[i]}\nR: ${rs[i]}`);
        }
        if (pairs.length) blocks.push(pairs.join("\n\n"));
      }
      warmupCorpus = blocks.join("\n\n---\n\n");
    }
  } catch (err) {
    console.warn("[lucid-deep-reading] warmup fetch failed:", err);
  }

  if (!pillsCorpus && !qCorpus && !thirdPartyCorpus && !warmupCorpus) {
    return json({
      ok: true,
      skipped: "no data yet",
      debug_fingerprint: DEPLOY_FINGERPRINT,
    });
  }

  // Monta corpus combinado, separando seções pra Sonnet entender origem
  const sections: string[] = [];
  if (pillsCorpus) sections.push(`=== O QUE A PESSOA DISSE NAS PILLS ===\n${pillsCorpus}`);
  if (qCorpus) sections.push(`=== O QUE A PESSOA DISSE NO QUESTIONÁRIO ===\n${qCorpus}`);
  if (thirdPartyCorpus) sections.push(`=== O QUE PESSOAS PRÓXIMAS DESCREVERAM (perspectiva externa) ===\n${thirdPartyCorpus}`);
  if (warmupCorpus) sections.push(`=== RESPOSTAS DO WARM-UP (pré-ciclo, camada leve de fundação — NÃO trate como tema central; só use se ressoar com o que aparece nas pills/questionário) ===\n${warmupCorpus}`);
  const corpus = sections.join("\n\n");
  console.log(`[lucid-deep-reading] corpus length: ${corpus.length} (third_party: ${thirdPartyCorpus.length} chars, warmup: ${warmupCorpus.length} chars)`);

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
      max_tokens: 1000,
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
  // (admin já declarado no topo — reusa)
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
    debug_third_party_chars: deep_reading.length > 0 ? thirdPartyCorpus.length : 0,
    debug_pills_chars: pillsCorpus.length,
    debug_questionnaire_chars: qCorpus.length,
    debug_total_corpus_chars: corpus.length,
  });
});
