// supabase/functions/_shared/eco/llm-detector.ts
// ============================================================
// Detector LLM (Claude Haiku) — identifica operator_hint dado o corpus
// Usado pelo Caminho Hibrido v2.c.2 antes do renderer (Sonnet)
// ============================================================

import type Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

export interface DetectorOutput {
  operator_hint: string;
  theme: string;
  fragments: string[];
  reasoning: string;
  confidence: number;
}

const VALID_HINTS = [
  "cost", "weight", "paradox", "silence", "temporal_shift",
  "inversion", "cycle", "repetition", "absence", "contradiction",
] as const;

const DETECTOR_SYSTEM_PROMPT = `Você é um detector de padrões semânticos. Sua única tarefa é ler o que uma pessoa disse e identificar QUAL padrão dominante está acontecendo.

Os 10 padrões possíveis (escolha exatamente UM):

- cost: tem algo sendo trocado, sacrificado, perdido pela escolha dela
- weight: tem gravidade silenciosa, peso não-nomeado, carga
- paradox: duas coisas que não cabem juntas — e cabem mesmo assim
- silence: ela quase disse algo e parou; tem fresta, algo guardado
- temporal_shift: o passado virou presente, ou o presente carrega o ontem
- inversion: ela diz X mas o que sustenta é o oposto Y; algo aparece pelo avesso
- cycle: algo se repete em forma diferente; padrão circular; ressonância
- repetition: uma palavra/ideia volta com peso, insiste
- absence: vazio, falta, sombra do que não apareceu
- contradiction: duas verdades suas, ambas verdadeiras, em tensão

REGRAS:
- Escolha o padrão MAIS PROFUNDO (não o óbvio na superfície)
- Se ela fala em terceira pessoa sobre alguém — provavelmente silence ou inversion
- Se ela cita uma frase repetidamente em variantes — repetition
- Se ela descreve "antes/depois" com peso emocional — temporal_shift
- Se ela diz duas coisas opostas como verdadeiras — contradiction ou paradox

OUTPUT JSON puro (sem cercas, sem texto antes/depois):

{
  "operator_hint": "<um dos 10>",
  "theme": "<3-7 palavras descrevendo o tema central>",
  "fragments": ["<frase verbatim 1>", "<frase verbatim 2>"],
  "reasoning": "<1 frase justificando a escolha>",
  "confidence": <0.0 a 1.0>
}

Confidence < 0.6 = padrão difícil de identificar. Confidence ≥ 0.8 = claro.`;

export async function detectPatternLLM(
  corpus: string,
  pill_id: string,
  anthropic: Anthropic,
): Promise<DetectorOutput | null> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      temperature: 0.2,
      system: DETECTOR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Pill: ${pill_id}\n\nO que a pessoa disse:\n\n${corpus}\n\nIdentifique o padrão dominante.`,
        },
      ],
    });

    const content = response.content[0];
    if (!content || !("text" in content)) return null;

    const raw = content.text.trim();
    let candidate = raw;
    const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) candidate = fence[1].trim();
    const obj = candidate.match(/\{[\s\S]*\}/);
    if (obj) candidate = obj[0];

    const parsed = JSON.parse(candidate);

    if (!VALID_HINTS.includes(parsed.operator_hint)) {
      console.warn("[detector] hint inválido:", parsed.operator_hint);
      return null;
    }

    return {
      operator_hint: parsed.operator_hint,
      theme: typeof parsed.theme === "string" ? parsed.theme : "",
      fragments: Array.isArray(parsed.fragments) ? parsed.fragments.slice(0, 5) : [],
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch (err) {
    console.error("[detector] error:", err);
    return null;
  }
}

export const HINT_TO_OPERATOR: Record<string, string> = {
  cost: "OP01",
  inversion: "OP02",
  repetition: "OP03",
  weight: "OP04",
  contradiction: "OP05",
  absence: "OP06",
  paradox: "OP07",
  cycle: "OP08",
  silence: "OP09",
  temporal_shift: "OP10",
};
