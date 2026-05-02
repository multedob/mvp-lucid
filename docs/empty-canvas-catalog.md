# Empty Canvas — Catálogo Inicial de Mensagens

**Origem:** B-S3.2 do Pipeline da Trilha B.
**Status:** DRAFT para curadoria — Olivia + Bruno selecionam, ajustam ou descartam cada item antes de produção.
**Total:** 18 mensagens (5 Tipo 1, 5 Tipo 2, 8 Tipo 3).

---

## TIPO 1 — Orientação contextual

Voz sistema. Aparece uma vez por contexto. Dismiss permanente.

### 1.1 Home primeira visita

> comece pela primeira pill →

`home_first_visit` · trigger: primeira visita à Home

### 1.2 Context vazio

> este espaço se preenche conforme você completa ciclos.

`context_empty` · trigger: abrir Context sem nenhum ciclo concluído

### 1.3 Pills antes do primeiro ciclo

> seis pills. comece pela primeira.

`pills_first_visit` · trigger: primeira visita a Pills

### 1.4 Reed antes da primeira mensagem

> este é o lugar onde você conversa com reed.

`reed_first_visit` · trigger: primeira visita a Reed

### 1.5 Questionnaire antes do primeiro

> responda no seu ritmo. pode pausar e voltar.

`questionnaire_first_visit` · trigger: primeira visita a Questionnaire

---

## TIPO 2 — Onboarding diferido

Voz sistema, com highlight opcional de UI. Aparece uma vez por feature descoberta.

### 2.1 Reed — botão de áudio

> pode mandar áudio por aqui →

`reed_audio_discovery` · highlight_target: botão de áudio do Reed · trigger: após primeira mensagem digitada no Reed

### 2.2 Reed — comandos

> existem comandos. tente /help.

`reed_commands_discovery` · trigger: após 5 mensagens no Reed

### 2.3 Pills — revisitar

> pode revisitar uma pill quando quiser. ela fica em terracota com · revisitar.

`pills_revisit_discovery` · trigger: primeira pill completada

### 2.4 Settings — primeira visita

> aqui você gerencia conta, exporta dados ou apaga tudo.

`settings_first_visit` · trigger: primeira visita a Settings

### 2.5 Context — após primeiro ciclo

> esta é sua leitura estrutural. ela se aprofunda com cada ciclo.

`context_after_first_cycle` · trigger: primeiro ciclo concluído + visitar Context

---

## TIPO 3 — Mensagem do time

Voz fundadores (IBM Plex Mono COLORIDO — terracota light, ciano dark). Eventual, curadoria humana. Assinatura discreta.

### 3.1 Natal (25 dez)

> feliz natal.

— time rdwth

`holiday_christmas_2026` · trigger: entre 23 e 26 de dezembro

### 3.2 Ano novo

> 2026 → 2027
>
> o que continua, continua. o que muda, muda.

— time rdwth

`holiday_new_year_2027` · trigger: entre 31/12 e 02/01

### 3.3 Dia mundial da saúde mental (10 out)

> hoje é dia mundial da saúde mental. rdwth não é terapia. é um instrumento de leitura. se você precisa de apoio profissional, busque.

— time rdwth

`mental_health_day_2026` · trigger: 10 de outubro · nota: mensagem delicada, lê com cuidado

### 3.4 Aniversário do app (data a definir)

> rdwth completa 1 ano. obrigado por estar aqui.

— time rdwth

`rdwth_birthday_2027` · trigger: data do aniversário (a confirmar)

### 3.5 Marco — primeiro ciclo completo

> primeiro ciclo. uma leitura completa do que apareceu até agora.

— time rdwth

`milestone_first_cycle` · trigger: primeiro ciclo concluído

### 3.6 Marco — 1 mês de uso

> um mês. as pills começam a se aprofundar daqui.

— time rdwth

`milestone_1_month` · trigger: 30 dias após signup

### 3.7 Marco — 3 ciclos completos

> três ciclos. o sistema começa a reconhecer o que você traz.

— time rdwth

`milestone_3_cycles` · trigger: 3 ciclos concluídos

### 3.8 Marco — 6 ciclos completos

> seis ciclos. outras camadas agora.

— time rdwth

`milestone_6_cycles` · trigger: 6 ciclos concluídos

---

## Decisões pendentes para curadoria humana

1. Voz das Tipo 3 está fiel? Releia em voz alta.
2. ASCII art testada em mobile real? Viewport 360x640.
3. Datas certas? Aniversário do app — qual a data oficial?
4. Saúde mental (3.3) é delicada. Inclui ou pula?
5. Outras datas (Carnaval, Páscoa, Halloween)?
6. Marcos do usuário — frequência certa?

---

*Catálogo gerado em 2026-04-30. Refina com curadoria humana antes de produção.*
