// src/data/questions.ts
// Fonte: QUESTIONARIO_IPE_DEFINITIVO v0.3
// Mapa canônico: block_id → textos exibidos ao respondente
// Variante key = nome retornado pelo ipe-questionnaire-engine (variante_a_servir)

export type BlockId =
  | 'L2.4' | 'L1.1' | 'L1.2' | 'L1.3' | 'L1.4'
  | 'L2.1' | 'L2.2' | 'L2.3'
  | 'L3.3' | 'L3.1' | 'L3.2' | 'L3.4' | 'L3.4_CP'
  | 'L4.1' | 'L4.2' | 'L4.3' | 'L4.4'

export interface BlockText {
  principal: string
  hint?: string           // texto menor em itálico sob a pergunta principal
  fallback: string        // exibido quando usuário clica "não lembro / outro exemplo"
  subfallback?: string    // segundo nível de fallback (L1.1, L2.1)
  pathway_nunca?: string  // path alternativo declarativo (L2.1, L2.3)
  variantes: Record<string, string>  // key = variante_a_servir retornado pelo engine
}

export const QUESTIONS: Record<BlockId, BlockText> = {

  // ──────────────────────────────────────
  // D2 — INTEGRAÇÃO INTERNA
  // ──────────────────────────────────────

  'L2.4': {
    principal: 'Pense na última vez que você descobriu algo sobre si mesmo que não sabia — ou não via.\nPode ter vindo de outra pessoa, de uma situação, ou de um momento seu, sozinho. O que aconteceu?',
    hint: 'Pode ser algo grande ou algo pequeno — uma percepção que te pegou de surpresa.',
    fallback: 'Tudo bem. Pense numa situação em que você agiu de um jeito que te surpreendeu — algo que fez e que não esperava de si mesmo. O que aconteceu?',
    variantes: {
      'Adaptativa 2↔4': 'Pensando em quem você é: tem alguma coisa sobre você que se mantém, independente da situação? Algo que não muda?',
      'Adaptativa 4↔6': 'O que ficou disso? Mudou alguma coisa concreta no modo como você funciona — ou foi mais uma percepção do momento?',
    },
  },

  // ──────────────────────────────────────
  // D1 — INTENCIONALIDADE
  // ──────────────────────────────────────

  'L1.1': {
    principal: 'Pense numa situação em que você estava fazendo algo importante — e algo ou alguém empurrou para outro lado.\nO que estava te organizando naquele momento? E o que aconteceu com esse rumo quando a pressão veio?',
    hint: 'Pode ser trabalho, vida pessoal, qualquer coisa. O que importa é que havia algo em jogo e você sentiu uma pressão para mudar de direção.',
    fallback: 'Tudo bem. Pense na última semana. Das coisas que você fez — o que decidiu qual era a mais importante? Veio de fora ou de você?',
    subfallback: 'Se você tivesse um dia inteiro livre amanhã, sem nada marcado — o que faria? E por quê?',
    variantes: {
      'Origem': 'Nessa situação — ou em outra parecida — se ninguém tivesse pedido nada, você teria se movido na mesma direção? O que te teria levado?',
      'Custo': 'Manter esse rumo custou alguma coisa concreta — algo que perdeu, complicou, ou ficou mais difícil? O quê?',
      'C-D': 'Olhando para diferentes áreas da sua vida — trabalho, relações, decisões pessoais — o que te organiza é da mesma natureza, ou funciona de um jeito em um lugar e de outro jeito em outro? O que faz ser assim?',
    },
  },

  'L1.2': {
    principal: 'Pense numa vez em que você estava cansado, sem vontade, ou sem ver sentido — e tinha algo que precisava ser feito.\nVocê continuou, parou, ou fez pela metade? E se continuou — o que te manteve? Se parou — o que faltou?',
    hint: 'Não precisa ser algo grandioso. Pode ser um projeto, uma rotina, um compromisso. O que importa é o momento em que a energia ou a vontade não estavam ali.',
    fallback: 'Pense num momento recente em que você fez algo que não estava com vontade de fazer — e fez mesmo assim. O que te fez continuar?',
    variantes: {
      'Continuidade': 'A relação entre o que você sente e o que você faz — ela muda dependendo da situação? Em que tipo de situação a disciplina fica mais difícil, e em que tipo ela fica mais fácil?',
    },
  },

  'L1.3': {
    principal: 'Pense numa vez em que você terminou algo e achava que o resultado estava bom — e alguém avaliou diferente. Podia ser um chefe, um cliente, um colega, qualquer pessoa.\nO que aconteceu com o seu critério de "bom o suficiente" quando essa avaliação veio?',
    hint: 'Pode ser trabalho, estudo, um projeto pessoal. O que importa não é se você discordou, mas o que definia "bom o suficiente" para você naquele caso.',
    fallback: 'Tudo bem. Pense em algo que você entregou recentemente — no trabalho ou fora dele. Como você soube que estava pronto para entregar? O que te disse "é suficiente"?',
    variantes: {
      'Origem Padrão': 'Quando você manteve seu critério mesmo com avaliação diferente — o que sustentou isso?',
      'C-D Invisibilidade': 'E quando ninguém vai avaliar o resultado — o que define "bom o suficiente" muda para você?',
    },
  },

  'L1.4': {
    principal: 'Pense numa experiência que poderia ter mudado o jeito como você faz as coisas — no trabalho, em casa, em qualquer área. Algo que te mostrou algo novo ou diferente.\nMudou alguma coisa de fato? Se mudou — o que, e essa mudança ficou? Ou com o tempo as coisas foram voltando ao que era antes?',
    hint: 'Não precisa ser uma grande transformação. Pode ser um ajuste numa rotina, uma conversa que mudou sua abordagem, um erro que ensinou algo. Não tem resposta certa.',
    fallback: 'Tudo bem. Pense em alguma coisa que você faz diferente hoje do que fazia há dois ou três anos — no trabalho ou na vida. O que mudou, e por quê ficou?',
    variantes: {
      'Profundidade': 'O que mudou foi o jeito de fazer — procedimento, método — ou mudou algo mais fundo, sobre como você pensa sobre o assunto?',
      'Transferência': 'Quando você olha para trás, consegue ver um fio entre as mudanças que ficaram? Algo que elas têm em comum?',
    },
  },

  // ──────────────────────────────────────
  // D2 — INTEGRAÇÃO INTERNA (continuação)
  // ──────────────────────────────────────

  'L2.1': {
    principal: 'Pense em um momento em que você sentiu algo com intensidade — raiva, medo, frustração, vergonha, tristeza profunda — em uma situação onde precisava continuar funcionando (no trabalho, em casa, em um grupo).\nDescreva esse momento brevemente. Depois, conte: o que você fez com o que estava sentindo? Algo organizou seu comportamento naquele momento, ou a emoção determinou o que aconteceu?',
    fallback: 'Se nenhum momento específico vier à mente, pense em qualquer situação recente onde algo te irritou, assustou ou entristeceu mais do que o usual — mesmo que pequena. O que aconteceu com o seu comportamento enquanto você estava sentindo isso?',
    subfallback: 'Quando você sente algo forte — raiva, ansiedade, tristeza — o que geralmente acontece com o que você está fazendo naquele momento? Muda? Continua? Para?',
    pathway_nunca: 'Entendo. Quando você pensa em situações emocionalmente difíceis — uma perda, uma crítica pública, uma traição — o que costuma acontecer com você? Você diria que não costuma sentir com muita intensidade, que sente mas consegue continuar, ou que nunca parou para observar?',
    variantes: {
      'C': 'Agora pense em uma situação onde você sentiu algo forte — mas estava sozinho com isso. Sem o papel profissional, sem o grupo, sem ninguém esperando um comportamento específico de você. Só você e o que estava sentindo.\nO que organizou o seu comportamento nesse momento? Algo dentro de você segurou, ou o que você sentiu simplesmente virou o que você fez?',
      'D': 'Pense na última vez que alguém te criticou de um jeito que doeu — no trabalho, em casa, ou entre amigos. Não precisa ser uma crítica justa.\nO que aconteceu com você nos minutos seguintes? O que você sentiu, e o que você fez?',
    },
  },

  'L2.2': {
    principal: 'Pense numa vez em que você se interessou por algo que não tinha a ver com o que você faz no dia a dia — algo fora da sua área, do seu trabalho, do seu domínio habitual.\nO que aconteceu quando você foi atrás disso?',
    hint: 'Pode ser um assunto, uma habilidade, uma pergunta que surgiu. O que importa é o que aconteceu com esse interesse — se foi adiante, se parou em algum ponto, e o que você encontrou no processo.',
    fallback: 'Pense na última vez em que teve tempo livre sem obrigação nenhuma — um final de semana, uma folga, férias. O que você fez com esse tempo?',
    variantes: {
      'Corte 2↔4': 'Quando você aprende algo que muda como você entendia um assunto antigo — você busca aplicar isso em outro lugar, ou tende a ficar com o novo entendimento dentro da área onde aprendeu?',
      'Corte 4↔6': 'Quando você aprende algo que muda como você entendia um assunto antigo — você busca aplicar isso em outro lugar, ou tende a ficar com o novo entendimento dentro da área onde aprendeu?',
      'Meta-padrão C/D': 'Quando você aprende algo que muda como você entendia um assunto antigo — você busca aplicar isso em outro lugar, ou tende a ficar com o novo entendimento dentro da área onde aprendeu?',
    },
  },

  'L2.3': {
    principal: 'Pense numa fase da sua vida em que várias coisas importantes competiam pela sua energia e atenção ao mesmo tempo — trabalho, projeto pessoal, relações, saúde, qualquer combinação. Não uma semana atípica, mas um período em que a demanda era real e simultânea.\nO que acabou organizando onde sua energia foi? Como você decidia — ou não decidia — o que recebia atenção e o que ficava para depois?',
    fallback: 'Quando você tem muitas coisas para fazer num dia e não dá para tudo — o que normalmente acontece? O que fica sem atenção?',
    pathway_nunca: 'Me conte como você descreveria o modo como organiza seu dia típico de trabalho ou de atividades. O que define o que recebe atenção primeiro?',
    variantes: {
      'Semana Recente': 'Pense numa semana recente em que várias coisas competiram pela sua atenção. O que aconteceu com o que era menos urgente mas ainda importante?',
      'Autodireção': 'Pense num momento em que sua rotina ou estrutura habitual não funcionou — algo saiu do planejado, o sistema que normalmente te organizava falhou. O que aconteceu com a sua gestão de energia nesse momento?',
      'C-D Limite Gestão': 'Pensando no modo como você costuma administrar sua energia — em que tipo de situação essa gestão tende a ser comprometida? O que faz com que a distribuição que normalmente funciona pare de funcionar?',
    },
  },

  // ──────────────────────────────────────
  // D3 — INTEGRAÇÃO SOCIAL
  // ──────────────────────────────────────

  'L3.3': {
    principal: 'Pense numa situação em que as coisas ficaram difíceis entre você e alguém — uma tensão que não se resolveu rápido.\nO que aconteceu? E como ficou entre vocês enquanto durou?',
    hint: 'Pode ser com qualquer pessoa. O que importa é que a tensão ficou no ar por um tempo.',
    fallback: 'Pense numa situação em que você sentiu que algo estava errado entre você e alguém — mesmo que ninguém tenha falado nada. Como foi ficar com aquilo?',
    variantes: {
      'C/D': 'Olhando para como você lida com tensão relacional — você tende a resolver rápido, a deixar passar, ou a ficar com a tensão por um tempo? O que organiza essa tendência?',
    },
  },

  'L3.1': {
    principal: 'Pense numa situação em que você trabalhou junto com outras pessoas para fazer algo — e teve que encontrar como contribuir nesse processo.\nO que vocês fizeram juntos? E o que, nesse trabalho, era especificamente a sua contribuição?',
    hint: 'Pode ser no trabalho, num grupo, ou em qualquer situação que envolveu construir algo junto.',
    fallback: 'Tudo bem. Pense em qualquer situação recente em que você fez parte de um esforço coletivo — mesmo algo pequeno. Como você entrou nesse esforço? O que você trouxe?',
    variantes: {
      'Estrutura Ausente': 'Teve algum momento em que não ficou claro o que era esperado de você nesse processo — como você encontrou o que fazer?',
    },
  },

  'L3.2': {
    principal: 'Pense numa situação em que o grupo à sua volta funcionava de um jeito que não era o seu — uma prática, uma regra não dita, ou um jeito de fazer as coisas que você via de forma diferente.\nO que era essa diferença? E o que você fez?',
    hint: 'Pode ser no trabalho, na família, num grupo de amigos, ou em qualquer contexto coletivo.',
    fallback: 'Tudo bem. Pense em algum grupo do qual você faz ou fez parte. Tem algo no jeito como esse grupo funciona que você vê diferente dos outros? Como você lida com isso?',
    variantes: {
      'Visibilidade Posição': 'O quanto você tornou essa diferença visível para os outros — ou ela ficou mais interna, no modo como você operava?',
    },
  },

  'L3.4': {
    principal: 'Pense numa vez em que você percebeu — por conta própria ou porque alguém te mostrou — que algo que você fez afetou uma pessoa de um jeito significativo.\nO que aconteceu quando essa percepção chegou?',
    fallback: 'Tudo bem. Pense numa situação recente em que você percebeu que algo que disse ou fez causou algum efeito numa pessoa — mesmo que pequeno. O que você fez com essa percepção?',
    variantes: {
      'Calibração 2↔4': 'Quando você percebe que algo que fez afetou alguém, o que você geralmente faz com essa percepção?',
      'Calibração 4↔6': 'Quando o impacto que você causou é real mas não foi intencional — como você fica com isso?',
      'C/D': 'Olhando para como você processa os impactos que causa nas pessoas — você consegue identificar um padrão? Há situações em que você integra isso mais facilmente e outras em que é mais difícil?',
    },
  },

  // L3.4_CP usa os mesmos textos que L3.4 (default — sem condição de Pills)
  'L3.4_CP': {
    principal: 'Pense numa vez em que você percebeu — por conta própria ou porque alguém te mostrou — que algo que você fez afetou uma pessoa de um jeito significativo.\nO que aconteceu quando essa percepção chegou?',
    fallback: 'Tudo bem. Pense numa situação recente em que você percebeu que algo que disse ou fez causou algum efeito numa pessoa — mesmo que pequeno. O que você fez com essa percepção?',
    variantes: {
      'Calibração 2↔4': 'Quando você percebe que algo que fez afetou alguém, o que você geralmente faz com essa percepção?',
      'Calibração 4↔6': 'Quando o impacto que você causou é real mas não foi intencional — como você fica com isso?',
      'C/D': 'Olhando para como você processa os impactos que causa nas pessoas — você consegue identificar um padrão? Há situações em que você integra isso mais facilmente e outras em que é mais difícil?',
    },
  },

  // ──────────────────────────────────────
  // D4 — INTEGRAÇÃO SISTÊMICA
  // ──────────────────────────────────────

  'L4.1': {
    principal: 'Pense numa situação que você viveu — no trabalho, em casa, em qualquer contexto — onde o resultado dependia de como várias coisas se conectavam. Pode ser algo que deu errado quando não esperava, ou algo que funcionou de um jeito que te surpreendeu.\nO que você percebeu sobre como essas coisas se influenciavam?',
    fallback: 'Tudo bem. Pense em algo que aconteceu — no trabalho ou fora — que deu errado de um jeito que te surpreendeu. Olhando para trás, o que você percebe sobre o que causou aquilo?',
    variantes: {
      'Articulação': 'Você consegue descrever como essas conexões funcionavam — o que puxava o quê?',
      'Transferência': 'Esse tipo de percepção — de como coisas se conectam — aparece em outras áreas da sua vida também? Como?',
    },
  },

  'L4.2': {
    principal: 'Pense numa decisão que você tomou pensando no que ia acontecer depois — grande ou pequena. Algo em que você olhou para frente e tentou antecipar o que aquela escolha ia produzir no tempo.\nO que você levou em conta sobre o que podia acontecer mais adiante?',
    fallback: 'Tudo bem. Pense numa escolha que você fez recentemente — grande ou pequena. Você pensou em como aquilo podia desdobrar no tempo? O que passou pela sua cabeça?',
    variantes: {
      'Persistência': 'O que você antecipou aconteceu? Se não — o que você fez com isso?',
      'Meta-observação': 'Quando você pensa em como você toma decisões com consequências no tempo — há algum padrão que você reconhece?',
    },
  },

  'L4.3': {
    principal: 'Pense numa situação em que o que você sabia — uma ideia, uma leitura, uma experiência — era relevante, mas o contexto ao redor não era familiar com aquilo. As pessoas não esperavam ouvir aquilo de você, ou o assunto não era óbvio naquele ambiente.\nO que você fez com o que sabia nessa situação?',
    hint: 'Pode ser no trabalho, numa conversa, num grupo. O que importa é o que aconteceu com o que você sabia quando o contexto não era naturalmente receptivo.',
    fallback: 'Tudo bem. Pense numa conversa ou situação recente em que você sabia algo sobre o assunto — e a outra pessoa não. O que você fez com isso?',
    variantes: {
      'Corte 2↔4': 'Teve algum momento em que você sabia algo que poderia ter contribuído — mas ficou com isso? O que fez você não trazer?',
      'Corte 4↔6': 'O que você sabia mudou de alguma forma por causa do contexto — ou ficou intacto mesmo não sendo bem recebido?',
      'Meta-padrão C/D': 'Olhando para como você usa o que sabe em diferentes contextos — você consegue identificar um padrão? Há situações em que traz o que sabe mais facilmente e outras em que recua?',
    },
  },

  'L4.4': {
    principal: 'Pense numa situação em que você estava num grupo — numa reunião, numa conversa, num projeto — e algo mudou na dinâmica a partir de como você estava presente. Não necessariamente pelo que você disse, mas pela sua presença em si.\nO que aconteceu? Como você percebeu essa mudança?',
    hint: 'Pode ter sido algo sutil — uma conversa que ganhou outra direção, uma tensão que baixou, um espaço que se abriu.',
    fallback: 'Tudo bem. Pense numa reunião ou conversa recente em que você estava presente. Teve algum momento em que a sua presença mudou alguma coisa — mesmo que de forma sutil? O que você percebeu?',
    variantes: {
      'Adaptativa 2↔4': 'Quando você trazia o que sabia ou sentia nessas situações, o que mudava nas pessoas ao redor — no modo como respondiam, na conversa, no processo?',
      'Adaptativa 4↔6': 'Havia momentos em que você percebia que estava organizando o espaço ao redor — não pelo que dizia, mas por como estava? Como era isso?',
      'Adaptativa C/D': 'Você consegue identificar quando sua presença tem esse efeito e quando não tem? O que faz a diferença?',
    },
  },
}

// ──────────────────────────────────────
// Helper: retorna texto da pergunta atual
// (principal ou variante)
// ──────────────────────────────────────
export function getQuestionText(
  blockId: string,
  varianteName: string | null
): string {
  const block = QUESTIONS[blockId as BlockId]
  if (!block) return ''
  if (varianteName && block.variantes[varianteName]) {
    return block.variantes[varianteName]
  }
  return block.principal
}
