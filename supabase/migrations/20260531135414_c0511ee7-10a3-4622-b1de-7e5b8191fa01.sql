-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION CONSOLIDADA 2026-05-31 — Parte 3/3
-- BLOCO 3 — 51 perguntas pt-BR (questionnaire_content_variations)
-- Idempotente. UPDATE-only por id.
-- ═══════════════════════════════════════════════════════════════════════

-- L1.1 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma situação em que você estava fazendo algo importante — e algo ou alguém empurrou pra outra direção. O que estava te guiando naquele momento? E o que aconteceu com essa direção quando a pressão chegou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '40f92231-1219-464b-8164-6ca1e971575c';

-- L1.1 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Foque em um momento real em que você teve que escolher entre puxões em conflito.", "principal": "Descreva uma vez em que seu plano original foi interrompido — um conflito real entre o que você tinha decidido fazer e o que outra pessoa precisava ou as circunstâncias exigiam. Você ficou com a intenção original, mudou pra coisa nova, ou se dividiu entre as duas? O que te fez decidir?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '3fd9dce0-3f1c-4ff6-a041-ff915db5498d';

-- L1.1 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Esse é um marco baseado em valores: desalinhamento interno, não pressão externa.", "principal": "Lembre de uma vez em que percebeu que o que estava fazendo não estava alinhado com o que de fato importa pra você — não porque alguém te disse, mas porque você sentiu. O que você estava fazendo, e qual foi o sinal que disse que algo estava fora do eixo?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '732e76e6-eb96-41bc-a38d-b454ec1c90b8';

-- L1.2 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma vez em que estava cansado, sem vontade, ou não conseguia ver o sentido — e tinha algo que precisava ser feito. Você continuou, parou, ou fez pela metade? E se continuou — o que te manteve indo? Se parou — o que estava faltando?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '1b4dc850-2fed-4247-a206-90c52799c93b';

-- L1.2 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Trata-se de resistência num arco mais longo — não relutância inicial, mas fadiga se instalando durante o trabalho.", "principal": "Descreva uma situação em que estava fazendo algo que importava pra você — mas com o tempo, a luta ficou real. O esforço continuou difícil, ou a recompensa começou a parecer menos clara, ou o custo subiu. O que aconteceu? Você ficou com isso, achou outro jeito, ou eventualmente recuou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '1309b308-00bb-447f-9d4e-ac17ab662c72';

-- L1.2 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco está no momento em que continuar vira escolha consciente, não automática.", "principal": "Lembre de uma vez em que se comprometeu com algo e bateu num ponto onde continuar parecia genuinamente difícil — não só um dia ruim, mas uma dificuldade sustentada em que você teve que escolher continuar ou soltar. O que te fez decidir o que fazer?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'd0bf9f8e-2874-4098-80fd-501d8fbdb8bc';

-- L1.3 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma vez em que terminou algo e achou que o resultado estava bom — e alguém avaliou diferente. O que aconteceu com seu critério de 'bom o suficiente' quando essa avaliação chegou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '4091e29b-9da9-4054-a7ec-6f3e1662059a';

-- L1.3 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Captura o momento em que o que você julga como pronto encontra resistência real do usuário/destinatário.", "principal": "Descreva uma situação em que entregou um trabalho que atendia seus padrões — e a pessoa que recebeu rebateu, pediu mudanças, ou indicou que não era o que precisava. Como você recebeu esse feedback? Defendeu seu trabalho, revisou, ou outra coisa?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'eb48fc66-f733-4b4d-944e-9c9cda9c01fe';

-- L1.3 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é aprender qualidade pelo ciclo completo — não choque de julgamento no momento, mas percepção que vem do uso real.", "principal": "Lembre de uma vez em que entregou algo em que acreditava — e só depois descobriu que não tinha realizado o que você pretendia, ou que tinha criado consequências não previstas. O que aconteceu com sua noção de 'bom trabalho' quando você viu o impacto real?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '594e55a5-570b-48c0-a463-5c58b6356fc6';

-- L1.4 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma experiência que poderia ter mudado o jeito que você faz as coisas — no trabalho, em casa, em qualquer área. Algo que te mostrou algo novo ou diferente. Algo de fato mudou? Se mudou — o quê, e a mudança ficou? Ou as coisas voltaram aos poucos pro que eram?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'e4640303-5a8c-41ed-958d-039666d2e654';

-- L1.4 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é se a percepção virou de fato mudança de comportamento.", "principal": "Lembre de um momento em que aprendeu um jeito melhor de fazer alguma coisa — vendo alguém, falhando no jeito antigo, ou tentando algo experimental. Esse aprendizado deslocou como você de fato opera hoje, ou você foi voltando pros seus hábitos?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '27cba76d-7aea-40f6-9a40-657839bd438d';

-- L1.4 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Trata-se de evoluir genuinamente sua prática, ou só ouvir a lição.", "principal": "Lembre de uma vez em que feedback ou experiência revelou que sua abordagem habitual não funcionava tão bem quanto você pensava. Você de fato integrou isso e ajustou — ou foi se diluindo sem mudar muito?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '7e43a8e0-6366-4123-b31b-a175bf3f1dcb';

-- L2.1 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de um momento em que sentiu algo intensamente — raiva, medo, frustração, vergonha, tristeza profunda — numa situação em que precisava continuar funcionando. Descreva esse momento brevemente. Depois: o que você fez com o que estava sentindo? Algo organizou seu comportamento naquele momento, ou a emoção determinou o que aconteceu?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '0cf5dd6f-f652-43ea-b9bc-d2977ecd713f';

-- L2.1 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "A pergunta é se o sentimento controlou suas ações, ou se você teve agência no momento.", "principal": "Lembre de uma situação em que uma emoção forte chegou enquanto você tinha um trabalho pra fazer — estava com medo, furioso, profundamente machucado, ou envergonhado, mas ainda tinha que aparecer. O que aconteceu naquele momento? A emoção tomou conta do que você fez, ou algo te permitiu agir apesar dela?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '27c89031-9d68-4aec-ad27-694bd30a0be2';

-- L2.1 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Investiga o que acontece quando emoção e responsabilidade colidem.", "principal": "Lembre de uma vez em que sentiu algo poderosamente — e importava o que você fazia em seguida. Descreva brevemente: qual era a emoção, o que estava em jogo, e o que você de fato fez? Expressou, conteve, deixou guiar suas escolhas, ou de algum jeito gerenciou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '1d33ec88-4012-4781-8fb4-cf6f961f1b59';

-- L2.2 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma vez em que se interessou por algo que não tinha nada a ver com o que você faz no dia a dia — algo fora da sua área, do seu trabalho, do seu domínio habitual. O que aconteceu quando você foi atrás?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '7008aaa1-5866-4f87-b438-92d73ab5256c';

-- L2.2 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Captura o ângulo relacional: curiosidade chegando por outra pessoa, não auto-iniciada.", "principal": "Descreva uma situação em que alguém que você respeita — ou uma experiência — te expôs a uma ideia ou habilidade que não fazia parte do seu mundo. Você não estava procurando, mas quando encontrou, algo prendeu. O que você fez com essa exposição? Mudou alguma coisa em como você trabalha ou pensa?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '2011e90e-a729-4187-bf69-5cb6bd05a715';

-- L2.2 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é curiosidade nascida de necessidade ou atrito, não de interesse abstrato.", "principal": "Lembre de uma vez em que bateu num problema ou limitação no seu trabalho regular — e percebeu que não tinha o conhecimento ou a habilidade pra resolver bem. Essa lacuna te puxou pra aprender algo novo? Ou você contornou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'df256848-cbdb-437c-b72f-a1e4e535e648';

-- L2.3 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma fase da sua vida em que várias coisas importantes competiram pela sua energia e atenção ao mesmo tempo — trabalho, projeto pessoal, relações, saúde, qualquer combinação. Não uma semana atípica, mas um período em que a demanda era real e simultânea. O que acabou organizando pra onde sua energia foi? Como você decidiu — ou não decidiu — o que recebia atenção e o que esperava?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '2ab59ebe-f60e-443c-be65-8c30d1b862d0';

-- L2.3 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "A pergunta é se você tem uma arquitetura de decisão pra demandas que competem.", "principal": "Lembre de uma vez em que tinha vários compromissos ou responsabilidades significativas te puxando ao mesmo tempo — sem uma única crise, mas um esticamento real em que tudo importava. Descreva como você navegou. Qual princípio ou instinto guiou onde você focou? Ou você só reagia momento a momento?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '1b6dc9a9-325c-4d43-b006-adffa64bf96e';

-- L2.3 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Revela se você tem clareza sobre o que recebe prioridade quando tudo não pode receber tudo.", "principal": "Lembre de um período em que estava gerenciando várias áreas importantes ao mesmo tempo — relações, trabalho, algo pessoal, talvez saúde ou crescimento. Como você de fato alocou seu tempo e energia? Tinha uma lógica, ou parecia mais caos?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '536b36ff-c140-4562-8de6-f3b4aaca1a92';

-- L2.4 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre da última vez em que descobriu algo sobre você que não sabia — ou não tinha visto. Pode ter vindo de outra pessoa, de uma situação, ou de um momento sozinho. O que aconteceu?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'b642b659-d8ed-49f1-968c-5e1b58079a68';

-- L2.4 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "A descoberta não precisa ser dramática; trata-se de ganhar uma autoimagem mais clara.", "principal": "Descreva um momento em que encontrou um reflexo de si mesmo — pela observação honesta de outra pessoa, ou se vendo num contexto inesperado — que revelou algo que você não tinha reconhecido. O que mudou em como você se entende?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'b945bccd-7042-4d11-8765-fc0f4c78dd26';

-- L2.4 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Esse é auto-descoberto: você notou algo sobre si mesmo sem reflexo externo.", "principal": "Lembre de um momento em que se pegou se comportando de um jeito que te surpreendeu — você fez ou disse algo e depois pensou: 'de onde isso veio?' O que esse comportamento inesperado te ensinou sobre quem você está virando?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '7c7618cf-8af2-47ef-88f0-b789b93cddef';

-- L3.1 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma situação em que trabalhou junto com outras pessoas pra fazer algo — e teve que descobrir como contribuir nesse processo. O que vocês fizeram juntos? E qual, dentro desse trabalho, foi especificamente sua contribuição?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'cd2fd56b-997f-4e70-9dd1-28a11dad9811';

-- L3.1 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Trata-se de se ver dentro de uma estrutura colaborativa maior.", "principal": "Lembre de uma vez em que fez parte de um time ou grupo trabalhando rumo a um objetivo compartilhado — não só ao lado das pessoas, mas de forma interdependente. Descreva o que o grupo estava criando ou resolvendo. Depois: qual era distintamente seu papel ou parte?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '25cba439-0fb9-4679-847f-980e066e9a3d';

-- L3.1 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "A pergunta é como você se posiciona e contribui dentro de uma restrição colaborativa.", "principal": "Lembre da última vez em que esteve num grupo trabalhando em algo que exigia coordenação real — onde as pessoas dependiam umas das outras pra entregar. Qual era especificamente sua parte, e como ela se conectava ao que os outros estavam fazendo?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'ec31084e-f8c7-4a9f-b714-9e90d21bcda9';

-- L3.2 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma situação em que o grupo à sua volta operava de um jeito que não era o seu — uma prática, uma regra não dita, ou uma forma de fazer as coisas que você via diferente. Qual era essa diferença? E o que você fez?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'e662400c-8d67-49cd-a32e-8b62900d55c5';

-- L3.2 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é sua agência quando encontra uma cultura de grupo que não é a sua.", "principal": "Descreva um contexto em que observou o grupo ou comunidade operando segundo normas, hábitos ou valores que não se alinhavam com como você via as coisas. Qual era a diferença de perspectiva? Como você respondeu — adaptou, resistiu, falou, observou em silêncio, ou outra coisa?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '5036c0c6-b150-48da-ab8e-aca0c5e6fc5d';

-- L3.2 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Investiga como você navega estar dentro de um sistema que vê diferente.", "principal": "Lembre de uma vez em que estava num grupo com um jeito estabelecido de fazer alguma coisa — um entendimento ou prática compartilhada — que você experimentou como fora ou desalinhado da sua própria visão. O que você fez a respeito?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'ba101a17-869b-4bd2-b733-5bf09bc2e277';

-- L3.3 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma situação em que as coisas ficaram difíceis entre você e alguém — uma tensão que não se resolveu rápido. O que aconteceu? E como vocês ficaram enquanto isso durou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '8ef479cd-bee8-42ea-aa27-96905237ca2a';

-- L3.3 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Não uma briga que se resolveu numa conversa — um período de dificuldade não resolvida.", "principal": "Descreva um conflito ou tensão sustentada com alguém da sua vida — algo que arrastou, não se resolveu rápido, e criou estranheza ou distância. O que aconteceu enquanto você ficou travado nesse conflito? Como vocês se relacionavam?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'e9e6ced7-7c44-4acc-8bd8-0098740dba28';

-- L3.3 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é sua experiência interna durante o conflito, não a dinâmica interpessoal.", "principal": "Lembre de uma vez em que estava num desacordo com alguém importante — e notou o que estava acontecendo dentro de você durante o conflito. Você estava tentando ganhar, tentando entender, tentando escapar? O que de fato fez com essa consciência?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '8a34843b-748d-4603-aaaf-c5f3b46a153c';

-- L3.4 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma vez em que percebeu — sozinho ou porque alguém te mostrou — que algo que você fez afetou uma pessoa de um jeito significativo. O que aconteceu quando essa percepção chegou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '72ddeb3f-ef59-462d-8983-0ff210056287';

-- L3.4 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Trata-se do momento em que você vê sua própria agência pelo lado da outra pessoa.", "principal": "Lembre de um momento em que ficou ciente de que uma ação sua, ou algo que disse, impactou alguém mais profundamente do que você tinha entendido — talvez ela te contou, ou você de repente viu. Como você recebeu? O que fez?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'ccf6f251-eedf-4a72-9575-162eca24adae';

-- L3.4 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é o reconhecimento atrasado: perceber influência que você não viu no momento.", "principal": "Lembre de algo que você fez ou disse meses atrás — talvez até mais — que depois percebeu ter tido um efeito maior em alguém do que você pensou na hora. Como você chegou a entender esse impacto atrasado? O que fez a respeito?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'a680021c-abe1-4044-8759-fad551eab972';

-- L3.4_CP V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma vez em que percebeu — sozinho ou porque alguém te mostrou — que algo que você fez afetou uma pessoa de um jeito significativo. O que aconteceu quando essa percepção chegou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'dc037503-e967-4f24-90c9-4d42f49166ca';

-- L3.4_CP V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Essa versão enfatiza o ciclo de feedback relacional.", "principal": "Descreva uma situação em que alguém te mostrou diretamente — pelas palavras ou pelo afastamento — que seu comportamento tinha machucado ou afetado significativamente. Como você respondeu a essa confrontação?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'ededf894-79f8-49f3-b3e9-0bca53414806';

-- L3.4_CP V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Algumas percepções vêm devagar; isso captura a versão mais lenta da responsabilização.", "principal": "Lembre de uma instância em que entendeu aos poucos que suas ações tiveram efeitos em cadeia pra outra pessoa. Você endereçou? O que te fez agir ou ficar em silêncio?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'e317c414-8363-40bd-bc7c-d0bcab7101e5';

-- L4.1 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma situação que viveu — no trabalho, em casa, em qualquer contexto — em que o resultado dependeu de como várias coisas se conectaram. Pode ser algo que deu errado quando você não esperava, ou algo que funcionou de um jeito que te surpreendeu. O que você notou sobre como essas coisas se influenciavam?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'd69a9199-46a5-4a17-98ef-4430f3f36285';

-- L4.1 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Investiga se você consegue ver sistemas — como partes afetam o todo.", "principal": "Lembre de uma vez específica em que algo aconteceu diferente do esperado — e quando você olhou de perto, percebeu que era por causa de múltiplos fatores se afetando, não uma causa só. Que fatores eram esses, e como se conectavam?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'e0e49147-7a1a-4c4c-83af-17422da7cf1c';

-- L4.1 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é reconhecimento de padrão: você consegue manter múltiplas influências em vista ao mesmo tempo?", "principal": "Lembre de um momento em que percebeu que o resultado não era sobre uma coisa dar certo ou errada — era sobre como várias coisas interagiram. Descreva esse momento: quais eram os elementos, e o que viu sobre as conexões deles?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'd3724324-3fc9-4eda-9139-8515196e771f';

-- L4.2 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma decisão que tomou pensando no que viria depois — grande ou pequena. Algo em que olhou pra frente e tentou antecipar o que aquela escolha ia produzir ao longo do tempo. O que levou em conta sobre o que poderia acontecer mais à frente?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '5c6bba7e-e822-41c9-b054-8661c11cbb40';

-- L4.2 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Captura o ângulo temporal: como você negocia entre consequências imediatas e tardias em tempo real.", "principal": "Lembre de uma vez em que escolheu fazer algo diferente do que faria normalmente — porque estava pensando numa consequência de longo prazo. Sacrificou algo imediato pra evitar ou construir algo mais à frente. Qual foi essa troca, e funcionou do jeito que antecipou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '07e307f9-a25b-4831-a83f-dc50692747ba';

-- L4.2 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é simplificado: sua escolha levou em conta impacto no futuro de outra pessoa?", "principal": "Lembre de uma decisão em que percebeu — antes ou depois — que sua escolha ia afetar não só você, mas o futuro de outra pessoa. Você estava ciente dessa influência na hora? Como ela moldou o que você escolheu?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'dc5f1707-3cb8-4528-8539-dc656ca52098';

-- L4.3 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma situação em que o que você sabia — uma ideia, uma leitura, uma experiência — era relevante, mas o contexto à sua volta não estava familiarizado. As pessoas não esperavam ouvir aquilo de você, ou o assunto não era óbvio naquele ambiente. O que você fez com o que sabia naquela situação?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '1e5abd47-edcc-4ec6-825f-7d6059c6c697';

-- L4.3 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Trata-se da autoridade de falar o que você sabe mesmo quando é inesperado.", "principal": "Lembre de um momento em que tinha conhecimento ou percepção sobre algo — de estudo, experiência ou entendimento — que parecia valioso na situação, mas as pessoas em volta não reconheciam como relevante ou não esperavam que você oferecesse. Como você navegou? Falou, segurou, ou algo no meio?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '7079ca35-28e6-4e6d-a2e2-91e9e1bb035c';

-- L4.3 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é sua agência em torno de dizer a verdade em contextos onde não é automaticamente acreditado.", "principal": "Lembre de uma vez em que entendeu algo importante sobre uma situação — algo que outros na sala não viam ou não estavam enquadrando — e teve que decidir se trazia à tona. O que te fez decidir o que fazer?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = 'f5c6ae58-8648-40ff-aff1-8a421626f661';

-- L4.4 V1
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": null, "principal": "Lembre de uma situação em que estava num grupo — uma reunião, uma conversa, um projeto — e algo mudou na dinâmica a partir de como você estava presente. Não necessariamente do que disse, mas da sua presença em si. O que aconteceu? Como você notou essa mudança?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '13316e16-dd92-4c37-8a5b-faa79745befb';

-- L4.4 V2
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "Trata-se de presença como influência; não ação, mas ser.", "principal": "Lembre de uma vez específica num grupo — uma reunião, uma conversa tensa, um momento colaborativo — em que algo mudou na sala, e você suspeita que tinha a ver com como você estava aparecendo, não com o que disse. O que aconteceu? Como notou a mudança?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '1b9558e9-0924-4b8a-8967-33c8913c89b5';

-- L4.4 V3
UPDATE questionnaire_content_variations
SET content = $rdwth_final${"fallback": null, "hint": "O foco é sentir seu próprio impacto pela responsividade do grupo.", "principal": "Lembre de uma interação em grupo específica em que notou que seu próprio estado — sua energia, sua escuta, seu registro emocional — parecia afetar como os outros se engajavam. O que estava acontecendo, e o que mudou?", "subfallback": null}$rdwth_final$::jsonb
WHERE id = '4966feb3-86a6-46f7-9a3a-37566ff1471d';
