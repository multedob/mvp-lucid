// src/lib/flowPools.ts
// Pools dedicados de frases Diablo + hints finais por destino.
// Usado pelo FlowVoice durante transições Home → X.
//
// Estrutura por destino:
//   diablo[]  — frases curadas, contextuais. 2 são sorteadas distintas por flow.
//   hints[]   — 3 variações da frase de chamada final (1 sorteada).

export type FlowDestination = "pills" | "questionnaire" | "reed" | "context";

export interface FlowPool {
  diablo: string[];
  hints: string[];
}

const POOLS: Record<FlowDestination, FlowPool> = {
  pills: {
    diablo: [
      "As pills são leituras curtas. Você reage, o sistema escuta.",
      "Cada pill representa uma dimensão da sua estrutura.",
      "As pills alimentam o sistema e revelam padrões.",
      "Pode usar áudio com o Reed em vez de texto, se for mais natural.",
      "Não há pill certa. Comece pela que te chamar.",
      "Uma pill leva alguns minutos. Sem pressa.",
      "Você pode interromper uma pill. Ela fica salva onde parou.",
    ],
    hints: [
      "escolha uma pill para começar.",
      "qual pill faz sentido agora?",
      "pode começar por qualquer uma.",
    ],
  },

  questionnaire: {
    diablo: [
      "O questionário tem 18 blocos em 4 dimensões.",
      "Você pode pausar o questionário. Ele guarda onde parou.",
      "Não há resposta certa. Há a sua.",
      "Cada pergunta abre um pouco da sua estrutura.",
      "Responda no seu ritmo. Não é prova.",
      "O questionário não te define — só te lê.",
      "Quanto mais honesto, mais nítida a leitura.",
    ],
    hints: [
      "perguntas restantes: 16",
      "responda no seu ritmo. pode pausar e voltar.",
      "abrindo as perguntas pendentes.",
    ],
  },

  reed: {
    diablo: [
      "Reed presta atenção, mas não julga.",
      "O Reed lê com você, não por você.",
      "Você pode falar com o Reed por texto ou áudio.",
      "O Reed não dá conselhos. Ele devolve perguntas.",
      "O que você diz ao Reed fica entre vocês.",
      "Reed não tem pressa. Você também não precisa ter.",
    ],
    hints: [
      "comece a conversa.",
      "o Reed está pronto.",
      "fale com o Reed.",
    ],
  },

  context: {
    diablo: [
      "Padrões só aparecem com repetição.",
      "Sua leitura se aprofunda com o tempo, não com a pressa.",
      "O contexto mostra o que se repete em você.",
      "Quanto mais ciclos, mais camadas aparecem.",
      "O rdwth amadurece com você ao longo dos ciclos.",
      "A leitura de hoje é só uma camada.",
    ],
    hints: [
      "leitura do seu ciclo.",
      "abrindo a sua estrutura recente.",
      "o que o sistema viu até aqui.",
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
  const diabloPool = POOLS[dest].diablo;
  const shuffled = [...diabloPool].sort(() => Math.random() - 0.5);
  const diablo1 = shuffled[0] ?? "";
  const diablo2 = shuffled[1] ?? shuffled[0] ?? "";
  const extras = shuffled.slice(2);
  const pool = shuffled;
  const hint = pickRandom(POOLS[dest].hints);
  return { diablo1, diablo2, extras, pool, hint };
}

/** Map de path → destino do flow. */
export const PATH_TO_DEST: Record<string, FlowDestination> = {
  "/pills": "pills",
  "/questionnaire": "questionnaire",
  "/reed": "reed",
  "/context": "context",
};

/** Section do header por destino. */
export const DEST_SECTION: Record<FlowDestination, string> = {
  pills: "pills",
  questionnaire: "questionário",
  reed: "reed",
  context: "contexto",
};

/** Active do NavBottom por destino. */
export const DEST_ACTIVE: Record<FlowDestination, "pills" | "questionnaire" | "reed" | "context"> = {
  pills: "pills",
  questionnaire: "questionnaire",
  reed: "reed",
  context: "context",
};
