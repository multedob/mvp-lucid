-- ============================================================
-- Migration: questionnaire_content_variations PT-BR (51 rows)
-- Fase 4.3 — Multi-locale (preserva EN, adiciona PT-BR)
-- Versão: i18n-questionnaires-v1
-- ============================================================

BEGIN;

-- ─── L1.1 — Direção Intencional ──────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.1', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma situação em que você estava fazendo algo importante — e algo ou alguém empurrou pra outra direção. O que estava te organizando naquele momento? E o que aconteceu com essa direção quando a pressão chegou?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.1', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Foque em um momento real em que você teve que escolher entre puxões em conflito.",
  "fallback": null,
  "principal": "Descreva uma vez em que seu plano original foi interrompido — um conflito real entre o que você tinha decidido fazer e o que outra pessoa precisava ou as circunstâncias exigiam. Você ficou com a intenção original, mudou pra coisa nova, ou se dividiu entre as duas? O que te fez decidir?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.1', 1, 'pt-BR', 'V3', $JSON${
  "hint": "Esse é um marco baseado em valores: desalinhamento interno, não pressão externa.",
  "fallback": null,
  "principal": "Lembre de uma vez em que percebeu que o que estava fazendo não estava alinhado com o que de fato importa pra você — não porque alguém te disse, mas porque você sentiu. O que você estava fazendo, e qual foi o sinal que disse que algo estava fora do eixo?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L1.2 — Disciplina Sustentada ────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.2', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma vez em que estava cansado, sem vontade, ou não conseguia ver o sentido — e tinha algo que precisava ser feito. Você continuou, parou, ou fez pela metade? E se continuou — o que te manteve indo? Se parou — o que estava faltando?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.2', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Trata-se de resistência num arco mais longo — não relutância inicial, mas fadiga se instalando durante o trabalho.",
  "fallback": null,
  "principal": "Descreva uma situação em que estava fazendo algo que importava pra você — mas com o tempo, a luta ficou real. O esforço continuou difícil, ou a recompensa começou a parecer menos clara, ou o custo subiu. O que aconteceu? Você ficou com isso, achou outro jeito, ou eventualmente recuou?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.2', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco está no momento em que continuar vira escolha consciente, não automática.",
  "fallback": null,
  "principal": "Lembre de uma vez em que se comprometeu com algo e bateu num ponto onde continuar parecia genuinamente difícil — não só um dia ruim, mas uma dificuldade sustentada em que você teve que escolher continuar ou soltar. O que te fez decidir o que fazer?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L1.3 — Qualidade de Entrega ─────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.3', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma vez em que terminou algo e achou que o resultado estava bom — e alguém avaliou diferente. O que aconteceu com seu critério de 'bom o suficiente' quando essa avaliação chegou?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.3', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Captura o momento em que o que você julga como pronto encontra resistência real do usuário/destinatário.",
  "fallback": null,
  "principal": "Descreva uma situação em que entregou um trabalho que atendia seus padrões — e a pessoa que recebeu rebateu, pediu mudanças, ou indicou que não era o que precisava. Como você recebeu esse feedback? Defendeu seu trabalho, revisou, ou outra coisa?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.3', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco é aprender qualidade pelo ciclo completo — não choque de julgamento no momento, mas percepção que vem do uso real.",
  "fallback": null,
  "principal": "Lembre de uma vez em que entregou algo em que acreditava — e só depois descobriu que não tinha realizado o que você pretendia, ou que tinha criado consequências não previstas. O que aconteceu com sua noção de 'bom trabalho' quando você viu o impacto real?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L1.4 — Aprimoramento Contínuo ───────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.4', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma experiência que poderia ter mudado o jeito que você faz as coisas — no trabalho, em casa, em qualquer área. Algo que te mostrou algo novo ou diferente. Algo de fato mudou? Se mudou — o quê, e a mudança ficou? Ou as coisas voltaram aos poucos pro que eram?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.4', 1, 'pt-BR', 'V2', $JSON${
  "hint": "O foco é se a percepção virou de fato mudança de comportamento.",
  "fallback": null,
  "principal": "Lembre de um momento em que aprendeu um jeito melhor de fazer alguma coisa — vendo alguém, falhando no jeito antigo, ou tentando algo experimental. Esse aprendizado deslocou como você de fato opera hoje, ou você foi voltando pros seus hábitos?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L1.4', 1, 'pt-BR', 'V3', $JSON${
  "hint": "Trata-se de evoluir genuinamente sua prática, ou só ouvir a lição.",
  "fallback": null,
  "principal": "Lembre de uma vez em que feedback ou experiência revelou que sua abordagem habitual não funcionava tão bem quanto você pensava. Você de fato integrou isso e ajustou — ou foi se diluindo sem mudar muito?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L2.1 — Integração Emocional ─────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.1', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de um momento em que sentiu algo intensamente — raiva, medo, frustração, vergonha, tristeza profunda — numa situação em que precisava continuar funcionando. Descreva esse momento brevemente. Depois: o que você fez com o que estava sentindo? Algo organizou seu comportamento naquele momento, ou a emoção determinou o que aconteceu?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.1', 1, 'pt-BR', 'V2', $JSON${
  "hint": "A pergunta é se o sentimento controlou suas ações, ou se você teve agência no momento.",
  "fallback": null,
  "principal": "Lembre de uma situação em que uma emoção forte chegou enquanto você tinha um trabalho pra fazer — estava com medo, furioso, profundamente machucado, ou envergonhado, mas ainda tinha que aparecer. O que aconteceu naquele momento? A emoção tomou conta do que você fez, ou algo te permitiu agir apesar dela?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.1', 1, 'pt-BR', 'V3', $JSON${
  "hint": "Investiga o que acontece quando emoção e responsabilidade colidem.",
  "fallback": null,
  "principal": "Lembre de uma vez em que sentiu algo poderosamente — e importava o que você fazia em seguida. Descreva brevemente: qual era a emoção, o que estava em jogo, e o que você de fato fez? Expressou, conteve, deixou guiar suas escolhas, ou de algum jeito gerenciou?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L2.2 — Curiosidade e Assimilação ────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.2', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma vez em que se interessou por algo que não tinha nada a ver com o que você faz no dia a dia — algo fora da sua área, do seu trabalho, do seu domínio habitual. O que aconteceu quando você foi atrás?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.2', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Captura o ângulo relacional: curiosidade chegando por outra pessoa, não auto-iniciada.",
  "fallback": null,
  "principal": "Descreva uma situação em que alguém que você respeita — ou uma experiência — te expôs a uma ideia ou habilidade que não fazia parte do seu mundo. Você não estava procurando, mas quando encontrou, algo prendeu. O que você fez com essa exposição? Mudou alguma coisa em como você trabalha ou pensa?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.2', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco é curiosidade nascida de necessidade ou atrito, não de interesse abstrato.",
  "fallback": null,
  "principal": "Lembre de uma vez em que bateu num problema ou limitação no seu trabalho regular — e percebeu que não tinha o conhecimento ou a habilidade pra resolver bem. Essa lacuna te puxou pra aprender algo novo? Ou você contornou?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L2.3 — Alocação de Energia ──────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.3', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma fase da sua vida em que várias coisas importantes competiram pela sua energia e atenção ao mesmo tempo — trabalho, projeto pessoal, relações, saúde, qualquer combinação. Não uma semana atípica, mas um período em que a demanda era real e simultânea. O que acabou organizando pra onde sua energia foi? Como você decidiu — ou não decidiu — o que recebia atenção e o que esperava?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.3', 1, 'pt-BR', 'V2', $JSON${
  "hint": "A pergunta é se você tem uma arquitetura de decisão pra demandas que competem.",
  "fallback": null,
  "principal": "Lembre de uma vez em que tinha vários compromissos ou responsabilidades significativas te puxando ao mesmo tempo — sem uma única crise, mas um esticamento real em que tudo importava. Descreva como você navegou. Qual princípio ou instinto guiou onde você focou? Ou você só reagia momento a momento?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.3', 1, 'pt-BR', 'V3', $JSON${
  "hint": "Revela se você tem clareza sobre o que recebe prioridade quando tudo não pode receber tudo.",
  "fallback": null,
  "principal": "Lembre de um período em que estava gerenciando várias áreas importantes ao mesmo tempo — relações, trabalho, algo pessoal, talvez saúde ou crescimento. Como você de fato alocou seu tempo e energia? Tinha uma lógica, ou parecia mais caos?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L2.4 — Estrutura de Self ────────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.4', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre da última vez em que descobriu algo sobre você que não sabia — ou não tinha visto. Pode ter vindo de outra pessoa, de uma situação, ou de um momento sozinho. O que aconteceu?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.4', 1, 'pt-BR', 'V2', $JSON${
  "hint": "A descoberta não precisa ser dramática; trata-se de ganhar uma autoimagem mais clara.",
  "fallback": null,
  "principal": "Descreva um momento em que encontrou um reflexo de si mesmo — pela observação honesta de outra pessoa, ou se vendo num contexto inesperado — que revelou algo que você não tinha reconhecido. O que mudou em como você se entende?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L2.4', 1, 'pt-BR', 'V3', $JSON${
  "hint": "Esse é auto-descoberto: você notou algo sobre si mesmo sem reflexo externo.",
  "fallback": null,
  "principal": "Lembre de um momento em que se pegou se comportando de um jeito que te surpreendeu — você fez ou disse algo e depois pensou: 'de onde isso veio?' O que esse comportamento inesperado te ensinou sobre quem você está virando?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L3.1 — Cooperação ───────────────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.1', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma situação em que trabalhou junto com outras pessoas pra fazer algo — e teve que descobrir como contribuir nesse processo. O que vocês fizeram juntos? E qual, dentro desse trabalho, foi especificamente sua contribuição?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.1', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Trata-se de se ver dentro de uma estrutura colaborativa maior.",
  "fallback": null,
  "principal": "Lembre de uma vez em que fez parte de um time ou grupo trabalhando rumo a um objetivo compartilhado — não só ao lado das pessoas, mas de forma interdependente. Descreva o que o grupo estava criando ou resolvendo. Depois: qual era distintamente seu papel ou parte?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.1', 1, 'pt-BR', 'V3', $JSON${
  "hint": "A pergunta é como você se posiciona e contribui dentro de uma restrição colaborativa.",
  "fallback": null,
  "principal": "Lembre da última vez em que esteve num grupo trabalhando em algo que exigia coordenação real — onde as pessoas dependiam umas das outras pra entregar. Qual era especificamente sua parte, e como ela se conectava ao que os outros estavam fazendo?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L3.2 — Diferença Social ─────────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.2', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma situação em que o grupo à sua volta operava de um jeito que não era o seu — uma prática, uma regra não dita, ou uma forma de fazer as coisas que você via diferente. Qual era essa diferença? E o que você fez?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.2', 1, 'pt-BR', 'V2', $JSON${
  "hint": "O foco é sua agência quando encontra uma cultura de grupo que não é a sua.",
  "fallback": null,
  "principal": "Descreva um contexto em que observou o grupo ou comunidade operando segundo normas, hábitos ou valores que não se alinhavam com como você via as coisas. Qual era a diferença de perspectiva? Como você respondeu — adaptou, resistiu, falou, observou em silêncio, ou outra coisa?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.2', 1, 'pt-BR', 'V3', $JSON${
  "hint": "Investiga como você navega estar dentro de um sistema que vê diferente.",
  "fallback": null,
  "principal": "Lembre de uma vez em que estava num grupo com um jeito estabelecido de fazer alguma coisa — um entendimento ou prática compartilhada — que você experimentou como fora ou desalinhado da sua própria visão. O que você fez a respeito?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L3.3 — Conflito ─────────────────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.3', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma situação em que as coisas ficaram difíceis entre você e alguém — uma tensão que não se resolveu rápido. O que aconteceu? E como vocês ficaram enquanto isso durou?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.3', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Não uma briga que se resolveu numa conversa — um período de dificuldade não resolvida.",
  "fallback": null,
  "principal": "Descreva um conflito ou tensão sustentada com alguém da sua vida — algo que arrastou, não se resolveu rápido, e criou estranheza ou distância. O que aconteceu enquanto você ficou travado nesse conflito? Como vocês se relacionavam?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.3', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco é sua experiência interna durante o conflito, não a dinâmica interpessoal.",
  "fallback": null,
  "principal": "Lembre de uma vez em que estava num desacordo com alguém importante — e notou o que estava acontecendo dentro de você durante o conflito. Você estava tentando ganhar, tentando entender, tentando escapar? O que de fato fez com essa consciência?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L3.4 — Influência ───────────────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.4', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma vez em que percebeu — sozinho ou porque alguém te mostrou — que algo que você fez afetou uma pessoa de um jeito significativo. O que aconteceu quando essa percepção chegou?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.4', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Trata-se do momento em que você vê sua própria agência pelo lado da outra pessoa.",
  "fallback": null,
  "principal": "Lembre de um momento em que ficou ciente de que uma ação sua, ou algo que disse, impactou alguém mais profundamente do que você tinha entendido — talvez ela te contou, ou você de repente viu. Como você recebeu? O que fez?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.4', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco é o reconhecimento atrasado: perceber influência que você não viu no momento.",
  "fallback": null,
  "principal": "Lembre de algo que você fez ou disse meses atrás — talvez até mais — que depois percebeu ter tido um efeito maior em alguém do que você pensou na hora. Como você chegou a entender esse impacto atrasado? O que fez a respeito?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L3.4_CP — Influência (Counterpart) ──────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.4_CP', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma vez em que percebeu — sozinho ou porque alguém te mostrou — que algo que você fez afetou uma pessoa de um jeito significativo. O que aconteceu quando essa percepção chegou?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.4_CP', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Essa versão enfatiza o ciclo de feedback relacional.",
  "fallback": null,
  "principal": "Descreva uma situação em que alguém te mostrou diretamente — pelas palavras ou pelo afastamento — que seu comportamento tinha machucado ou afetado significativamente. Como você respondeu a essa confrontação?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L3.4_CP', 1, 'pt-BR', 'V3', $JSON${
  "hint": "Algumas percepções vêm devagar; isso captura a versão mais lenta da responsabilização.",
  "fallback": null,
  "principal": "Lembre de uma instância em que entendeu aos poucos que suas ações tiveram efeitos em cadeia pra outra pessoa. Você endereçou? O que te fez agir ou ficar em silêncio?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L4.1 — Visão Sistêmica ──────────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.1', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma situação que viveu — no trabalho, em casa, em qualquer contexto — em que o resultado dependeu de como várias coisas se conectaram. Pode ser algo que deu errado quando você não esperava, ou algo que funcionou de um jeito que te surpreendeu. O que você notou sobre como essas coisas se influenciavam?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.1', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Investiga se você consegue ver sistemas — como partes afetam o todo.",
  "fallback": null,
  "principal": "Me conta de uma vez específica em que algo aconteceu diferente do esperado — e quando você olhou de perto, percebeu que era por causa de múltiplos fatores se afetando, não uma causa só. Que fatores eram esses, e como se conectavam?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.1', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco é reconhecimento de padrão: você consegue manter múltiplas influências em vista ao mesmo tempo?",
  "fallback": null,
  "principal": "Lembre de um momento em que percebeu que o resultado não era sobre uma coisa dar certo ou errada — era sobre como várias coisas interagiram. Descreva esse momento: quais eram os elementos, e o que viu sobre as conexões deles?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L4.2 — Decisão de Longo Prazo ───────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.2', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma decisão que tomou pensando no que viria depois — grande ou pequena. Algo em que olhou pra frente e tentou antecipar o que aquela escolha ia produzir ao longo do tempo. O que levou em conta sobre o que poderia acontecer mais à frente?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.2', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Captura o ângulo temporal: como você negocia entre consequências imediatas e tardias em tempo real.",
  "fallback": null,
  "principal": "Lembre de uma vez em que escolheu fazer algo diferente do que faria normalmente — porque estava pensando numa consequência de longo prazo. Sacrificou algo imediato pra evitar ou construir algo mais à frente. Qual foi essa troca, e funcionou do jeito que antecipou?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.2', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco é simplificado: sua escolha levou em conta impacto no futuro de outra pessoa?",
  "fallback": null,
  "principal": "Lembre de uma decisão em que percebeu — antes ou depois — que sua escolha ia afetar não só você, mas o futuro de outra pessoa. Você estava ciente dessa influência na hora? Como ela moldou o que você escolheu?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L4.3 — Comunicação Assertiva ────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.3', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma situação em que o que você sabia — uma ideia, uma leitura, uma experiência — era relevante, mas o contexto à sua volta não estava familiarizado. As pessoas não esperavam ouvir aquilo de você, ou o assunto não era óbvio naquele ambiente. O que você fez com o que sabia naquela situação?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.3', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Trata-se da autoridade de falar o que você sabe mesmo quando é inesperado.",
  "fallback": null,
  "principal": "Lembre de um momento em que tinha conhecimento ou percepção sobre algo — de estudo, experiência ou entendimento — que parecia valioso na situação, mas as pessoas em volta não reconheciam como relevante ou não esperavam que você oferecesse. Como você navegou? Falou, segurou, ou algo no meio?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.3', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco é sua agência em torno de dizer a verdade em contextos onde não é automaticamente acreditado.",
  "fallback": null,
  "principal": "Lembre de uma vez em que entendeu algo importante sobre uma situação — algo que outros na sala não viam ou não estavam enquadrando — e teve que decidir se trazia à tona. O que te fez decidir o que fazer?",
  "subfallback": null
}$JSON$::jsonb);

-- ─── L4.4 — Presença e Influência ────────────────────────────

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.4', 1, 'pt-BR', 'V1', $JSON${
  "hint": null,
  "fallback": null,
  "principal": "Lembre de uma situação em que estava num grupo — uma reunião, uma conversa, um projeto — e algo mudou na dinâmica a partir de como você estava presente. Não necessariamente do que disse, mas da sua presença em si. O que aconteceu? Como você notou essa mudança?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.4', 1, 'pt-BR', 'V2', $JSON${
  "hint": "Trata-se de presença como influência; não ação, mas ser.",
  "fallback": null,
  "principal": "Lembre de uma vez específica num grupo — uma reunião, uma conversa tensa, um momento colaborativo — em que algo mudou na sala, e você suspeita que tinha a ver com como você estava aparecendo, não com o que disse. O que aconteceu? Como notou a mudança?",
  "subfallback": null
}$JSON$::jsonb);

INSERT INTO public.questionnaire_content_variations (block_id, ipe_level, locale, variation_key, content)
VALUES ('L4.4', 1, 'pt-BR', 'V3', $JSON${
  "hint": "O foco é sentir seu próprio impacto pela responsividade do grupo.",
  "fallback": null,
  "principal": "Lembre de uma interação em grupo específica em que notou que seu próprio estado — sua energia, sua escuta, seu registro emocional — parecia afetar como os outros se engajavam. O que estava acontecendo, e o que mudou?",
  "subfallback": null
}$JSON$::jsonb);

COMMIT;

-- ============================================================
-- Validação pós-aplicação:
-- SELECT block_id, variation_key, locale FROM questionnaire_content_variations
-- WHERE locale='pt-BR' ORDER BY block_id, variation_key;
-- Esperado: 51 rows.
-- ============================================================
