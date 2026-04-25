// supabase/functions/_shared/eco/locale/pt-br/stopwords.ts
// Appendix PT-BR v1.0 §2 — Stopwords para OP03 Repetition.

export const STOPWORDS_PT_BR: ReadonlySet<string> = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas',
  'por', 'pelo', 'pela', 'pelos', 'pelas',
  'para', 'pra', 'pro',
  'com', 'sem', 'sob', 'sobre', 'até', 'ate', 'após', 'apos', 'ante',
  'e', 'ou', 'mas', 'se', 'que', 'quando', 'como', 'onde', 'porque', 'porquê',
  'eu', 'tu', 'ele', 'ela', 'nós', 'nos', 'vós', 'vos', 'eles', 'elas',
  'você', 'voce', 'vocês', 'voces',
  'me', 'te', 'lhe', 'lhes', 'mim', 'ti', 'si',
  'meu', 'minha', 'meus', 'minhas',
  'seu', 'sua', 'seus', 'suas',
  'nosso', 'nossa', 'nossos', 'nossas',
  'é', 'e_acento', 'era', 'foi', 'ser', 'estar', 'está', 'esta', 'estava',
  'ficou', 'tem', 'tinha', 'ter', 'haver', 'há', 'ha', 'fazer', 'faz', 'fez',
  'ir', 'vai',
  'isso', 'isto', 'aquilo', 'esse', 'essa', 'este', 'esta',
  'aquele', 'aquela', 'aqueles', 'aquelas',
  'aqui', 'ali', 'lá', 'la', 'cá', 'ca', 'qual',
  'muito', 'mais', 'menos', 'tão', 'tao', 'tanto',
  'todo', 'toda', 'todos', 'todas',
  'também', 'tambem', 'apenas',
  'sim',
]);

export const HIGH_CHARGE_NOT_STOPWORDS_PT_BR: ReadonlyArray<string> = [
  'não', 'nao',
  'nunca', 'jamais',
  'sempre',
  'só', 'so',
  'já', 'ja',
  'ainda',
  'talvez',
];

export const MIN_WORD_LENGTH_PT_BR = 3;
