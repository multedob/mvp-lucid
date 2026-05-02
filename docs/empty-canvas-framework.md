# Empty Canvas — Framework dos 3 Tipos de Mensagem

**Origem:** AFC ONB-2 (aprovada 2026-04-30).
**Dependência:** AFC ONB-1 (Sistema de 4 Vozes).
**Status:** documento de referência operacional para implementação (B-S4.1) e curadoria (B-S3.2).

---

## O que é

O **canvas** é o espaço central das telas pós-onboarding (Home, Context, Pills antes do primeiro ciclo, Reed antes da primeira mensagem, Questionnaire). Em vez de vazio passivo, esse espaço é **canvas de comunicação ocasional bidirecional** entre sistema e usuário.

Três tipos de mensagem podem habitar o canvas, cada um com voz, frequência e persistência distintas.

---

## Tipo 1 — Orientação contextual

**Voz:** Sistema (IBM Plex Mono, sem cor de acento — texto neutro).
**Quando aparece:** uma vez por contexto (primeira visita à tela).
**Conteúdo:** instrução curta sobre o que se faz nessa tela.
**Persistência:** dismiss permanente após primeira leitura.
**Highlight de UI:** opcional (componente `<HighlightTarget>`).

**Exemplos:**
- Home (primeira visita): `comece pela primeira pill →`
- Context vazio: `este espaço se preenche conforme você completa ciclos.`
- Pills antes do primeiro ciclo: `seis pills. comece pela primeira.`

---

## Tipo 2 — Onboarding diferido

**Voz:** Sistema (IBM Plex Mono, sem cor de acento).
**Quando aparece:** uma vez por feature descoberta (ex: antes da primeira interação no Reed).
**Conteúdo:** explicação contextual de funcionalidade no momento de descoberta — não no início, não em tutorial.
**Persistência:** dismiss permanente após primeira interação com a feature.
**Highlight de UI:** comum — pode acompanhar destaque do elemento mencionado.

**Exemplos:**
- Reed antes da primeira mensagem: `aqui você responde reed. pode mandar áudio →` (com highlight no botão de áudio)
- Questionnaire antes do primeiro: `responda no seu ritmo. pode pausar e voltar.`

---

## Tipo 3 — Mensagem do time

**Voz:** Fundadores (IBM Plex Mono **COLORIDO** — terracota `#C04A30` no light, ciano `#1A9FAA` no dark).
**Quando aparece:** eventual — datas marcantes, marcos do usuário, curadoria humana. Não é template, não é automatizado.
**Conteúdo:** mensagem afetiva, contextual ou expressiva. Pode incluir ASCII art mobile-friendly.
**Persistência:** dismiss permanente para a mensagem específica; canal sempre disponível para próximas.
**Assinatura:** discreta no fim — `— time rdwth` ou pseudônimo.

**Exemplos:**
- Natal: ASCII de árvore + `feliz natal. — time rdwth`
- 1º ciclo completo: `primeiro ciclo. obrigado por estar aqui. — time rdwth`
- Ano novo: mensagem curta de virada

---

## Regras de frequência

1. **Uma mensagem por sessão no máximo.** Se já mostrou uma, não mostra outra na mesma sessão.
2. **Nunca duas em sequência entre sessões consecutivas.** Cooldown para evitar saturação.
3. **Tipo 3 requer curadoria humana.** Olivia + Bruno (ou pessoa autorizada) escolhem o que entra. Não é gerado por algoritmo.

---

## Acessibilidade

- Mensagens com `<HighlightTarget>` precisam de `aria-describedby` apontando ao elemento mencionado.
- ASCII art (Tipo 3) precisa de `aria-label` descritivo (ex: `"árvore de natal estilizada em ASCII, em homenagem ao Natal"`) — leitor de tela ouve descrição, não os caracteres.
- Tipografia respeita `prefers-reduced-motion` (sem animações pesadas em entrada).

---

## Schema preview (a ser implementado em B-S4.1 pela Trilha A)

```typescript
interface EmptyStateMessage {
  id: string;                    // UUID
  type: 'orientation' | 'deferred-onboarding' | 'team-message';
  voice: 'system' | 'founders';  // tipos 1/2 = system; tipo 3 = founders
  text: string;                  // copy da mensagem
  signature?: string;            // apenas tipo 3
  context_key: string;           // ex: "home_first_visit"
  appearance_rule?: {            // condições de quando aparecer
    trigger?: string;            // ex: "first_visit_to_home"
    date_range?: [string, string];
    cohort?: string;
  };
  highlight_target?: string;     // ID de elemento UI a destacar
  active: boolean;
  created_at: string;
  created_by: string;            // quem curou
}
```

E persistência de dismiss por usuário:

```sql
CREATE TABLE user_message_dismissals (
  user_id UUID REFERENCES auth.users(id),
  message_context_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, message_context_key)
);
```

---

## Como adicionar uma nova mensagem (depois que B-S4.1 estiver implementado)

1. Definir tipo (1, 2 ou 3).
2. Definir `context_key` único — onde a mensagem aparece.
3. Escrever copy respeitando voz e tipografia do tipo.
4. Para tipo 2 com highlight: identificar o ID do elemento UI a destacar.
5. Para tipo 3: definir `appearance_rule` (data marcante? marco do usuário? cohort?) e assinar.
6. Inserir na tabela `team_messages` (via painel admin ou migration SQL).
7. Testar em viewport mobile (360px) — especialmente ASCII art do tipo 3.

---

## O que NÃO fazer

- ❌ Cor como feedback funcional (cor é sistema semântico — terracota é "acento de identidade", não é "atenção"). Para destaque, usar peso, escala ou movimento.
- ❌ Tipo 3 com voz do sistema (perde o calor da voz humana).
- ❌ Tipo 1 ou 2 com voz fundadores (dilui o efeito da voz humana, que deve ser rara).
- ❌ Reed falando no canvas (Reed mora no chat dele; misturar quebra a especificidade do companion).
- ❌ Mensagens sequenciais sem cooldown (vira ruído).
- ❌ ASCII art quebrando em mobile (testar SEMPRE em 360px).

---

## Referências canônicas

- AFC ONB-1 — Sistema de 4 Vozes do Produto
- AFC ONB-2 — Empty State como Canvas de Comunicação
- PROJECT_MANIFEST v1.18.0 §3-E

*Documento gerado em 2026-04-30. Atualizar conforme aprendizados de campo.*
