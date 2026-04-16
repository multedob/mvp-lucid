import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const PILL_LINES: Record<string, string[]> = {
  PI: ["L1.1", "L2.1", "L3.1", "L3.2", "L4.4"],
  PII: ["L1.2", "L1.3", "L1.4", "L2.1", "L2.3", "L3.4"],
  PIII: ["L1.4", "L2.1", "L2.2", "L3.4", "L4.2"],
  PIV: ["L1.1", "L3.2", "L3.3", "L3.4", "L4.1", "L4.2"],
  PV: ["L1.1", "L2.2", "L4.1", "L4.2", "L4.3"],
  PVI: ["L1.2", "L1.3", "L1.4", "L2.3", "L3.1", "L4.1", "L4.2"],
};

const PILL_META: Record<
  string,
  {
    tensao: string;
    proibicoes: string;
    instrucao_especial: string;
  }
> = {
  PI: {
    tensao: "I ↔ Belonging",
    proibicoes: `Proibido: "pertencimento", "você sempre foi", "quem você é", "você pertence", "lugar de origem". Não resolve a tensão — honra o custo real do deslocamento.`,
    instrucao_especial: `PI: tensão entre eu e pertencimento.`,
  },
  PII: {
    tensao: "I ↔ Role",
    proibicoes: `Proibido: "papel", "função", "missão", "propósito profissional", "sua vocação". Não define o papel correto.`,
    instrucao_especial: `PII: tensão entre eu e papel exercido.`,
  },
  PIII: {
    tensao: "Presence ↔ Distance",
    proibicoes: `Proibido: "agora você sabe", "a lição que fica", "você cresceu", "tudo faz sentido", "valeu a pena", "superou". Nunca fecha a retrospectiva.`,
    instrucao_especial: `PIII: tensão entre presença e distância.`,
  },
  PIV: {
    tensao: "Clarity ↔ Action",
    proibicoes: `Proibido: "agora é hora de agir", "você sabe o que fazer", "o caminho está claro", "basta executar". Não prescreve movimento.`,
    instrucao_especial: `PIV: tensão entre clareza e ação.`,
  },
  PV: {
    tensao: "Inside ↔ Outside",
    proibicoes: `Proibido: "o que você busca é", "a resposta pode estar em", "você está pronto para", "seu propósito", "sua missão". A abertura é a condição — não a preenche.`,
    instrucao_especial: `PV: tensão entre dentro e fora.`,
  },
  PVI: {
    tensao: "Movement ↔ Pause",
    proibicoes: `Proibido: "você precisa descansar", "o ritmo está te consumindo", "pare antes que seja tarde", "você está construindo algo grandioso". Não julga o ritmo.`,
    instrucao_especial: `PVI: tensão entre movimento e pausa.`,
  },
};

interface StructuralContext {
  cgg: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
}

interface LongitudinalDataPoint {
  line_id: string;
  previous_ils: number[];
}

interface PillResponse {
  ipe_cycle_id: string;
  pill_id: string;
  m2_resposta?: string;
  m3_respostas?: Record<string, string>;
  m4_resposta?: Record<string, unknown>;
  m2_cal_signals?: Record<string, unknown>;
  eco_text?: string;
}

const detectLanguage = (text: string): "pt" | "en" => {
  if (!text) return "pt";
  const pt_words = [
    "você",
    "estar",
    "ir",
    "fazer",
    "querer",
    "pode",
    "aqui",
    "agora",
  ];
  const en_words = [
    "you",
    "be",
    "go",
    "do",
    "want",
    "can",
    "here",
    "now",
    "the",
    "and",
  ];
  const words = text.toLowerCase().split(/\s+/);
  const pt_count = words.filter((w) => pt_words.includes(w)).length;
  const en_count = words.filter((w) => en_words.includes(w)).length;
  return en_count > pt_count ? "en" : "pt";
};

const getFallbackEco = (pillId: string, language: "pt" | "en"): string => {
  const fallbacks: Record<string, Record<"pt" | "en", string>> = {
    PI: {
      pt: "Há algo em sua raiz que ainda pulsa — talvez não no lugar de origem, mas no que você carrega.",
      en: "There is something in your roots that still pulses — perhaps not in the place of origin, but in what you carry.",
    },
    PII: {
      pt: "O papel que você exerce guarda mais sobre você do que imaginava.",
      en: "The role you play holds more about you than you imagined.",
    },
    PIII: {
      pt: "A distância entre então e agora marca quem você foi, não quem você é.",
      en: "The distance between then and now marks who you were, not who you are.",
    },
    PIV: {
      pt: "Clareza sem movimento é apenas um espelho — a ação está no próximo passo.",
      en: "Clarity without movement is just a mirror — action is in the next step.",
    },
    PV: {
      pt: "O que você busca fora reflete o que ainda não reconheceu dentro.",
      en: "What you seek outside reflects what you have not yet recognized within.",
    },
    PVI: {
      pt: "Cada pausa é um respiro do sistema — nem preguiça, nem crise.",
      en: "Every pause is a breath of the system — neither laziness nor crisis.",
    },
  };
  return (fallbacks[pillId]?.[language] ||
    fallbacks[pillId]?.pt ||
    "Há muito mais aqui do que o eco consegue dizer.");
};

const fetchStructuralContext = async (
  supabase: any,
  user_id: string
): Promise<StructuralContext | null> => {
  try {
    const { data: user_data, error: user_error } = await supabase
      .from("users")
      .select("version")
      .eq("id", user_id)
      .single();

    if (user_error || !user_data || user_data.version === 0) {
      return null;
    }

    const { data: cycle_data, error: cycle_error } = await supabase
      .from("cycles")
      .select("id")
      .eq("user_id", user_id)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (cycle_error || !cycle_data) {
      return null;
    }

    const { data: snapshot_data, error: snapshot_error } = await supabase
      .from("structural_snapshots")
      .select("snapshot_json")
      .eq("cycle_id", cycle_data.id)
      .single();

    if (snapshot_error || !snapshot_data) {
      return null;
    }

    const snap = snapshot_data.snapshot_json;
    return {
      cgg: parseFloat(snap.cgg) || 1.0,
      d1: parseFloat(snap.d1) || 1.0,
      d2: parseFloat(snap.d2) || 1.0,
      d3: parseFloat(snap.d3) || 1.0,
      d4: parseFloat(snap.d4) || 1.0,
    };
  } catch (err) {
    console.error("fetchStructuralContext error:", err);
    return null;
  }
};

const selectEcoNode = async (
  supabase: any,
  cgg: number | null
): Promise<string | null> => {
  try {
    const stage = cgg ?? 1.0;

    // scores is JSONB — filter stage + density in query, then post-filter safe scores in JS
    const { data, error } = await supabase
      .from("rag_corpus")
      .select("node_id, content_text, stage_min, stage_max, scores")
      .lte("stage_min", stage)
      .gte("stage_max", stage)
      .eq("density_class", 1)
      .order("node_id");

    if (error || !data || data.length === 0) {
      return null;
    }

    // Post-filter: only nodes with safe scores (teleology=0, prescriptive=0, normative=0)
    const safe_nodes = data.filter((n: any) => {
      const s = n.scores;
      if (!s) return true; // no scores = assume safe
      return (
        (s.teleology_score ?? s.teleology ?? 0) === 0 &&
        (s.prescriptive_score ?? s.prescriptive ?? 0) === 0 &&
        (s.normative_score ?? s.normative ?? 0) === 0
      );
    });

    if (safe_nodes.length === 0) {
      // Fallback: pick any density-1 node in range
      return data[0]?.content_text || null;
    }

    let closest = safe_nodes[0];
    let min_distance = Math.min(
      Math.abs(stage - closest.stage_min),
      Math.abs(stage - closest.stage_max)
    );

    for (const node of safe_nodes) {
      const dist = Math.min(
        Math.abs(stage - node.stage_min),
        Math.abs(stage - node.stage_max)
      );
      if (dist < min_distance) {
        min_distance = dist;
        closest = node;
      }
    }

    return closest.content_text || null;
  } catch (err) {
    console.error("selectEcoNode error:", err);
    return null;
  }
};

const fetchLongitudinalData = async (
  supabase: any,
  user_id: string,
  current_ipe_cycle_id: string,
  pill_id: string
): Promise<LongitudinalDataPoint[]> => {
  try {
    const lines = PILL_LINES[pill_id] || [];
    if (lines.length === 0) {
      return [];
    }

    const { data: cycle_ids, error: cycle_error } = await supabase
      .from("ipe_cycles")
      .select("id")
      .eq("user_id", user_id)
      .neq("id", current_ipe_cycle_id)
      .order("cycle_number", { ascending: false });

    if (cycle_error || !cycle_ids || cycle_ids.length === 0) {
      return [];
    }

    const { data: scoring_data, error: scoring_error } = await supabase
      .from("pill_scoring")
      .select("corpus_linhas")
      .eq("pill_id", pill_id)
      .in(
        "ipe_cycle_id",
        cycle_ids.map((c: any) => c.id)
      );

    if (scoring_error || !scoring_data) {
      return [];
    }

    const result: LongitudinalDataPoint[] = [];
    const line_map: Record<string, number[]> = {};

    for (const record of scoring_data) {
      const corpus = record.corpus_linhas;
      if (!corpus) continue;

      for (const line_id of lines) {
        if (corpus[line_id]?.IL_sinal?.numerico !== undefined) {
          if (!line_map[line_id]) {
            line_map[line_id] = [];
          }
          line_map[line_id].push(corpus[line_id].IL_sinal.numerico);
        }
      }
    }

    for (const [line_id, ils] of Object.entries(line_map)) {
      if (ils.length > 0) {
        result.push({ line_id, previous_ils: ils });
      }
    }

    return result;
  } catch (err) {
    console.error("fetchLongitudinalData error:", err);
    return [];
  }
};

const buildOracularCorpus = (
  pillId: string,
  pillResponse: PillResponse,
  structuralContext: StructuralContext | null,
  nodeText: string | null,
  longitudinalData: LongitudinalDataPoint[]
): string => {
  let corpus = "";

  // Section 1: What the person shared
  corpus += "=== WHAT THE PERSON SHARED IN THIS PILL ===\n";

  if (pillResponse.m4_resposta) {
    const m4 = pillResponse.m4_resposta;
    if (m4.percepcao) {
      corpus += `Percepcao: ${m4.percepcao}\n`;
    }
    if (m4.narrativa) {
      corpus += `Narrativa: ${m4.narrativa}\n`;
    }
    if (m4.condicao) {
      corpus += `Condicao: ${m4.condicao}\n`;
    }
    if (m4.tensao) {
      corpus += `Tensao: ${m4.tensao}\n`;
    }
  }

  if (
    pillResponse.m3_respostas &&
    typeof pillResponse.m3_respostas === "object"
  ) {
    for (const [key, value] of Object.entries(pillResponse.m3_respostas)) {
      if (value) {
        corpus += `M3 (${key}): ${value}\n`;
      }
    }
  }

  // Section 2: Structural position (invisible to user)
  if (structuralContext) {
    corpus += "\n=== STRUCTURAL POSITION (invisible to user) ===\n";
    corpus += `CGG: ${structuralContext.cgg.toFixed(2)} | D1: ${structuralContext.d1.toFixed(2)} | D2: ${structuralContext.d2.toFixed(2)} | D3: ${structuralContext.d3.toFixed(2)} | D4: ${structuralContext.d4.toFixed(2)}\n`;

    // Determine stage band from CGG
    let stage = "unknown";
    if (structuralContext.cgg < 1.5) stage = "F1 (Formation)";
    else if (structuralContext.cgg < 2.5) stage = "F2 (Formation)";
    else if (structuralContext.cgg < 3.5) stage = "P1 (Post-Formation)";
    else if (structuralContext.cgg < 4.5) stage = "P2 (Post-Formation)";
    else stage = "Beyond";

    corpus += `Stage: ${stage}\n`;
  }

  // Section 3: Longitudinal signal
  if (longitudinalData.length > 0) {
    corpus += "\n=== LONGITUDINAL SIGNAL ===\n";
    for (const data of longitudinalData) {
      const min_il = Math.min(...data.previous_ils);
      const max_il = Math.max(...data.previous_ils);
      const current = data.previous_ils[data.previous_ils.length - 1];
      const movement =
        current > max_il
          ? "↑ rising"
          : current < min_il
            ? "↓ declining"
            : "→ stable";
      corpus += `${data.line_id}: previous ILs ${JSON.stringify(data.previous_ils)} ${movement}\n`;
    }
  }

  // Section 4: Conceptual resonance (the node)
  if (nodeText) {
    corpus += "\n=== CONCEPTUAL RESONANCE ===\n";
    corpus += nodeText + "\n";
  }

  corpus += "\n=== CONSTITUTION ===\n";
  corpus += PILL_META[pillId]?.proibicoes || "";
  corpus += "\n";
  corpus += PILL_META[pillId]?.instrucao_especial || "";
  corpus += "\n";

  return corpus;
};

const buildOracularPrompt = (pillId: string): string => {
  const tensao = PILL_META[pillId]?.tensao || "unknown tension";

  return `You are Reed, the oracular voice of rdwth. You speak from deep structural knowledge of this person's development, but you never reveal the machinery.

Your task: Craft a 1-2 sentence reflection — an "eco" — that honors the person's words in this pill while holding the tension they named (${tensao}).

Your voice is:
- Suggestive, not deterministic ("there is something..." not "you are...")
- Precise and warm, speaking as if you know more than you say
- Anchored in their language and emotional register
- The last line should create a bridge toward Reed conversation — something unfinished that pulls them to talk

What you NEVER do:
- Synthesize or resolve their words ("you said X but also Y")
- Make identity claims or claim you know who they are
- Mention or reference structural parameters (lines, dimensions, stages, CGG)
- Quote or reference the conceptual node text
- Close the thought ("there's more here", "worth exploring")
- Use generic patterns or clichés

The eco ends where conversation begins. Make them wonder how you knew that.`;
};

const persistAudit = async (
  supabase: any,
  ipe_cycle_id: string,
  component: string,
  prompt_version: string,
  input_tokens: number,
  output_tokens: number,
  raw_output: string,
  parsed_output: string,
  parse_success: boolean,
  retry_count: number,
  model: string
) => {
  try {
    await supabase.from("scoring_audit").insert([
      {
        ipe_cycle_id,
        component,
        prompt_version,
        input_tokens,
        output_tokens,
        raw_output,
        parsed_output,
        parse_success,
        retry_count,
        model,
        scored_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error("persistAudit error:", err);
  }
};

const persistEcoText = async (
  supabase: any,
  ipe_cycle_id: string,
  pill_id: string,
  eco_text: string
) => {
  try {
    await supabase
      .from("pill_responses")
      .update({ eco_text, completed_at: new Date().toISOString() })
      .eq("ipe_cycle_id", ipe_cycle_id)
      .eq("pill_id", pill_id);
  } catch (err) {
    console.error("persistEcoText error:", err);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const auth_header = req.headers.get("Authorization");
  if (!auth_header) {
    return json({ error: "Missing authorization header" }, 401);
  }

  const token = auth_header.replace("Bearer ", "");
  const supabase_url = Deno.env.get("SUPABASE_URL");
  const supabase_key = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabase_url || !supabase_key) {
    return json({ error: "Missing Supabase configuration" }, 500);
  }

  const supabase = createClient(supabase_url, supabase_key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Get authenticated user
  const { data: auth_data, error: auth_error } = await supabase.auth.getUser(
    token
  );
  if (auth_error || !auth_data.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const user_id = auth_data.user.id;

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const { ipe_cycle_id, pill_id } = body;

  if (!ipe_cycle_id || !pill_id) {
    return json(
      { error: "Missing ipe_cycle_id or pill_id" },
      400
    );
  }

  // Validate cycle ownership
  const { data: cycle_data, error: cycle_error } = await supabase
    .from("ipe_cycles")
    .select("id, user_id")
    .eq("id", ipe_cycle_id)
    .single();

  if (cycle_error || !cycle_data || cycle_data.user_id !== user_id) {
    return json({ error: "Cycle not found or unauthorized" }, 404);
  }

  // Load pill response
  const { data: pill_response_data, error: pill_error } = await supabase
    .from("pill_responses")
    .select("*")
    .eq("ipe_cycle_id", ipe_cycle_id)
    .eq("pill_id", pill_id)
    .single();

  if (pill_error || !pill_response_data) {
    return json({ error: "Pill response not found" }, 404);
  }

  const pill_response: PillResponse = pill_response_data;

  const component = `eco_${pill_id}`;

  // Idempotency: return cached eco if already exists
  if (pill_response.eco_text) {
    return json({ eco_text: pill_response.eco_text, scoring_audit_id: "", cached: true });
  }

  // Fetch all data sources
  const structural_context = await fetchStructuralContext(supabase, user_id);
  const eco_node = await selectEcoNode(
    supabase,
    structural_context?.cgg ?? null
  );
  const longitudinal_data = await fetchLongitudinalData(
    supabase,
    user_id,
    ipe_cycle_id,
    pill_id
  );

  // Build corpus and prompt
  const corpus = buildOracularCorpus(
    pill_id,
    pill_response,
    structural_context,
    eco_node,
    longitudinal_data
  );

  let prompt_text = buildOracularPrompt(pill_id);

  // Check for active prompt version in DB (component = eco_PI, eco_PII, etc.)
  const { data: prompt_version_data } = await supabase
    .from("prompt_versions")
    .select("prompt_text")
    .eq("component", component)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prompt_version_data?.prompt_text) {
    prompt_text = prompt_version_data.prompt_text;
  }

  // Initialize LLM client
  const anthropic_key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropic_key) {
    const fallback = getFallbackEco(
      pill_id,
      detectLanguage(
        (pill_response.m4_resposta?.percepcao as string) ||
          pill_response.m2_resposta ||
          ""
      )
    );
    await persistEcoText(supabase, ipe_cycle_id, pill_id, fallback);
    await persistAudit(
      supabase,
      ipe_cycle_id,
      component,
      "embedded-v3.0",
      0,
      0,
      "",
      fallback,
      true,
      0,
      "fallback-no-key"
    );
    return json({ eco_text: fallback, scoring_audit_id: "", cached: false });
  }

  const anthropic = new Anthropic({ apiKey: anthropic_key });

  let eco_text: string | null = null;
  let retry_count = 0;
  const max_retries = 2;
  let last_error: string = "";

  while (retry_count <= max_retries && !eco_text) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        temperature: 0.45,
        system: prompt_text,
        messages: [
          {
            role: "user",
            content: `Context for the eco:\n\n${corpus}\n\nNow craft the 1-2 sentence eco for this person.`,
          },
        ],
      });

      const content = response.content[0];
      if (content && "text" in content) {
        eco_text = content.text.trim();

        // Persist audit
        await persistAudit(
          supabase,
          ipe_cycle_id,
          component,
          "embedded-v3.0",
          response.usage.input_tokens,
          response.usage.output_tokens,
          eco_text,
          eco_text,
          true,
          retry_count,
          "claude-sonnet-4-20250514"
        );
      }
    } catch (err: any) {
      last_error = err.message || String(err);
      retry_count++;

      if (retry_count <= max_retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Fallback if LLM failed
  if (!eco_text) {
    const lang = detectLanguage(
      (pill_response.m4_resposta?.percepcao as string) ||
        pill_response.m2_resposta ||
        ""
    );
    eco_text = getFallbackEco(pill_id, lang);

    await persistAudit(
      supabase,
      ipe_cycle_id,
      component,
      "embedded-v3.0",
      0,
      0,
      last_error,
      eco_text,
      false,
      retry_count,
      "fallback-error"
    );
  }

  // Persist eco text
  await persistEcoText(supabase, ipe_cycle_id, pill_id, eco_text);

  return json({ eco_text, scoring_audit_id: "", cached: false });
});
