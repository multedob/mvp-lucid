// src/lib/flowPools.ts
// Pools dedicados de frases Diablo + hints finais por destino.
// Usado pelo FlowVoice durante transições Home → X.
//
// Estrutura por destino:
//   diablo[]  — frases curadas, contextuais. 2 são sorteadas distintas por flow.
//   hints[]   — 3 variações da frase de chamada final (1 sorteada).

export type FlowDestination = "pills" | "questionnaire" | "reed" | "context" | "thirdparty";

export interface FlowPool {
  /** Frases gerais (usado quando A/B não estão definidos). */
  diablo?: string[];
  /** Pra reed: linha 1 só pode vir desse grupo (todas começam com "reed"). */
  diabloA?: string[];
  /** Pra reed: linha 2 só pode vir desse grupo (não começa com "reed"). */
  diabloB?: string[];
  hints: string[];
}

// Frases curtas (≤ 38 chars) pra evitar quebra de linha em mobile.
// Tudo lowercase — voz do sistema é sempre minúscula.
const POOLS: Record<FlowDestination, FlowPool> = {
  pills: {
    diablo: [
      "pills são leituras curtas.",
      "você reage. o sistema escuta.",
      "cada pill é uma dimensão sua.",
      "pills revelam padrões.",
      "não há pill certa.",
      "comece pela que te chamar.",
      "uma pill leva poucos minutos.",
      "pode pausar. fica salvo.",
    ],
    hints: [
      "escolha uma pill para começar.",
      "qual pill faz sentido agora?",
      "pode começar por qualquer uma.",
    ],
  },

  questionnaire: {
    diablo: [
      "18 blocos em 4 dimensões.",
      "pode pausar. fica salvo.",
      "não há resposta certa.",
      "há a sua resposta.",
      "cada pergunta abre algo.",
      "responda no seu ritmo.",
      "não é prova.",
      "honestidade afia a leitura.",
      "o questionário não te define.",
      "ele só te lê.",
    ],
    hints: [
      "perguntas restantes: 16",
      "responda no seu ritmo.",
      "abrindo o questionário.",
    ],
  },

  reed: {
    // Linha 1 sempre começa com "reed", linha 2 nunca — evita repetição visual.
    diabloA: [
      "reed presta atenção.",
      "reed não julga.",
      "reed lê com você.",
      "reed devolve perguntas.",
      "reed não tem pressa.",
      "reed escuta antes.",
      "reed acompanha você.",
      "reed escuta sem pressa.",
    ],
    diabloB: [
      "fala por texto ou áudio.",
      "tudo fica entre vocês.",
      "não há pressa.",
      "uma escuta atenta, sem juízo.",
      "espaço pra pensar em voz alta.",
      "perguntas que abrem perguntas.",
      "sem conselhos. só presença.",
      "leitura junto, não por você.",
    ],
    hints: [
      "comece a conversa.",
      "o reed está pronto.",
      "fale com o reed.",
    ],
  },

  context: {
    diablo: [
      "padrões aparecem com repetição.",
      "sua leitura aprofunda com tempo.",
      "contexto mostra o que se repete.",
      "mais ciclos, mais camadas.",
      "o rdwth amadurece com você.",
      "hoje é só uma camada.",
    ],
    hints: [
      "leitura do seu ciclo.",
      "abrindo sua estrutura recente.",
      "o que o sistema viu até aqui.",
    ],
  },

  thirdparty: {
    diablo: [
      "olhares de fora afinam o ciclo.",
      "terceiros veem o que você não vê.",
      "perspectiva externa amplia a leitura.",
      "pessoas próximas refletem padrões.",
      "pontos cegos viram visíveis.",
      "quem te conhece te lê melhor.",
      "olhares próximos revelam ângulos.",
      "o de fora amplia o de dentro.",
    ],
    hints: [
      "convide até 8 pessoas próximas.",
      "envie até 8 convites.",
      "convide quem te conhece.",
    ],
  },
};

function pickRandom<T>(pool: T[], excluding: T[] = []): T {
  const candidates = pool.filter((p) => !excluding.includes(p));
  const arr = candidates.length > 0 ? candidates : pool;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Sorteia voz do flow pra um destino. Retorna ambos formatos pra suportar
 * Modo A (Pills/Reed/Context — 3 linhas empilhadas) e Modo B (Questionnaire —
 * zig-zag com typewriter reverso).
 *
 * Modo A usa: diablo1 (linha 1), diablo2 (linha 2), extras (rotação na linha 3),
 *             hint (substitui linha 3 quando ready).
 * Modo B usa: pool (consumido em sequência alternando linha 1 / linha 2),
 *             hint (entra como 3ª linha NOVA abaixo quando ready).
 */
export function pickFlowVoice(dest: FlowDestination): {
  diablo1: string;
  diablo2: string;
  extras: string[];
  pool: string[];
  hint: string;
} {
  const def = POOLS[dest];

  let diablo1: string;
  let diablo2: string;
  let extras: string[];
  let pool: string[];

  if (def.diabloA && def.diabloB) {
    // Categorizado A/B: linha 1 só de A, linha 2 só de B (evita repetição).
    diablo1 = pickRandom(def.diabloA);
    diablo2 = pickRandom(def.diabloB);
    const allOthers = [
      ...def.diabloA.filter((p) => p !== diablo1),
      ...def.diabloB.filter((p) => p !== diablo2),
    ];
    extras = allOthers.sort(() => Math.random() - 0.5);
    pool = [diablo1, diablo2, ...extras];
  } else {
    const diabloPool = def.diablo ?? [];
    const shuffled = [...diabloPool].sort(() => Math.random() - 0.5);
    diablo1 = shuffled[0] ?? "";
    diablo2 = shuffled[1] ?? shuffled[0] ?? "";
    extras = shuffled.slice(2);
    pool = shuffled;
  }

  const hint = pickRandom(def.hints);
  return { diablo1, diablo2, extras, pool, hint };
}

/** Map de path → destino do flow. */
export const PATH_TO_DEST: Record<string, FlowDestination> = {
  "/pills": "pills",
  "/questionnaire": "questionnaire",
  "/reed": "reed",
  "/context": "context",
  "/terceiros": "thirdparty",
};

/** Section do header por destino. */
export const DEST_SECTION: Record<FlowDestination, string> = {
  pills: "pills",
  questionnaire: "questionário",
  reed: "reed",
  context: "contexto",
  thirdparty: "terceiros",
};

/** Active do NavBottom por destino. */
export const DEST_ACTIVE: Record<FlowDestination, "pills" | "questionnaire" | "reed" | "context" | "thirdparty"> = {
  pills: "pills",
  questionnaire: "questionnaire",
  reed: "reed",
  context: "context",
  thirdparty: "thirdparty",
};
