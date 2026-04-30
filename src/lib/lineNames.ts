// src/lib/lineNames.ts
// Nomes humanos canônicos v1.0 das 16 linhas e 4 dimensões do rdwth.
// Fonte única de verdade para qualquer UI que exibe nomes de linha/dimensão.
// Source of truth: LUCID_SELF_LINES_v1.0 (documento canônico).

export const LINE_NAMES: Record<string, string> = {
  // D1 — Ação Coordenada
  "L1.1": "Direção Intencional",
  "L1.2": "Disciplina Sustentada",
  "L1.3": "Qualidade de Entrega",
  "L1.4": "Aprimoramento Contínuo",
  // D2 — Integração Interna
  "L2.1": "Integração Emocional",
  "L2.2": "Curiosidade e Assimilação",
  "L2.3": "Regulação de Recursos",
  "L2.4": "Estrutura de Self",
  // D3 — Dinâmica Relacional
  "L3.1": "Colaboração Estruturada",
  "L3.2": "Navegação no Coletivo",
  "L3.3": "Gestão de Conflito",
  "L3.4": "Responsabilidade Relacional",
  // D4 — Integração Ampliada
  "L4.1": "Visão Sistêmica",
  "L4.2": "Pensamento Estratégico",
  "L4.3": "Conhecimento como Presença",
  "L4.4": "Presença Integradora",
};

export const DIMENSION_NAMES: Record<string, string> = {
  D1: "Ação Coordenada",
  D2: "Integração Interna",
  D3: "Dinâmica Relacional",
  D4: "Integração Ampliada",
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

export const LINES_BY_DIMENSION: Record<string, string[]> = {
  D1: ["L1.1", "L1.2", "L1.3", "L1.4"],
  D2: ["L2.1", "L2.2", "L2.3", "L2.4"],
  D3: ["L3.1", "L3.2", "L3.3", "L3.4"],
  D4: ["L4.1", "L4.2", "L4.3", "L4.4"],
};
