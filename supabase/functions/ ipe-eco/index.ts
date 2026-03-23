// ============================================================
// ipe-eco/index.ts
// Fonte: PIPELINE_IMPLEMENTACAO_IPE_MVP v1.1 §4.6 + §6.1
// PILL_I–VI_Prototipo v0.3 — estrutura do Eco M5
// ipe-eco v1.1 — regras de forma (Regras 1–4)
//
// Responsabilidade: geração do Eco M5 por Pill
// Input:  { ipe_cycle_id, pill_id }          (EcoInput  — ipe_types.ts §5.5)
// Output: { eco_text, scoring_audit_id }      (EcoOutput — ipe_types.ts §5.5)
// LLM: 1 chamada (Sonnet, temp 0.7) — texto livre
// Persiste: pill_responses.eco_text (AFC C4) + scoring_audit (rastreabilidade)
//
// Idempotência: se eco_text já existe em pill_responses, retorna sem nova chamada LLM.
// Degradação graciosa: se LLM falhar após MAX_RETRIES,
//   retorna eco_text de fallback bilíngue (não bloqueia M5).
//
// Prompt: carregado de prompt_versions (component=eco_PI…eco_PVI) quando disponível.
//   Fallback para prompt embedded (EMBEDDED_PROMPT_VERSION) se tabela vazia.
//   TODO pós-piloto: seed eco_PI…eco_PVI em prompt_versions e remover embedded.
//
// nivel_persona: detectado via detectStubPersona para o piloto.
//   TODO pós-piloto: derivar de canonical_ils.confianca_global.
//   Injetado no user_message (não no system prompt) para evitar interferência
//   com o conteúdo do prompt versionado.
//
// Dívida técnica conhecida:
//   - M3_2_opcao_escolhida persiste apenas a letra (A/B/C/D), não o texto da opção.
//     O LLM infere sentido via abre_mao + followup. Fix real exige mudança em
//     ipe-pill-session para persistir o texto da opção escolhida.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";
import {
  type PillId,
  detectStubPersona,
} from "../_shared/ipe_types.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const ECO_MODEL = "claude-sonnet-4-20250514";
const ECO_TEMPERATURE = 0.7;
const MAX_RETRIES = 1;
const EMBEDDED_PROMPT_VERSION = "embedded-v1.0";

type NivelPersona = "B" | "M" | "A";

function detectNivelPersona(ipe_cycle_id: string): NivelPersona {
  const persona = detectStubPersona(ipe_cycle_id);
  if (persona === "P2-B" || persona === "P5-B") return "B";
  if (persona === "P7-A") return "A";
  return "M";
}

// ─────────────────────────────────────────
// PROIBIÇÕES E INSTRUÇÕES ESPECIAIS POR PILL
// Fonte: PILL_I–VI_Prototipo v0.3 — §Eco
// ─────────────────────────────────────────
const PILL_META: Record<PillId, {
  tensao: string;
  proibicoes: string;
  instrucao_especial: string;
}> = {
  PI: {
    tensao: "I ↔ Belonging",
    proibicoes: `Proibido no Eco de PI: "pertencimento", "você sempre foi", "quem você é", "você sabe quem é", "você pertence", "lugar de origem". Não resolve a tensão entre o que ficou e o que não seguiu — honra o custo real do deslocamento sem fechar.`,
    instrucao_especial: `PI: tensão entre eu e pertencimento. O eco registra o que o deslocamento revelou sobre o que a pessoa carrega consigo — não resolve onde ela pertence.`,
  },
  PII: {
    tensao: "I ↔ Role",
    proibicoes: `Proibido no Eco de PII: "papel", "função", "missão", "propósito profissional", "o que você deve fazer", "sua vocação". Não define o papel correto — observa a tensão entre o que a pessoa faz e o que sente em relação a isso.`,
    instrucao_especial: `PII: tensão entre eu e papel exercido. O eco registra o que a desconexão revelou — não resolve qual papel a pessoa deve ter.`,
  },
  PIII: {
    tensao: "Presence ↔ Distance",
    proibicoes: `Proibido no Eco de PIII: "agora você sabe", "a lição que fica", "você cresceu", "tudo faz sentido", "valeu a pena", "fechou um ciclo", "superou". Nunca fecha a retrospectiva — a distância traz clareza e perda simultaneamente.`,
    instrucao_especial: `PIII: tensão entre presença e distância. A distância trouxe clareza — e também custou algo. O eco honra ambas, sem concluir que valeu a pena.`,
  },
  PIV: {
    tensao: "Clarity ↔ Action",
    proibicoes: `Proibido no Eco de PIV: "agora é hora de agir", "você sabe o que fazer", "o caminho está claro", "basta executar", "o próximo passo é". Não resolve a tensão entre saber e agir — registra o custo de carregar clareza sem movimento.`,
    instrucao_especial: `PIV: tensão entre clareza e ação. A pessoa sabe o que é certo — carrega o peso de não ter agido, ou de ter agido com custo. O eco não prescreve movimento.`,
  },
  PV: {
    tensao: "Inside ↔ Outside",
    proibicoes: `Proibido no Eco de PV: "o que você busca é", "a resposta pode estar em", "você está pronto para", "o próximo passo é", "seu propósito", "sua missão", "o que você quer de verdade". A abertura é a condição de PV — o eco a honra, não a preenche.`,
    instrucao_especial: `PV: tensão entre dentro e fora. Não há crise — há abertura sem destino ainda. O eco não nomeia o que a pessoa busca — registra que essa abertura existe e muda quem a carrega.`,
  },
  PVI: {
    tensao: "Movement ↔ Pause",
    proibicoes: `Proibido no Eco de PVI: "você precisa descansar", "o ritmo está te consumindo", "pare antes que seja tarde", "o sucesso tem um preço", "você está construindo algo grandioso". Não julga o ritmo nem valida o custo como inevitável — registra o que a construção está pedindo e o que está sendo cobrado.`,
    instrucao_especial: `PVI: tensão entre movimento e pausa. Algo está sendo construído — e o ritmo está cobrando algo. O eco não conclui que a pausa é necessária ou que o movimento deve continuar.`,
  },
};

// ─────────────────────────────────────────
// CORPUS PARA GERAÇÃO DO ECO
// Prioridade: M4 > M3.3 > M3.2 > M3.1 > M2
// Fonte: PILL_I–VI_Prototipo v0.3 — Elemento 1 (âncora)
//
// Todos os valores do usuário são serializados com JSON.stringify
// para escapar aspas literais e evitar formato malformado no prompt.
// ─────────────────────────────────────────
function buildEcoCorpus(
  pillId: PillId,
  pillResponse: Record<string, unknown>
): { corpus: string; m2Text: string; m4Text: string } {
  const parts: string[] = [];
  let m2Text = "";
  let m4Text = "";

  // M4 — âncora principal (Elemento 1, prioridade 1)
  if (pillResponse.m4_resposta) {
    const m4 = pillResponse.m4_resposta as Record<string, unknown>;
    if (m4.percepcao) {
      const v = String(m4.percepcao);
      m4Text = v;
      parts.push(`M4_percepcao: ${JSON.stringify(v)}`);
    }
    if (pillId === "PI" && m4.presenca_deslocamento) {
      parts.push(`M4_presenca_deslocamento: ${JSON.stringify(String(m4.presenca_deslocamento))}`);
    }
    if (pillId === "PV") {
      if (m4.conhecimento_em_campo) {
        parts.push(`M4_conhecimento_em_campo: ${JSON.stringify(String(m4.conhecimento_em_campo))}`);
      }
      if (m4.presenca_para_outros) {
        parts.push(`M4_presenca_para_outros: ${JSON.stringify(String(m4.presenca_para_outros))}`);
      }
    } else if (m4.presenca_para_outros) {
      parts.push(`M4_presenca_para_outros: ${JSON.stringify(String(m4.presenca_para_outros))}`);
    }
  }

  // M3 (prioridades 2, 3, 4)
  if (pillResponse.m3_respostas) {
    const m3 = pillResponse.m3_respostas as Record<string, unknown>;

    const inv = m3.M3_3_inventario as Record<string, unknown> | undefined;
    if (inv) {
      if (inv.narrativa) parts.push(`M3_3_narrativa: ${JSON.stringify(String(inv.narrativa))}`);
      if (inv.condicao) parts.push(`M3_3_condicao_possibilidade: ${JSON.stringify(String(inv.condicao))}`);
    }

    const escolha = m3.M3_2_escolha as Record<string, unknown> | undefined;
    if (escolha) {
      // Apenas letra persistida — texto da opção não está disponível (dívida técnica declarada)
      if (escolha.opcao) parts.push(`M3_2_opcao_escolhida: ${JSON.stringify(String(escolha.opcao))}`);
      if (escolha.abre_mao) parts.push(`M3_2_o_que_abre_mao: ${JSON.stringify(String(escolha.abre_mao))}`);
      if (escolha.followup_C) parts.push(`M3_2_followup: ${JSON.stringify(String(escolha.followup_C))}`);
      if (escolha.followup_D) parts.push(`M3_2_followup: ${JSON.stringify(String(escolha.followup_D))}`);
    }

    const regua = m3.M3_1_regua as Record<string, unknown> | undefined;
    if (regua) {
      if (regua.duas_palavras) parts.push(`M3_1_duas_palavras: ${JSON.stringify(String(regua.duas_palavras))}`);
      if (regua.situacao_oposta) parts.push(`M3_1_situacao_oposta: ${JSON.stringify(String(regua.situacao_oposta))}`);
    }
  }

  // M2 — contexto de fundo
  if (pillResponse.m2_resposta) {
    const v = String(pillResponse.m2_resposta);
    m2Text = v;
    parts.push(`M2_abertura: ${JSON.stringify(v)}`);
  }

  // CAL signals — contexto adicional
  if (pillResponse.m2_cal_signals) {
    const cal = pillResponse.m2_cal_signals as Record<string, unknown>;
    const calParts: string[] = [];
    if (cal.localizacao) calParts.push(`localizacao:${cal.localizacao}`);
    if (cal.custo) calParts.push(`custo:${cal.custo}`);
    if (cal.foco) calParts.push(`foco:${cal.foco}`);
    if (cal.horizonte) calParts.push(`horizonte:${cal.horizonte}`);
    if (calParts.length) parts.push(`CAL_signals: ${calParts.join(", ")}`);
  }

  return { corpus: parts.join("\n"), m2Text, m4Text };
}

// ─────────────────────────────────────────
// DETECÇÃO DE IDIOMA
// Aplicada apenas sobre texto livre do usuário (m2_resposta + m4_percepcao),
// não sobre o corpus completo que contém labels do sistema em inglês.
// ─────────────────────────────────────────
function detectLanguage(m2Text: string, m4Text: string): "pt" | "en" {
  const freeText = `${m2Text} ${m4Text}`.trim();
  if (!freeText) return "pt";

  const enScore = (freeText.match(/\b(I|my|we|you|the|and|was|were|have|had|felt|it's|didn't|don't|that|this|when|they|there)\b/gi) || []).length;
  const ptScore = (freeText.match(/\b(eu|meu|minha|você|nós|que|com|para|mas|não|uma|esse|isso|quando|ela|ele|havia|fui|foi|tinha|estou|estava)\b/gi) || []).length;

  return enScore > ptScore ? "en" : "pt";
}

// ─────────────────────────────────────────
// SYSTEM PROMPT EMBEDDED
// Fonte: PILL_I–VI_Prototipo v0.3 + ipe-eco v1.1 (Regras 1–4)
// Não recebe nivel_persona — injetado no user_message para evitar
// interferência com prompts versionados que podem ter estrutura própria.
// ─────────────────────────────────────────
function buildEmbeddedSystemPrompt(pillId: PillId): string {
  const meta = PILL_META[pillId];

  return `Você é a Luce. Gere o Eco M5 de uma Pill do sistema IPE.

O Eco é o que a Luce diz à pessoa ao final da Pill: alguém que esteve presente, entendeu, e devolve algo real — não relatório, não terapia, não análise.

IDIOMA: Responda SEMPRE no mesmo idioma em que a pessoa escreveu no corpus. Nunca mude de idioma.

---

## TENSÃO DESTA PILL: ${meta.tensao}

${meta.instrucao_especial}

---

## ESTRUTURA DO ECO (IPE 1)

**Elemento 1 — Espelho**
Âncora nas palavras exatas da pessoa. Prioridade de fonte:
1. M4_percepcao (o que ficou, o que percebeu)
2. M3_3 — condição de possibilidade do Inventário
3. M3_2 — follow-up da Escolha
4. M3_1 — duas palavras da Régua

Regra absoluta: use o vocabulário da pessoa sem substituição. Se ela disse "perdida", use "perdida". Se disse "travada", use "travada".

**Elemento 2 — Observação de snapshot**
Observação sobre o que apareceu NESTE ciclo específico.
Linguagem obrigatória: "hoje", "neste momento", "o que apareceu agora".
Deve ser verdadeira APENAS para esta pessoa neste ciclo.

**Elemento 3 — Abertura**
Pergunta final aberta e não-resolutiva:
- Admite pelo menos duas respostas legítimas distintas
- Sem resposta implícita
- Não retórica
- Parte de objeto concreto nomeado pela pessoa
Estrutura típica: "A pergunta que fica não é [o óbvio]. É [o que ainda está aberto]."

---

## REGRAS DE FORMA (ipe-eco v1.1)

**Regra 1 — Snapshot:** Verbos sobre o que ocorreu no ciclo em passado simples.
CORRETO: "O custo foi calculado antes de agir."
ERRADO: "Você calcula o custo antes de agir."
Proibido absolutamente: "padrão", "sempre", "costuma", "tende a", "geralmente", "recorrentemente", "de forma consistente".

**Regra 2 — Termos proibidos:** "modo de ser", "mecanismo interno", "trajetória", "desenvolvimento", "estrutura" (quando sinônimo de arquitetura psicológica).

**Regra 3 — Pergunta final:** Aberta, não-resolutiva, parte de objeto concreto nomeado pela pessoa.

**Regra 4 — Âncoras:** Vocabulário da pessoa preservado sem substituição por equivalentes genéricos.

---

## PROIBIÇÕES DESTA PILL

${meta.proibicoes}

---

## VOZ DA LUCE

Tom: humano, próximo, sem invasão. Não dramatiza. Não amplifica além do que a pessoa disse.
EVITAR: "isso deve ter sido difícil", "que coragem", "você foi muito honesto".
BUSCAR: presença que reconhece sem performar.

Comprimento: até 4 frases + pergunta final. Cada frase com peso estrutural — se pode ser removida sem perda de significado, remover.

---

Retorne APENAS o texto do Eco. Sem prefácio, sem metadados, sem aspas. Só o texto que a pessoa vai ler.`;
}

// ─────────────────────────────────────────
// INSTRUÇÃO DE NÍVEL — injetada no user_message
// Mantida fora do system prompt para não interferir com prompts versionados.
// Fonte: ipe-escrita v0.6 §Princípio 3
// ─────────────────────────────────────────
function nivelInstrucao(nivel: NivelPersona): string {
  if (nivel === "B") return "Nível da persona: B. Prefira frases curtas, uma ideia por frase.";
  if (nivel === "A") return "Nível da persona: A. Mantenha complexidade sintática quando serve a uma distinção real.";
  return "Nível da persona: M. Duas camadas permitidas, cada uma em frase própria.";
}

// ─────────────────────────────────────────
// FALLBACK bilíngue
// Detectado pelo idioma do texto livre, não do corpus completo.
// ─────────────────────────────────────────
function getFallbackEco(lang: "pt" | "en"): string {
  return lang === "en"
    ? "You kept it brief — which means what stayed was clear to you, even if less visible to me.\n\nWhat did you notice in yourself answering this?"
    : "Você respondeu de forma breve — o que ficou mais claro para você do que para mim.\n\nO que você percebeu nesta leitura?";
}

// ─────────────────────────────────────────
// PERSISTÊNCIA COM DEGRADAÇÃO GRACIOSA
// Cada operação tratada independentemente — falha de audit não bloqueia eco.
// ─────────────────────────────────────────
async function persistAudit(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("scoring_audit").insert(payload);
  if (error) console.error("ECO_AUDIT_INSERT_ERROR:", error);
}

async function persistEcoText(
  supabase: ReturnType<typeof createClient>,
  ipe_cycle_id: string,
  pill_id: string,
  eco_text: string
): Promise<void> {
  const { error } = await supabase
    .from("pill_responses")
    .update({ eco_text })
    .eq("ipe_cycle_id", ipe_cycle_id)
    .eq("pill_id", pill_id);
  if (error) console.error("ECO_TEXT_PERSIST_ERROR:", error);
}

// ─────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "INVALID_INPUT", message: "Method not allowed" }, 400);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "UNAUTHORIZED", message: "Missing authorization" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_INPUT", message: "Body must be valid JSON" }, 400);
  }

  const { ipe_cycle_id, pill_id } = body;
  if (typeof ipe_cycle_id !== "string" || typeof pill_id !== "string") {
    return json({ error: "INVALID_INPUT", message: "ipe_cycle_id and pill_id required" }, 400);
  }

  const VALID_PILLS: PillId[] = ["PI", "PII", "PIII", "PIV", "PV", "PVI"];
  if (!VALID_PILLS.includes(pill_id as PillId)) {
    return json({ error: "INVALID_INPUT", message: "pill_id inválido" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return json({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);

  // Ownership check — padrão B4 FIX (ipe-questionnaire-engine)
  const { data: cycleCheck, error: cycleCheckErr } = await supabase
    .from("ipe_cycles")
    .select("id, status")
    .eq("id", ipe_cycle_id)
    .eq("user_id", user.id)
    .single();

  if (cycleCheckErr || !cycleCheck) {
    return json({ error: "NOT_FOUND", message: "Cycle not found" }, 404);
  }
  if (cycleCheck.status === "abandoned") {
    return json({ error: "INVALID_INPUT", message: "Cycle is abandoned" }, 400);
  }

  const { data: pillResponse, error: prErr } = await supabase
    .from("pill_responses")
    .select("*")
    .eq("ipe_cycle_id", ipe_cycle_id)
    .eq("pill_id", pill_id)
    .maybeSingle();

  if (prErr || !pillResponse) {
    return json({ error: "NOT_FOUND", message: "Pill response not found" }, 404);
  }
  if (!pillResponse.completed_at) {
    return json({ error: "INVALID_INPUT", message: "Pill M4 not yet completed" }, 400);
  }

  // Idempotência — scoring_audit_id retorna "" no cache (contrato EcoOutput exige string)
  if (pillResponse.eco_text) {
    return json({ eco_text: pillResponse.eco_text, scoring_audit_id: "", cached: true }, 200);
  }

  const component = `eco_${pill_id}`;
  const { data: promptRow } = await supabase
    .from("prompt_versions")
    .select("id, version, prompt_text")
    .eq("component", component)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let systemPrompt: string;
  let promptVersion: string;

  if (promptRow?.prompt_text) {
    systemPrompt = promptRow.prompt_text;
    promptVersion = promptRow.version;
  } else {
    systemPrompt = buildEmbeddedSystemPrompt(pill_id as PillId);
    promptVersion = EMBEDDED_PROMPT_VERSION;
    console.warn(`ECO_PROMPT_FALLBACK: no active prompt for ${component}, using ${promptVersion}`);
  }

  const { corpus, m2Text, m4Text } = buildEcoCorpus(
    pill_id as PillId,
    pillResponse as Record<string, unknown>
  );
  const lang = detectLanguage(m2Text, m4Text);
  const nivel = detectNivelPersona(ipe_cycle_id);

  const hasMinCorpus = corpus.includes("M4_percepcao") || corpus.includes("M3_3_narrativa");
  const auditId = crypto.randomUUID();

  if (!hasMinCorpus) {
    const fallback = getFallbackEco(lang);
    await persistAudit(supabase, {
      id: auditId, ipe_cycle_id, component,
      prompt_version: promptVersion, input_tokens: 0, output_tokens: 0,
      raw_output: "[corpus_insuficiente — fallback]",
      parsed_output: { eco_text: fallback, reason: "corpus_insuficiente" },
      parse_success: false, retry_count: 0, model: "FALLBACK",
    });
    await persistEcoText(supabase, ipe_cycle_id, pill_id, fallback);
    return json({ eco_text: fallback, scoring_audit_id: auditId, fallback: true }, 200);
  }

  const userMessage =
    `${nivelInstrucao(nivel)}\n\n` +
    `Gere o Eco M5 para esta pessoa com base no corpus abaixo.\n\n` +
    `===CORPUS===\n${corpus}\n\n` +
    `Retorne apenas o texto do Eco. Nada mais.`;

  let ecoText = "";
  let success = false;
  let input_tokens = 0;
  let output_tokens = 0;
  let last_raw = "";
  let retry_count = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retry_count = attempt;
    try {
      const response = await anthropic.messages.create({
        model: ECO_MODEL,
        max_tokens: 512,
        temperature: ECO_TEMPERATURE,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      input_tokens = response.usage?.input_tokens ?? 0;
      output_tokens = response.usage?.output_tokens ?? 0;
      last_raw = (response.content[0] as { type: string; text: string }).text.trim();

      if (last_raw.length < 20) {
        console.warn(`ECO_TOO_SHORT attempt=${attempt}`);
        continue;
      }

      ecoText = last_raw;
      success = true;
      break;
    } catch (err) {
      console.error(`ECO_LLM_ERROR attempt=${attempt}:`, err);
      last_raw = `[error: ${err instanceof Error ? err.message : String(err)}]`;
    }
  }

  if (!success || !ecoText) {
    ecoText = getFallbackEco(lang);
  }

  await persistAudit(supabase, {
    id: auditId, ipe_cycle_id, component,
    prompt_version: promptVersion, input_tokens, output_tokens,
    raw_output: last_raw,
    parsed_output: { eco_text: ecoText },
    parse_success: success, retry_count,
    model: success ? ECO_MODEL : "FALLBACK",
  });
  await persistEcoText(supabase, ipe_cycle_id, pill_id, ecoText);

  return json({ eco_text: ecoText, scoring_audit_id: auditId }, 200);
});
