// src/lib/lineNames.ts
// Nomes humanos canônicos v1.0 das 16 linhas e 4 dimensões do rdwth.
// Fonte única de verdade para qualquer UI que exibe nomes de linha/dimensão.

export const LINE_NAMES: Record<string, string> = {
  // D1 — Integração externa
  "L1.1": "leitura de contexto",
  "L1.2": "resposta a fricção",
  "L1.3": "negociação de limite",
  "L1.4": "sustentação de vínculo",
  // D2 — Integração interna
  "L2.1": "leitura de afeto",
  "L2.2": "tolerância a contradição",
  "L2.3": "regulação de impulso",
  "L2.4": "diferenciação de eu",
  // D3 — Articulação simbólica
  "L3.1": "nomeação do que sente",
  "L3.2": "construção de sentido",
  "L3.3": "abertura a ambiguidade",
  "L3.4": "integração de narrativa",
  // D4 — Movimento no tempo
  "L4.1": "iniciativa frente ao novo",
  "L4.2": "manutenção de direção",
  "L4.3": "revisão de rota",
  "L4.4": "aprendizado de ciclo",
};

export const DIMENSION_NAMES: Record<string, string> = {
  D1: "integração externa",
  D2: "integração interna",
  D3: "articulação simbólica",
  D4: "movimento no tempo",
};

export const ALL_LINES = [
  "L1.1", "L1.2", "L1.3", "L1.4",
  "L2.1", "L2.2", "L2.3", "L2.4",
  "L3.1", "L3.2", "L3.3", "L3.4",
  "L4.1", "L4.2", "L4.3", "L4.4",
] as const;

export const DIMENSION_OF: Record<string, "D1" | "D2" | "D3" | "D4"> = {
  "L1.1": "D1", "L1.2": "D1", "L1.3": "D1", "L1.4": "D1",
  "L2.1": "D2", "L2.2": "D2", "L2.3": "D2", "L2.4": "D2",
  "L3.1": "D3", "L3.2": "D3", "L3.3": "D3", "L3.4": "D3",
  "L4.1": "D4", "L4.2": "D4", "L4.3": "D4", "L4.4": "D4",
};
