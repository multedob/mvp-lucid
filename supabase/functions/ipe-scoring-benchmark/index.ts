// ============================================================
// ipe-scoring-benchmark/index.ts — v2.0 ASYNC
// Benchmark assíncrono do edge function ipe-scoring.
// POST → cria job, retorna job_id imediatamente, processa em background.
// POST com {"job_id": "..."} → consulta status/resultado.
//
// COMO CHAMAR:
//   # Disparar benchmark
//   curl -X POST .../functions/v1/ipe-scoring-benchmark \
//     -H "Authorization: Bearer <KEY>" -H "Content-Type: application/json" \
//     -d '{"pills": ["PI"], "cleanup": true}'
//   → retorna {"job_id": "abc-123", "status": "running"}
//
//   # Consultar resultado
//   curl -X POST .../functions/v1/ipe-scoring-benchmark \
//     -H "Authorization: Bearer <KEY>" -H "Content-Type: application/json" \
//     -d '{"job_id": "abc-123"}'
//   → retorna resultado completo quando status=completed
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const IL_TOLERANCE = 0.5;
const PAUSE_MS     = 800;

// ─────────────────────────────────────────────────────────────────────────────
// CORPUS E CANÔNICOS — embutidos inline
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CORPUS: any[] = [{"persona":"P2-B","pill":"PI","m1_tempo_segundos":3,"m2_resposta":"Ela tá tentando se encaixar no grupo novo. O riso foi automático, tipo pra não parecer estranha. Acho que ela ainda não se sente parte de verdade.","m2_cal_signals":{"localizacao":"relacional","custo":"prático","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"2","duas_palavras":"é mais fácil","situacao_oposta":"Quando me pedem uma opinião e não dá pra escapar."},"M3_2_escolha":{"opcao":"A","abre_mao":"Abro mão de falar o que penso. Mas não faz sentido criar problema logo no começo. Depois que tiver mais firme ali, aí sim."},"M3_3_inventario":{"narrativa":"No começo da faculdade um amigo tava passando por coisa ruim em casa. Eu também tava me adaptando a tudo, era muita coisa ao mesmo tempo. Mas fiquei ali do lado dele do mesmo jeito.","condicao":"Acho que não pensei muito, só fui lá.","cobertura_L1_3":"Ele não reclamou. Ficou mais calmo. Acho que foi ok."}},"m4_resposta":{"percepcao":"Foi interessante. Acho que me identifico com algumas partes mas é difícil dizer exatamente o quê."}},{"persona":"P2-B","pill":"PII","m1_tempo_segundos":2,"m2_resposta":"Ele ficou muito tempo no mesmo lugar e agora tá meio que no automático. Tipo, o trabalho tá ok mas não tem mais aquela coisa de querer fazer mais.","m2_cal_signals":{"localizacao":"externo","custo":"prático","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"8","duas_palavras":"é obrigação","situacao_oposta":"Quando percebo que fiz a mesma coisa de novo sem pensar."},"M3_2_escolha":{"opcao":"A","abre_mao":"Eu pago. Mas não muda nada pra quem depende de mim. Eles continuam contando com o que eu entrego."},"M3_3_inventario":{"narrativa":"Tinha um projeto na consultoria que eu não tava mais com vontade de fazer. Ficou arrastando por uns dois meses. Fui do mesmo jeito.","condicao":"Era minha responsabilidade, não dava pra largar.","cobertura_L1_3":"Quando entrego no prazo e o cliente não reclama.","cobertura_L1_4":"Não mudou muita coisa não. Aprendi que tem hora que faz parte."}},"m4_resposta":{"percepcao":"Faz sentido. Acho que não penso muito sobre isso não."}},{"persona":"P2-B","pill":"PIII","m1_tempo_segundos":null,"m2_resposta":"Acho que ela viu que ficou sete anos numa empresa sem questionar direito. Na reunião de dois anos atrás ela provavelmente percebeu que não concordava com alguma coisa mas deixou passar mesmo assim. Agora que saiu consegue ver que aquilo foi um sinal que ela ignorou.","m2_cal_signals":{"localizacao":"externo","custo":"prático","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"8","duas_palavras":"tarde, óbvio","situacao_oposta":"Quando bate saudade aí vira peso."},"M3_2_escolha":{"opcao":"B","abre_mao":"Acho que prefiro focar no que vem. Não gosto de ficar repassando o que deu errado. O que aconteceu, aconteceu — não adianta muito ficar revirando."},"M3_3_inventario":{"narrativa":"No meu primeiro ano de trabalho a gente teve um projeto que não foi bem. Entregamos com atraso e o cliente ficou insatisfeito. Na hora não entendia direito o que tinha dado errado.","condicao":"Depois percebi que o time não tinha claro o que o cliente queria de verdade. Faltou alinhar melhor antes.","cobertura_L2_2":"Fiquei com vontade de entender mais o que o cliente esperava. Mas também acho que eu devia ter perguntado mais na época.","cobertura_L1_3":"Quando o gestor aprovava ou quando o cliente parava de mandar e-mail com correção."}},"m4_resposta":{"percepcao":"Foi meio diferente responder. Aprendi bastante com o que passou. Ainda tenho muito a melhorar."}},{"persona":"P2-B","pill":"PIV","m1_tempo_segundos":null,"m2_resposta":"Marina tá com o peso todo nas costas porque os irmãos não estão ajudando. Ela foi visitar a mãe e ficou no carro pensando porque não sabe como cobrar os irmãos sem criar confusão. É difícil quando você é o único que tá perto.","m2_cal_signals":{"localizacao":"externo-relacional","custo":"prático","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"8","duas_palavras":"prático, direto","situacao_oposta":"Quando envolve família ou amigo próximo aí fico mais na dúvida."},"M3_2_escolha":{"opcao":"A","abre_mao":"Eu abro mão de falar o que penso. Mas às vezes é melhor não criar atrito. Se a pessoa não perguntou a opinião da gente, pode ser que não queira mesmo."},"M3_3_inventario":{"narrativa":"No meu trabalho o ano passado, percebi que um colega estava passando informação errada pro cliente nas reuniões. Não era mal intencionado, mas estava prejudicando o projeto.","condicao":"Falei com ele em particular. Não foi fácil mas achei que era a coisa certa. Não ia ficar bem se deixasse passar.","cobertura_L1_3":"Quando o gestor dava ok ou quando o cliente não reclamava mais."}},"m4_resposta":{"percepcao":"Acho que aprendi bastante respondendo isso. Às vezes a gente não para pra pensar nessas coisas."}},{"persona":"P2-B","pill":"PV","m1_tempo_segundos":null,"m2_resposta":"Miguel parece que tá entediado. A vida tá funcionando mas ele quer alguma coisa diferente, talvez um curso ou uma atividade nova. É o tipo de coisa que acontece quando tudo tá estável e você não tem um próximo passo claro. Acho que ele devia explorar alguma área nova ou hobby.","m2_cal_signals":{"localizacao":"externo","custo":"prático","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"7","duas_palavras":"oportunidade, direção","situacao_oposta":"Quando não aparece nada concreto de interessante fico meio perdido, sem saber por onde começar."},"M3_2_escolha":{"opcao":"A","abre_mao":"Escolheria ir fundo no que já sei. Tenho uma base e faz mais sentido aproveitar isso do que recomeçar do zero. O que eu abro mão é de conhecer coisa nova, mas prefiro explorar o que já tenho antes de mudar de direção."},"M3_3_inventario":{"narrativa":"Fui estudar gestão de projetos por conta. Vi que as coisas no trabalho não tinham muito método e resolvi aprender sozinho. Peguei uns vídeos e um livro.","condicao":"Me levou ver o problema no trabalho mesmo. Usei o que aprendi pra organizar melhor as demandas da equipe.","cobertura_L4_3":"Quando compartilho com a equipe eles acham útil. Às vezes perguntam mais sobre o assunto.","cobertura_L1_3":"Sabia que era suficiente quando os projetos começaram a sair melhor. Não tem um momento exato."}},"m4_resposta":{"percepcao":"Aprendi bastante respondendo isso. Nunca tinha pensado nessas perguntas assim."}},{"persona":"P2-B","pill":"PVI","m1_tempo_segundos":null,"m2_resposta":"Sofia parece que tá sobrecarregada. Ela foi longe com o projeto mas não sabe quando descansar. Isso acontece bastante com quem trabalha muito. Ela devia tentar se organizar melhor pra não se esgotar. O que ela tá sentindo no carro é provavelmente cansaço mesmo, só que ela não quer admitir.","m2_cal_signals":{"localizacao":"externo","custo":"prático","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"8","duas_palavras":"ritmo, perder","situacao_oposta":"Quando eu preciso parar é tipo fim de semana ou férias. Fico meio sem saber o que fazer de início."},"M3_2_escolha":{"opcao":"C","abre_mao":"Proporia um meio-termo porque é mais justo pros dois lados. Assim ninguém fica totalmente insatisfeito. Tentaria explicar por que as duas perspectivas fazem sentido e ver se chegamos num acordo."},"M3_3_inventario":{"narrativa":"No TCC tive que me dedicar bastante por vários meses. Precisei ler muita coisa, organizar tudo e entregar dentro do prazo.","condicao":"O que me manteve foi o prazo e saber que era obrigação. Não tinha como não terminar.","cobertura_L1_4":"Aprendi a me organizar melhor. Depois do TCC passei a montar cronograma antes de começar qualquer coisa grande.","cobertura_L1_3":"Quando cumpri o que foi pedido. Passei pela banca e aprovei."}},"m4_resposta":{"percepcao":"Foi ok. Essas perguntas são diferentes do que eu esperava."}},{"persona":"P3-M","pill":"PI","m1_tempo_segundos":12,"m2_resposta":"Renata está tentando encaixar, mas percebeu que está fingindo que já se encaixou. O riso foi uma resposta automática para parecer parte do grupo, mas em casa viu que não era de verdade. Acho que ela ainda não encontrou o jeito dela de estar ali — está tentando caber mais do que sendo ela mesma.","m2_cal_signals":{"localizacao":"relacional","custo":"relacional","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"4","duas_palavras":"evito atrito","situacao_oposta":"Quando já conheço bem a pessoa ou o contexto, aí falo mais diretamente o que acho. Com pessoas novas, prefiro entender o terreno primeiro."},"M3_2_escolha":{"opcao":"D","abre_mao":"Abro mão de deixar claro quem sou desde o início. Às vezes isso cria uma imagem que depois é difícil de mudar. Mas me parece que o custo de me expor cedo demais é maior que o custo de esperar."},"M3_3_inventario":{"narrativa":"Há uns três meses, quando já tinha assumido a gerência mas ainda não me sentia gerente, uma pessoa do meu time veio falar sobre um conflito com um colega. Eu estava no meio do meu próprio processo de entender o novo papel, mas ouvi ela e ajudei a pensar o que fazer.","condicao":"Acho que é parte do papel. Mesmo sem ter minhas coisas resolvidas, sabia que ela precisava de alguém para pensar junto. Tentei separar o que era o problema dela do que era o meu.","cobertura_L1_3":"Ela saiu da conversa com alguma clareza sobre o próximo passo. Quando isso acontece, acho que entreguei o suficiente."}},"m4_resposta":{"percepcao":"Percebi que tenho uma tendência de esperar, de não me expor antes de sentir que tenho terreno. Não sei se isso é prudência ou algo mais parecido com medo.","presenca_deslocamento":"Funciono mais em modo automático, menos como eu mesmo. Fico focado no que a situação pede e deixo o resto em segundo plano. Entrego o que o papel exige, mas com menos de mim dentro."}},{"persona":"P3-M","pill":"PII","m1_tempo_segundos":15,"m2_resposta":"Acho que ele continua fazendo as coisas por inércia, pelo papel que ocupou por anos. Mas chegou num ponto onde a motivação interna que sustentava isso foi mudando sem ele perceber — e a resposta automática para o colega mais novo foi o momento em que isso ficou visível. Ele ainda sabe fazer o trabalho, mas não sabe mais por que está fazendo. É como se o sentido tivesse se desconectado do que ele continua entregando.","m2_cal_signals":{"localizacao":"interno","custo":"existencial","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"7","duas_palavras":"referência dissolvendo","situacao_oposta":"Quando tenho uma entrega concreta, um projeto com prazo, aí o esforço de continuar toma conta — fico no modo de execução e não fico pensando no que mudou. É como se a agenda me tirasse do silêncio por um tempo."},"M3_2_escolha":{"opcao":"C","abre_mao":"Quem paga são as pessoas do meu time. Elas continuam recebendo a entrega técnica, a disponibilidade, mas talvez percebam que tem algo menos presente nessa relação. Não sei se percebem de fato, mas o risco é que a referência que eu representava comece a parecer menos sólida sem que eu tenha dito o porquê.","follow_up":"Preciso proteger o processo de transição — não quero que a dúvida que tenho sobre o papel novo vire uma dúvida deles sobre mim. Se perceberem antes de eu ter clareza, vira um problema de confiança que eu não sei resolver ainda."},"M3_3_inventario":{"narrativa":"Nos primeiros três meses como gerente, fui sustentando o ritmo do time enquanto ainda estava tentando entender o que gerenciar significava na prática. Não era o mesmo papel — as demandas eram diferentes, a lógica era diferente — mas continuei aparecendo, tomando decisão, conduzindo reunião.","o_que_manteve":"Responsabilidade com o time, principalmente. Eles tinham assumido novos projetos junto com a mudança de gestão. Não tinha espaço para eu parar e dizer que estava perdido — as coisas precisavam continuar.","cobertura_L1_4":"Mudou o que eu presto atenção. Antes eu sabia o que fazer porque o trabalho era claro. Agora fico mais atento às reações das pessoas, ao que o time está precisando — aprendi que gerenciar tem mais a ver com isso do que com dominar o conteúdo.","cobertura_L1_3":"Quando o time consegue executar o que planejamos, acho que fiz o suficiente. Se a entrega técnica está lá e as pessoas estão funcionando, o padrão foi cumprido."}},"m4_resposta":{"percepcao":"Que continuo bem enquanto tenho tarefas claras. Mas quando paro para pensar no que esse novo papel significa para mim — quem eu sou nele — fico sem resposta. Funciono, mas não sei muito bem de onde vem o que me faz continuar.","presenca_para_outros":"Acho que estou presente de forma mais técnica e funcional. Entrego o que precisa ser entregue, mas talvez não esteja totalmente lá na relação — há uma parte de mim que está ocupada tentando entender o que está acontecendo comigo."}},{"persona":"P3-M","pill":"PIII","m1_tempo_segundos":null,"m2_resposta":"Clara deve ter visto que criou uma rotina de não questionar as coisas. Na reunião que ela lembrou, provavelmente teve um momento onde cedeu em algo que importava — e na época pareceu razoável. De longe, ela vê o padrão do que foi cedendo.","m2_cal_signals":{"localizacao":"interna","custo":"moderado","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"40","duas_palavras":"minha omissão","situacao_oposta":"Quando alguém que foi afetado pelo que eu omiti está na minha frente, o olhar some — o peso toma o lugar."},"M3_2_escolha":{"opcao":"A","abre_mao":"Quando vejo claramente, prefiro não fingir que não vi. Não é conforto — carregar sabendo que ficou sem dizer cansa mais do que a conversa em si."},"M3_3_inventario":{"narrativa":"Coloquei uma pessoa do time num projeto que claramente não era pra ela. Eu sabia — mas tinha prazo e ela estava disponível. Ficou um semestre inteiro. Quando o projeto encerrou, pedi feedback pra ela. Foi grossa, mas reveladora.","o_que_mostrou":"Que eu tratei a decisão como operacional quando era pessoal. Tinha impacto real em alguém e eu enquadrei como alocação de recurso.","cobertura_L2_2":"Fiquei curioso sobre o que ela viveu no processo — não para mudar o que aconteceu, mas para entender o que ela percebeu sobre ela mesma naquele contexto. Essa parte me interessou mais do que o feedback sobre mim.","cobertura_L1_3":"Sabia que não estava ótimo. Mas o projeto foi entregue, a cliente ficou satisfeita. O critério era externo — e eu aceitei isso sem questionar muito."}},"m4_resposta":{"percepcao":"Fui mais direto do que costumo. Normalmente chamo de 'decisão de contexto' o que aqui ficou claro que foi omissão. A distância ajudou — sem ela, não tenho certeza se eu teria nomeado assim.","presenca_para_outros":"Diz que quando tenho distância do que aconteceu, consigo incluir o outro na conta. Quando estou no meio, o resultado domina o cálculo e o outro fica como variável, não como pessoa."}},{"persona":"P3-M","pill":"PIV","m1_tempo_segundos":null,"m2_resposta":"Marina já sabe o que vai ter que fazer — assumir a organização do cuidado da mãe. O que a mantém parada no carro é o cálculo de tudo que muda se ela der esse passo. Não é dúvida sobre o que é certo. É o peso de ser a única que vai mover.","m2_cal_signals":{"localizacao":"relacional-interna","custo":"alto","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"35","duas_palavras":"custo visível","situacao_oposta":"Quando eu não consigo ver todas as consequências do que decido, o custo deixa de ser gerenciável e aí a clareza some."},"M3_2_escolha":{"opcao":"A","abre_mao":"Quando a situação exige alguém que decida, esperar o consenso é uma forma de não decidir. Não é conforto agir assim — mas a alternativa é deixar a situação decidir por omissão.","abre_mao_followup":"Abro mão de ser percebido como o que consultou todo mundo. Talvez alguém interprete como arrogância. Aceito isso."},"M3_3_inventario":{"narrativa":"No primeiro mês como gerente, precisei redefinir prioridades do time sem ter todos os dados ainda. Tinha pressão de cima por entrega e pressão lateral de colegas que não entendiam a mudança. Decidi com o que tinha.","o_que_manteve":"A clareza de que não decidir também era uma decisão — e pior. Esse cálculo me manteve.","cobertura_L1_3":"Sabia quando o time conseguia trabalhar. Não era satisfação — era funcionalidade. O critério era operacional, não de qualidade."}},"m4_resposta":{"percepcao":"O que ficou foi que o custo que eu imaginava era maior do que o real. Consegui decidir e o time respondeu. Mas ainda não sei se foi porque a decisão foi boa ou porque o contexto estava a favor.","presenca_para_outros":"Diz que quando preciso agir, as pessoas entram no cálculo como variável de risco — quanto vai custar relacionalmente. Não como presença em si. Isso é um limite meu que ficou mais visível agora."}},{"persona":"P3-M","pill":"PV","m1_tempo_segundos":3,"m2_resposta":"Parece que ele tá entrando num momento de revisão. Não é crise — é mais como se o piloto automático desse uma travada e ele ficasse olhando pro painel sem saber o que fez isso. Eu consigo entender isso. Você vai fazendo o que faz, e de repente começa a se perguntar se é realmente isso que quer, se foi sempre isso.","m2_cal_signals":{"localizacao":"interna","custo":"moderado","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"50","duas_palavras":"resultado necessário","situacao_oposta":"Quando busco algo, geralmente tem um problema concreto por trás, ou alguém me indicou algo útil. Quando não tem finalidade clara, fico meio sem ancoragem. A busca perde direção quando não consigo dizer 'busquei isso e mudou aquilo.' Se não tem output visível, começo a questionar se vale o tempo."},"M3_2_escolha":{"opcao":"B","abre_mao":"Acho que A faz mais sentido no início, mas na prática eu sempre fico em B. Fico com a sensação de que ficar só internalizando sem fazer nada é perda de tempo — ou que vira ruminação. Com a promoção foi assim. Tinha uma dúvida interna, mas o cargo apareceu e eu estruturei logo. Tomei a decisão, avancei. Agora às vezes me pergunto se deveria ter ficado mais tempo no A antes."},"M3_3_inventario":{"narrativa":"Há uns quatro anos fiz um curso de gestão de pessoas sem nenhuma obrigação. Não era exigência do trabalho. O que me atraiu foi entender como o estilo de comunicação afeta o que as pessoas conseguem fazer — me incomodava não saber ler isso melhor. Aprendi bastante sobre dar feedback, lidar com conflito. Uso até hoje.","o_que_ja_sabe":"Quando apareço em algo novo, o que já sei funciona principalmente como filtro. Mapeio onde encaixa, o que confirma, o que contradiz. Ajuda a não começar do zero. Mas filtro mais do que deveria às vezes — não sei se é defesa ou eficiência.","cobertura_L1_3":"O suficiente para mim é quando o resultado bata com o que foi combinado. Se entregou o que foi pedido, está bom. A régua é externa — reconheço isso."}},"m4_resposta":{"percepcao":"Honestamente não sei muito bem o que estou buscando. Tem alguma coisa que não encaixa no lugar, mas não consigo nomear. O que sei sobre mim ajuda a manter o rumo — sei que sou bom em gestão, sei como opero. Mas talvez esteja bloqueando também. Não sei se o próximo passo é continuar fazendo isso ou descobrir o que mais há.","conhecimento_em_campo":"Hoje estou meio disperso. Geralmente sou mais presente com as pessoas. Quando tem muita coisa na cabeça, fico mais mecânico."}},{"persona":"P3-M","pill":"PVI","m1_tempo_segundos":5,"m2_resposta":"Ela tá num momento em que o resultado externo não tá batendo com o interno. Tudo foi bem na reunião, mas isso não resolveu nada por dentro. Eu reconheço isso — às vezes a entrega sai certa e você fica se perguntando se era isso que queria entregar.","m2_cal_signals":{"localizacao":"interna","custo":"moderado","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"70","duas_palavras":"manter entrega","situacao_oposta":"Para de verdade só quando não tem escolha — recesso, intervalo entre demandas. E quando para, a primeira coisa que aparece são as perguntas que eu segurei enquanto estava em movimento. Não é descanso imediato."},"M3_2_escolha":{"opcao":"A","abre_mao":"Olhando de fora, B faz mais sentido — mas na prática eu faria A também, igual a ela. Quando estou no meio de uma construção, parar parece um risco maior do que o desgaste. A equipe precisa de consistência. Já aconteceu de continuar quando deveria ter recalibrado. Na gestão atual, tem momentos que sinto que estou mais gerenciando o processo do que realmente liderando — mas segurei o ritmo porque os resultados estavam saindo. Não sei se foi certo."},"M3_3_inventario":{"narrativa":"O que estou construindo agora é a gerência. Não tem prazo — é um jeito de funcionar num papel diferente. O custo foi maior do que esperava, principalmente nas relações. Calibrar o quanto intervir, o quanto soltar — isso foi muito mais exigente do que esperava.","o_que_manteve":"O que me manteve foi a equipe respondendo. Quando via resultado coletivo, entendia que estava indo na direção certa. A validação vem de fora — reconheço isso.","cobertura_L1_4":"Mudou sim. Antes eu resolvia direto — era mais rápido. Aprendi a segurar o instinto e dar espaço pra equipe chegar lá. Ainda não é automático, mas já consigo fazer isso mais.","cobertura_L1_3":"Bom o suficiente: quando o que foi combinado foi entregue e a equipe conseguiu avançar sem minha intervenção naquele pedaço. A régua é externa."}},"m4_resposta":{"percepcao":"Estou construindo um jeito de ser gerente que faça sentido pra mim — não só cumprir o que o cargo pede. Ainda não sei se estou conseguindo. O que não esperava foi o quanto isso é sobre relação, não sobre processo.","presenca_para_outros":"Quando tenho clareza do que quero ajudar a acontecer, consigo estar presente de verdade com a equipe. Quando estou inseguro sobre o próprio papel, fico mais mecânico — faço o que precisa ser feito mas não estou totalmente lá."}},{"persona":"P7-A","pill":"PI","m1_tempo_segundos":12,"m2_resposta":"Renata está vivendo uma variante específica de um fenômeno que conheço bem: a antecipação performática do pertencimento. O riso que ela identifica como falso não é falsidade no sentido moral — é uma operação adaptativa que aprendemos antes de termos palavras para ela. Fazemos o gesto de pertencer antes que o pertencimento exista, como se a performance pudesse convocar a realidade. O que me chama atenção é que ela identificou o riso. Isso é significativo — não dissociação, mas percepção da própria dissociação, que é outra coisa. A pergunta que o momento dela levanta não é 'será que pertenço?' — é 'o que é meu e o que estou emprestando desse grupo para parecer que sou daqui?' Essa pergunta costuma demorar para chegar. Que chegou num jantar é bom sinal.","m2_cal_signals":{"localizacao":"relacional","custo":"identitário","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"7","duas_palavras":"ancoragem prévia","situacao_oposta":"Quando percebo que 'sustentar quem sou' está servindo mais à minha necessidade de coerência do que ao que a situação exige. Há momentos em que a integridade é um gesto narcísico bem disfarçado. Nesses casos, me ajusto — não como capitulação, mas como leitura. A diferença está no que me move: minha imagem ou o campo."},"M3_2_escolha":{"opcao":"B","abre_mao":"Abro mão do conforto de permanecer fora do campo. Falar diretamente é entrar — e entrar altera o campo, inclusive para mim. Também abro mão da possibilidade de que a pessoa chegue sozinha à mesma percepção, o que provavelmente teria sido mais sustentável para ela. Há uma presunção embutida em escolher B que me incomoda mesmo escolhendo: que minha visão do que é errado tem peso suficiente para justificar a interrupção da trajetória do outro. Não tenho certeza de que tem. Mas o custo de ficar fora — saber e não dizer — é maior para mim do que o custo da intervenção imperfeita."},"M3_3_inventario":{"narrativa":"Em 2001, meu pai adoeceu gravemente enquanto eu estava num período de ruptura epistemológica com meu próprio referencial analítico. Não era uma crise pessoal no sentido dramático — era algo mais estrutural: as categorias que eu usava para entender pessoas haviam parado de funcionar para mim mesma. Eu sabia muito e nenhum desse saber me organizava. Continuei atendendo durante todo aquele período. Percebi anos depois — numa sessão, quando uma paciente que acompanho há muito tempo mencionou 'aquele período' como o mais significativo de todo o processo — que algo havia funcionado precisamente porque eu estava menos ocupada sendo analista e mais disponível como presença. Não entrei nos detalhes com ela. Mas reconheci imediatamente o que ela estava descrevendo. A incompletude não bloqueou. Criou espaço.","condicao":"Paradoxalmente: não saber quem eu era ali. Quando não tenho papel consolidado a defender, tenho menos de mim entre mim e o outro. A presença fica mais direta. Não é que eu seja melhor sem chão — é que sem chão eu deixo de ocupar o espaço de uma forma que às vezes interfere.","cobertura_L1_3":"Durante muito tempo, tinha critérios técnicos — fiz as intervenções corretas, o paciente respondeu dentro do esperado. Esses critérios foram ficando mais inúteis à medida que a clínica ficou mais rica. O que os substituiu foi algo mais parecido com: a sessão produziu uma pergunta diferente para o paciente — não uma resposta, uma pergunta melhor. Se isso aconteceu, foi suficiente. Se não aconteceu, foi útil de outra forma ou não foi. Mas o 'foi suficientemente bom' deixou de ser sobre minha performance."}},"m4_resposta":{"percepcao":"Percebi que minha relação com o não-pertencimento ficou menos custosa do que era — não porque importa menos, mas porque o custo de pertencer sem ser ficou maior do que o custo de não pertencer. Há uma hierarquia de intolerâncias que se consolidou em mim e ela apareceu com bastante clareza aqui. Também percebi que respondo essa Pill com acesso retroativo — não estou atravessando nada agora. Estou lembrando como era quando o chão ainda se movia. Isso dá menos urgência às respostas e talvez mais precisão. Não sei se é melhor."}},{"persona":"P7-A","pill":"PII","m1_tempo_segundos":15,"m2_resposta":"Tomás está no início de uma dissolução — não do papel, mas do contrato interno que o sustentava nele. Há um momento em que a motivação que mantinha a coisa funcionando se esgota silenciosamente, e o comportamento continua por inércia competente. A pessoa continua fazendo exatamente o que fazia — e o resultado externo não muda. O que muda é que a ação já não é alimentada pelo mesmo interior. O domingo à noite é o barômetro: é quando o papel não está presente para preencher, e o silêncio que aparece é o espaço onde o sentido costumava estar. O que me toca na cena do colega mais novo é isso: Tomás respondeu de imediato — o que significa que a resposta estava disponível, era fluente, convicente. E era falsa. Não no sentido de mentira — no sentido de que não era mais verdadeira para ele. Esse é o momento diagnóstico. O piloto automático sabe o script. A pessoa ainda não sabe que o perdeu.","m2_cal_signals":{"localizacao":"interno","custo":"existencial","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"8","duas_palavras":"reconhecimento tardio","situacao_oposta":"Quando percebo que o que ainda é verdadeiro para mim é também uma forma sofisticada de evitar uma ruptura necessária. Há momentos em que 'tenho convicção' e 'estou com medo de parar' ocupam exatamente o mesmo espaço. Distingui-los levou anos. Ainda erra às vezes."},"M3_2_escolha":{"opcao":"B","abre_mao":"Pago eu — e pago antes. A decisão de falar produz um desconforto imediato: desestabilizo um sistema que, do ponto de vista externo, estava funcionando. Os pacientes que me acompanham pagam a incerteza do processo de transição. A instituição onde ainda atendo paga o ajuste de expectativas. Mas o que me move para B não é heroísmo — é que manter o silêncio produziria, ao longo do tempo, um custo distribuído e invisível que seria maior: presença sem integridade tem efeito, e o efeito não é neutro. Quem estaria pagando sem saber. Esse cálculo é o que me empurra para B — não coragem, mas uma leitura de onde o custo vai parar."},"M3_3_inventario":{"narrativa":"No fim dos meus quarenta, houve um período de cerca de dois anos em que continuei atendendo com plena agenda enquanto atravessava o que só nomeei depois como uma revisão clínica profunda — não uma crise pessoal, mas uma transformação do referencial que organizava o trabalho. As categorias que usava para entender o que acontecia nas sessões começaram a parecer insuficientes. Continuei. Não porque tinha certeza de que estava entregando bem — não tinha. Continuei porque parar teria sido abandonar o processo antes do ponto de inflexão. E havia algo em mim que reconhecia que a qualidade do que estava vivendo era dado clínico — não ruído a ser eliminado.","condicao":"A confiança de que o que estava sendo atravessado era produtivo, mesmo quando não parecia. Não fé cega — era uma leitura de padrão acumulado: já havia atravessado transformações semelhantes, o que ficava depois sempre tinha mais textura do que o que havia antes. E uma noção, nem sempre confortável, de que a dissonância interna era dado — que minhas sessões daquele período tinham algo que sessões mais confortáveis não tinham.","cobertura_L1_4":"Sim — mudou onde coloco o critério de suficiência. Antes, o critério era competência técnica verificável. Depois daquele período, o critério ficou mais parecido com integridade de processo: estou presente para o que está acontecendo de verdade ou estou gerenciando minha própria imagem do que está acontecendo? Essa pergunta passou a ser o organizador. Não substituiu a competência — ficou sobre ela.","cobertura_L1_3":"A ausência de desonestidade estrutural. Não perfeição — esse critério eu abandonei cedo. O que não consigo aceitar é entregar algo sabendo que estou evitando o que a situação realmente pede. Suficientemente bom é quando o que entrego é o máximo que o que sou agora consegue oferecer com integridade — não o máximo que conseguia antes. Esse recalibra com o tempo. O que não recalibra é o piso da desonestidade."}},"m4_resposta":{"percepcao":"Percebi que estou mais em paz com a descontinuidade do que estava. Respondo PII com muito mais acesso retroativo do que fricção presente — essa Pill toca em território que já não está ativo da mesma forma. O que isso revela sobre mim agora: talvez a questão atual não seja mais sobre o que sustento, mas sobre o que estou disposta a não sustentar mais. Que é uma pergunta diferente. Ainda estou mapeando onde ela mora."}},{"persona":"P7-A","pill":"PIII","m1_tempo_segundos":14,"m2_resposta":"Acho que Clara viu que já havia tomado a decisão muito antes de formalizá-la — e que passou dois anos administrando a dissonância entre o que percebia e o que continuava fazendo. A reunião foi o momento em que o conflito ficou insuportável, mas ela o registrou como 'algo mudou no ambiente', não como 'algo mudou em mim'. A distância é o que permitiu inverter a figura e o fundo: o que ela via como evento externo era, de fato, um ato próprio não reconhecido. Provavelmente sentiu, além de clareza, uma dose considerável de vergonha retrospectiva — não pela decisão em si, mas pelo tempo que levou para se autorizar a vê-la.","m2_cal_signals":{"localizacao":"interno","custo":"existencial","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"3","duas_palavras":"vigilância adiada","situacao_oposta":"Quando a pessoa ainda está presente. A distância que a ausência cria é mais limpa do que a que eu tenho que construir deliberadamente enquanto o vínculo ainda existe. Com filhos, com supervisandos longos — a clareza cede porque a minha necessidade de que a relação funcione contamina o que consigo ver."},"M3_2_escolha":{"opcao":"A","abre_mao":"Diz que aprendi, ao longo de anos de análise, que o não-dito não desaparece — ele apenas muda de forma. O que não é nomeado entre duas pessoas continua operando como se fosse nomeado, só que sem supervisão. Então não é virtude — é funcionamento. Dizer o que vi de mim mesmo é menos sobre honestidade com o outro e mais sobre não deixar o reconhecimento virar mais um peso silencioso que carrego. Mas reconheço, também, que tenho facilidade com isso em relações onde sou eu a profissional. Em relações simétricas, o mesmo movimento me custa muito mais. Não sei ao certo se escolheria A com a mesma rapidez se a pessoa em questão fosse alguém de quem preciso — não alguém que precisou de mim."},"M3_3_inventario":{"narrativa":"Uma supervisão que conduzi por quase quatro anos, encerrada há dois. A supervisandos tinha um padrão de apresentar casos onde ela era invariavelmente lúcida e os pacientes invariavelmente resistentes. Eu via o padrão mas não nomeava. Dizendo para mim mesma que ela estava 'no processo', que ia chegar. Só com o encerramento — e ela indo para outra supervisora — percebi que eu tinha protegido a aliança de trabalho às custas da função. Tinha funcionado como um espelho que não devolvia o que deveria.","condicao":"Passei a nomear padrões antes de achar que o momento está maduro. O custo de nomear cedo é menor que o custo de não nomear tarde. Isso mudou o tempo que espero antes de dizer o que vejo — não o conteúdo, mas a tolerância ao desconforto antecipado de nomear.","cobertura_L2_2":"Quero entender o que em mim precisava da aliança intacta a esse ponto — qual era a minha necessidade de que aquela relação de trabalho fosse bem. Não o que aconteceu com ela. O que aconteceu comigo para que eu deixasse isso ir tão longe.","cobertura_L1_3":"Pela orientação dos meus referenciais técnicos. Mas essa pergunta me constrange agora — porque reconheço que numa parte daquela supervisão o 'suficientemente bom' estava calibrado pelo meu conforto, não pelo que a situação requeria."}},"m4_resposta":{"percepcao":"Estou analítica. Mais do que emocional. Estou olhando para esse material como se fosse de uma outra pessoa — inclusive quando sei, ao mesmo tempo, que é inteiramente meu. Isso diz, provavelmente, que a minha forma de presença para os outros é frequentemente organizada — e que essa organização tem um custo que os outros sentem antes de eu sentir. Estou presente, mas com algum atraso afetivo. Chego depois."}},{"persona":"P7-A","pill":"PIV","m1_tempo_segundos":11,"m2_resposta":"Marina já decidiu. O que os vinte minutos representam não é deliberação — é a tentativa de encontrar uma forma de agir que não a coloque sozinha nessa posição. Ela sabe que vai assumir, e sabe que os irmãos vão deixar. A hesitação é sobre como lidar com o ressentimento que isso vai gerar — não com a mãe, mas com os irmãos. Há uma assimetria real de responsabilidade prestes a se tornar permanente, e Marina está tentando evitar que a escolha certa a isole da família que ainda tem.","m2_cal_signals":{"localizacao":"relacional","custo":"relacional","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"3","duas_palavras":"custo calculado","situacao_oposta":"Quando a urgência não permite o ciclo interno. Emergências clínicas — um paciente em crise no meio de uma sessão. Nessas situações vou direto para fora, para o que acontece se eu agir, sem passar pelo que sinto. Depois processo. Mas eu escolho quando é urgência real e quando declaro urgência para me autorizar a pular o que é desconfortável processar."},"M3_2_escolha":{"opcao":"C","abre_mao":"Abro mão da clareza da posição. Se ajo pela terceira saída, a pessoa nunca vai saber com exatidão o que eu penso sobre o que ela fez. Isso tem um custo que reconheço: a relação fica assimetricamente honesta — eu sei mais sobre ela do que ela sabe sobre mim. Abro mão também da possibilidade de que o confronto direto mude algo. Mas escolho C porque sei que B, nessa situação, é meu comportamento de consultório disfarçado de coragem. Em relações onde não tenho papel de autoridade nem de cuidado, o confronto direto tende a ser minha necessidade de organizar o campo — não uma oferta ao outro."},"M3_3_inventario":{"narrativa":"Encerrei uma supervisão grupal que conduzia há seis anos. O grupo estava funcionando — não havia conflito aberto, as pessoas compareciam, o trabalho era tecnicamente adequado. Mas havia parado de crescer, e eu havia parado de crescer nele. Anunciei o encerramento com seis meses de antecedência. A maior parte do grupo ficou surpresa. Alguns ficaram com raiva. Levei tempo para nomear internamente que o problema não era o grupo — era que eu estava usando o grupo como estrutura de continuidade quando precisava de outra coisa.","condicao":"Perceber que continuar seria desonesto — não no sentido óbvio de fingir que estava bem, mas no sentido de oferecer presença que não tinha mais a qualidade que o trabalho exigia. Quando o critério de suficiência deixou de ser 'está funcionando' e passou a ser 'estou oferecendo o que esse contexto merece', a decisão ficou clara. Custosa — mas clara.","cobertura_L1_3":"Naquela supervisão, por um longo período soube que não era — e continuei. O critério havia migrado de 'suficientemente bom para eles' para 'suficientemente seguro para a aliança'. São critérios que às vezes coincidem e às vezes não. Reconhecê-los como diferentes é o que mudou no meu modo de operar."}},"m4_resposta":{"percepcao":"Estou mais presente aqui do que esperava. Menos analítica que em PIII — noto que M3.2 me desconfortou de um jeito que M3.3 não conseguiu evitar. A supervisão grupal foi difícil de descrever sem sentir o custo de novo. Isso diz algo sobre como estou presente: estou disponível quando o material é do passado com distância suficiente. Quando o material tem custo ainda ativo — como C em M3.2 — minha presença fica mais gerenciada. Organizo o que ofereço. Não sei se o outro percebe, mas eu percebo."}},{"persona":"P7-A","pill":"PV","m1_tempo_segundos":12,"m2_resposta":"Miguel está atravessando aquilo que alguns chamariam de liminar — está na soleira de algo sem saber ainda o que é esse algo. A atenção espontânea que descreve é a forma como o psiquismo sinaliza que um projeto de si está se esgotando antes que outro se constitua. Ele não está buscando nada específico — está se preparando para reconhecer algo que ainda não tem forma. A incapacidade de responder à pergunta não é vacuidade — é honestidade com o estado real.","m2_cal_signals":{"localizacao":"sistêmico","custo":"existencial","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"9","duas_palavras":"inquietação produtiva","situacao_oposta":"Perco direção quando o que busco começa a servir para confirmar o que já sei. Nesse ponto, a busca vira fechamento em vez de abertura — percebo pelo tom com que começo a ler: já sei o que vou encontrar antes de abrir o texto."},"M3_2_escolha":{"opcao":"D","abre_mao":"O que me interessa é a zona de transição entre o que sei e o que não sei — onde o conhecimento começa a mostrar seus limites e algo novo se torna necessário. Essa zona não é aprofundar o que conheço nem começar do zero — é o terceiro espaço onde as duas se tocam e se perturbam mutuamente. É onde a clínica sempre foi mais viva para mim: quando o que sabia se tornava insuficiente e eu precisava deixar que o paciente me ensinasse algo que a teoria não tinha nome para."},"M3_3_inventario":{"narrativa":"Há alguns anos, depois de encerrar um atendimento longo de um adolescente muito perturbado, me peguei relendo Bion — não porque fosse necessário para nenhum atendimento específico, mas porque aquele caso tinha aberto uma fresta que eu não conseguia fechar. Fui buscar o Bion para tentar nomear o que tinha acontecido. Encontrei mais do que isso — encontrei que a fresta era o dado, não o problema.","condicao":"Me levou a incapacidade de fechar o que tinha experimentado. O que fiz com o que encontrei foi mais lento do que geralmente é: deixei que perturbasse minha forma de supervisionar por uns seis meses antes de verbalizar qualquer coisa.","cobertura_L4_3":"Depende. Quando compartilho de dentro — quando ainda estou em contato com a incerteza do que encontrei — as pessoas ao redor começam a tolerar não-saber de um jeito diferente. O que muda não é que entendem o conteúdo, é que ficam autorizadas a não entender. Quando compartilho de fora — quando já fechei — não muda nada de interessante.","cobertura_L1_3":"Não há um ponto. Há uma mudança de temperatura — quando a busca começa a me perturbar menos e me confirmar mais. Esse é o sinal de que o ciclo está se fechando, não de que encontrei o que procurava."}},"m4_resposta":{"percepcao":"Percebi que cheguei aqui com mais convicção do que é saudável para o tipo de experiência que isso propõe. Fiz várias das respostas de dentro do que já sei — a história do Bion é real, mas escolhi uma história com resolução. Existe uma versão desta resposta onde eu escolho o que ainda não tem nome, e essa versão seria mais verdadeira."}},{"persona":"P7-A","pill":"PVI","m1_tempo_segundos":17,"m2_resposta":"Sofia está experimentando o que acontece quando o construtor e a construção se tornam indistinguíveis. Aquele estado no carro — 'algo entre cansaço e alívio' — é o momento em que o self que construía e o objeto construído precisam se reconhecer como separados, e nenhum dos dois quer essa separação. O movimento não para porque parar exigiria que ela soubesse quem é sem o projeto avançando. Isso não é burnout — é o custo estrutural de ter posto identidade na criação.","m2_cal_signals":{"localizacao":"sistêmico","custo":"existencial","foco":null,"horizonte":null},"m3_respostas":{"M3_1_regua":{"posicao":"7","duas_palavras":"fusão perigosa","situacao_oposta":"Paro quando o corpo decide por mim — gripe, exaustão, compromisso impossível de cancelar. Quando paro voluntariamente, há uma vertigem breve: o que estava construindo continua existindo sem mim por algumas horas e isso é simultaneamente alívio e perda de chão. Não tenho uma prática de parar — tenho episódios de parada forçada que uso retroativamente como descanso."},"M3_2_escolha":{"opcao":"D","abre_mao":"Antes de decidir, preciso entender o que exatamente está em risco em cada caminho. O grupo entra num estado de suspensão que tem custo próprio — as duas fações ficam em tensão crescente enquanto aguardam, e quem queria acelerar começa a acelerar de qualquer forma pelas bordas, sem decisão formal. O tempo de análise não é neutro: ele redistribui poder dentro do grupo antes que qualquer decisão seja tomada. Isso significa que ao escolher D estou decidindo que o custo do tempo vale mais do que o custo de uma decisão prematura — e preciso fazer isso de forma consciente, não como evitação."},"M3_3_inventario":{"narrativa":"Há três anos comecei um grupo de supervisão clínica sem vinculação institucional — apenas colegas que eu escolhi, sem hierarquia estabelecida, sem currículo definido. A construção foi mais exigente do que imaginei: sem estrutura prévia, a estrutura precisava emergir do próprio processo, o que significava que o grupo ficava desorientado nas primeiras sessões de cada ciclo. Eu também ficava. O custo foi suportar a própria desorientação enquanto mantinha alguma função de ancoragem para os outros.","condicao":"Me manteve a convicção de que o que estávamos fazendo não existia em nenhum outro lugar que eu conhecesse. Não era uma forma validada de supervisão — era uma aposta de que supervisão poderia ser outra coisa. Quando o grupo funcionava, tinha uma qualidade que eu não via em estruturas mais formais.","cobertura_L1_4":"Sim — aprendi que desorientação inicial não é sinal de problema estrutural, é fase necessária da emergência. Levo isso agora para sessões individuais: quando um atendimento parece estar 'em nenhum lugar' nas primeiras sessões, espero mais antes de tentar organizar. Antes disso, tentava organizar mais cedo.","cobertura_L1_3":"Quando o que criei já exige algo diferente de mim para existir — quando começa a me organizar em vez de eu o organizar. Esse é o sinal de que tem estrutura própria. Antes disso, ainda sou eu que sustento."}},"m4_resposta":{"percepcao":"Percebi que respondi tudo como quem tem algo construído para mostrar. O grupo de supervisão é real, mas escolhi a versão dele onde eu já entendi o que estava fazendo. Existe uma versão dessa história onde o custo ainda está ativo — onde ainda não sei se a aposta valeu — e eu não fui a esse lugar. Fui ao arquivo em vez de ao canteiro."}}];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CANONICALS: Record<string, any> = {"PI":{"status":"APROVADA","prompt_version":"v0.7.4","linhas":["L1.1","L2.1","L3.1","L3.2","L4.4"],"canonicals":{"P2-B":{"L1.1":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L2.1":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L3.1":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L3.2":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L4.4":{"numerico":2.0,"faixa":"A","gcc":"alto"}},"P3-M":{"L1.1":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L2.1":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L3.1":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L3.2":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L4.4":{"numerico":null,"faixa":"B","status_sinal":"incompleto"}},"P7-A":{"L1.1":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L2.1":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L3.1":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L3.2":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L4.4":{"numerico":6.5,"faixa":"C","gcc":"medio"}}}},"PII":{"status":"APROVADA","prompt_version":"v0.2","linhas":["L1.2","L1.3","L1.4","L2.1","L2.3","L3.4"],"canonicals":{"P2-B":{"L1.2":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L1.3":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L1.4":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L2.1":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L2.3":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L3.4":{"numerico":2.0,"faixa":"A","gcc":"alto"}},"P3-M":{"L1.2":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L1.3":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L1.4":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L2.1":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L2.3":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L3.4":{"numerico":4.5,"faixa":"B","gcc":"medio"}},"P7-A":{"L1.2":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L1.3":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L1.4":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L2.1":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L2.3":{"numerico":5.5,"faixa":"C","gcc":"medio"},"L3.4":{"numerico":6.5,"faixa":"C","gcc":"medio"}}}},"PIII":{"status":"APROVADA","prompt_version":"v0.18","linhas":["L1.4","L2.1","L2.2","L3.4","L4.2"],"canonicals":{"P2-B":{"L1.4":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L2.1":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L2.2":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L3.4":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L4.2":{"numerico":2.0,"faixa":"A","gcc":"alto"}},"P3-M":{"L1.4":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L2.1":{"numerico":5.5,"faixa":"B","gcc":"medio"},"L2.2":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L3.4":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L4.2":{"numerico":3.5,"faixa":"B","gcc":"medio"}},"P7-A":{"L1.4":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L2.1":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L2.2":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L3.4":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L4.2":{"numerico":6.5,"faixa":"C","gcc":"medio"}}}},"PIV":{"status":"APROVADA","prompt_version":"v0.2","linhas":["L1.1","L3.2","L3.3","L3.4","L4.1","L4.2"],"linhas_note":"L3.3 is threshold anchor","canonicals":{"P2-B":{"L1.1":{"numerico":3.5,"faixa":"B","gcc":"alto"},"L3.2":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L3.3":{"numerico":null,"faixa":"A","threshold_status":"nao_atingido"},"L3.4":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L4.1":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L4.2":{"numerico":2.0,"faixa":"A","gcc":"alto"}},"P3-M":{"L1.1":{"numerico":5.5,"faixa":"B","gcc":"medio"},"L3.2":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L3.3":{"numerico":5.5,"faixa":"B","gcc":"medio"},"L3.4":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L4.1":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L4.2":{"numerico":4.5,"faixa":"B","gcc":"medio"}},"P7-A":{"L1.1":{"numerico":5.5,"faixa":"C","gcc":"medio"},"L3.2":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L3.3":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L3.4":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L4.1":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L4.2":{"numerico":6.5,"faixa":"C","gcc":"medio"}}}},"PV":{"status":"APROVADA","prompt_version":"v0.1","linhas":["L1.1","L2.2","L4.1","L4.2","L4.3"],"linhas_note":"L4.3 is threshold anchor","canonicals":{"P2-B":{"L1.1":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L2.2":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L4.1":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L4.2":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L4.3":{"numerico":null,"faixa":"A","threshold_status":"nao_atingido"}},"P3-M":{"L1.1":{"numerico":5.5,"faixa":"B","gcc":"medio"},"L2.2":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L4.1":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L4.2":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L4.3":{"numerico":null,"faixa":"B","threshold_status":"nao_atingido"}},"P7-A":{"L1.1":{"numerico":7.5,"faixa":"D","gcc":"alto"},"L2.2":{"numerico":5.5,"faixa":"C","gcc":"medio"},"L4.1":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L4.2":{"numerico":6.5,"faixa":"C","gcc":"medio"},"L4.3":{"numerico":7.5,"faixa":"D","gcc":"alto"}}}},"PVI":{"status":"APROVADA","prompt_version":"v0.3","linhas":["L1.2","L1.3","L1.4","L2.3","L3.1","L4.1","L4.2"],"canonicals":{"P2-B":{"L1.2":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L1.3":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L1.4":{"numerico":3.5,"faixa":"B","gcc":"alto"},"L2.3":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L3.1":{"numerico":3.5,"faixa":"B","gcc":"alto"},"L4.1":{"numerico":2.0,"faixa":"A","gcc":"alto"},"L4.2":{"numerico":2.0,"faixa":"A","gcc":"alto"}},"P3-M":{"L1.2":{"numerico":3.5,"faixa":"B","gcc":"alto"},"L1.3":{"numerico":4.5,"faixa":"B","gcc":"alto"},"L1.4":{"numerico":3.5,"faixa":"B","gcc":"medio"},"L2.3":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L3.1":{"numerico":4.5,"faixa":"B","gcc":"medio"},"L4.1":{"numerico":4.5,"faixa":"B","gcc":"alto"},"L4.2":{"numerico":4.5,"faixa":"B","gcc":"alto"}},"P7-A":{"L1.2":{"numerico":6.5,"faixa":"C","gcc":"alto"},"L1.3":{"numerico":5.5,"faixa":"C","gcc":"alto"},"L1.4":{"numerico":6.5,"faixa":"C","gcc":"alto"},"L2.3":{"numerico":4.5,"faixa":"B","gcc":"alto"},"L3.1":{"numerico":6.5,"faixa":"C","gcc":"alto"},"L4.1":{"numerico":6.5,"faixa":"C","gcc":"alto"},"L4.2":{"numerico":6.5,"faixa":"C","gcc":"alto"}}}},"extraction_timestamp":"2026-03-30","extraction_notes":{"PI":"5 linhas, P3-M L4.4 is null (threshold not met, status_sinal incompleto per SCORING_SPEC v1.3 §9)","PII":"6 linhas, no nulls, P7-A L2.3 is 5.5 (lower than 6.5 due to weaker FD evidence)","PIII":"5 linhas, no nulls, all P7-A are C (no D tier)","PIV":"6 linhas, L3.3 is threshold anchor (null for P2-B per v0.2), corrected canônicos from verified corpora","PV":"5 linhas, L4.3 is threshold anchor (null for P2-B and P3-M), INÉDITO: first pill to approve in v0.1 with P7-A reaching Faixa D","PVI":"7 linhas (most dense), no nulls, no D reached (guarda prevented), 3 iterations due to volume of GCC calibration"}};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function compareIL(
  scoredLinhas: Record<string, unknown>,
  personaCanon: Record<string, { numerico: number | null; faixa: string }>,
  persona: string,
  pill: string,
) {
  const results = [];
  for (const [linhaId, canon] of Object.entries(personaCanon)) {
    const canonNum   = canon.numerico;
    const canonFaixa = canon.faixa;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linhaData   = (scoredLinhas[linhaId] ?? {}) as any;
    // v2.1 — Fallback: check IL_sinal first, then direct fields on the line
    const ilSinal     = linhaData?.IL_sinal ?? {};
    const scoredNum   = ilSinal?.numerico   ?? linhaData?.numerico   ?? null;
    const scoredFaixa = ilSinal?.faixa      ?? linhaData?.faixa      ?? null;

    let ilMatch: boolean;
    if (canonNum === null)       ilMatch = (scoredNum === null);
    else if (scoredNum === null) ilMatch = false;
    else                         ilMatch = Math.abs(scoredNum - canonNum) <= IL_TOLERANCE;

    const faixaMatch = (scoredFaixa === canonFaixa);
    const deltaIl    = (canonNum !== null && scoredNum !== null)
      ? Math.round(Math.abs(scoredNum - canonNum) * 100) / 100
      : null;

    results.push({ persona, pill, linha: linhaId,
      canon_num: canonNum, canon_faixa: canonFaixa,
      scored_num: scoredNum, scored_faixa: scoredFaixa,
      il_match: ilMatch, faixa_match: faixaMatch, delta_il: deltaIl });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARK RUNNER (executa em background)
// ─────────────────────────────────────────────────────────────────────────────

async function runBenchmark(
  jobId: string,
  pillsFilter: string[] | null,
  personasFilter: string[] | null,
  doCleanup: boolean,
) {
  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // ── Filtrar corpus ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let corpus = CORPUS as any[];
    if (pillsFilter)    corpus = corpus.filter((c) => pillsFilter!.includes(c.pill));
    if (personasFilter) corpus = corpus.filter((c) => personasFilter!.includes(c.persona));

    const personas = [...new Set(corpus.map((c) => c.persona as string))];

    // ── 1. Criar usuário temporário ──
    const email = `benchmark-${crypto.randomUUID().slice(0, 8)}@lucid.internal`;
    const userResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method:  "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password: "benchmark-tmp-1!", email_confirm: true }),
    });
    if (!userResp.ok) {
      throw new Error(`Falha ao criar usuário: ${await userResp.text()}`);
    }
    const userId = (await userResp.json()).id as string;

    const cycleIds: Record<string, string> = {};
    const createdCycleIds: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allResults: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: any[] = [];

    try {
      // ── 2. Criar ipe_cycles por persona ──
      for (const persona of personas) {
        const { data: cycle, error: cycleErr } = await supabase
          .from("ipe_cycles")
          .insert({ user_id: userId, cycle_number: 1, status: "pills",
                    pills_completed: [], prompt_version: `benchmark-${persona}` })
          .select("id").single();
        if (cycleErr || !cycle) {
          throw new Error(`Falha ao criar ciclo para ${persona}: ${cycleErr?.message}`);
        }
        cycleIds[persona] = cycle.id;
        createdCycleIds.push(cycle.id);
      }

      // ── 3. Inserir pill_responses ──
      for (const c of corpus) {
        const { error: prErr } = await supabase.from("pill_responses").insert({
          ipe_cycle_id:      cycleIds[c.persona],
          pill_id:           c.pill,
          m1_tempo_segundos: c.m1_tempo_segundos ?? null,
          m2_resposta:       c.m2_resposta       ?? null,
          m2_cal_signals:    c.m2_cal_signals    ?? null,
          m3_respostas:      c.m3_respostas      ?? null,
          m4_resposta:       c.m4_resposta       ?? null,
          completed_at:      new Date().toISOString(),
        });
        if (prErr) {
          throw new Error(`Falha ao inserir ${c.persona}×${c.pill}: ${prErr.message}`);
        }
      }

      // ── 4. Chamar ipe-scoring para cada caso ──
      for (const c of corpus) {
        const cycleId = cycleIds[c.persona];
        try {
          const scoreResp = await fetch(`${supabaseUrl}/functions/v1/ipe-scoring`, {
            method:  "POST",
            headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body:    JSON.stringify({ ipe_cycle_id: cycleId, pill_id: c.pill }),
          });

          if (!scoreResp.ok) {
            const errText = await scoreResp.text();
            errors.push({ persona: c.persona, pill: c.pill, error: `HTTP ${scoreResp.status}: ${errText.slice(0, 200)}` });
            await sleep(PAUSE_MS);
            continue;
          }

          const result     = await scoreResp.json();
          const linhas     = result.corpus_linhas ?? {};
          const parseOk    = result.parse_success ?? false;

          if (!parseOk) {
            errors.push({ persona: c.persona, pill: c.pill, error: "parse_success=false" });
            await sleep(PAUSE_MS);
            continue;
          }

          // Comparar com canônicos
          const pillCanon    = CANONICALS[c.pill];
          const personaCanon = pillCanon?.canonicals?.[c.persona];

          if (!personaCanon) {
            for (const [linhaId, ld] of Object.entries(linhas)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const il = (ld as any)?.IL_sinal ?? {};
              allResults.push({ persona: c.persona, pill: c.pill, linha: linhaId,
                canon_num: null, canon_faixa: null,
                scored_num: il.numerico ?? null, scored_faixa: il.faixa ?? null,
                il_match: null, faixa_match: null, delta_il: null });
            }
          } else {
            allResults.push(...compareIL(linhas, personaCanon, c.persona, c.pill));
          }
        } catch (e) {
          errors.push({ persona: c.persona, pill: c.pill, error: String(e) });
        }
        await sleep(PAUSE_MS);
      }

    } finally {
      // ── 5. Cleanup ──
      if (doCleanup) {
        for (const cid of createdCycleIds) {
          await supabase.from("ipe_cycles").delete().eq("id", cid);
        }
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method:  "DELETE",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        });
      }
    }

    // ── 6. Métricas ──
    const comparable = allResults.filter((r) => r.il_match !== null);
    const totalLines = comparable.length;
    const ilOk       = comparable.filter((r) => r.il_match).length;
    const faixaOk    = comparable.filter((r) => r.faixa_match).length;

    const pillSummary: Record<string, unknown> = {};
    for (const pill of ["PI","PII","PIII","PIV","PV","PVI"]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = comparable.filter((r: any) => r.pill === pill);
      if (!rows.length) continue;
      pillSummary[pill] = {
        il_ok:    rows.filter((r) => r.il_match).length,
        total:    rows.length,
        il_pct:   Math.round(100 * rows.filter((r) => r.il_match).length / rows.length),
        faixa_ok: rows.filter((r) => r.faixa_match).length,
        faixa_pct: Math.round(100 * rows.filter((r) => r.faixa_match).length / rows.length),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        misses: rows.filter((r: any) => !r.il_match || !r.faixa_match).map((r: any) => ({
          persona: r.persona, linha: r.linha,
          canon: `${r.canon_num} ${r.canon_faixa}`,
          scored: `${r.scored_num} ${r.scored_faixa}`,
          tag: (!r.il_match && !r.faixa_match) ? "IL+Faixa" : !r.il_match ? "IL" : "Faixa",
        })),
      };
    }

    const metrics = {
      il_ok: ilOk, total: totalLines,
      il_pct:    totalLines > 0 ? Math.round(100 * ilOk    / totalLines) : 0,
      faixa_pct: totalLines > 0 ? Math.round(100 * faixaOk / totalLines) : 0,
      il_passa:    ilOk    / Math.max(totalLines, 1) >= 0.80,
      faixa_passa: faixaOk / Math.max(totalLines, 1) >= 0.90,
    };

    const durationMs = Date.now() - startTime;

    // ── 7. Persistir resultado ──
    await supabase.from("benchmark_runs").update({
      status: "completed",
      metrics,
      por_pill: pillSummary,
      detalhes: allResults,
      errors,
      casos_rodados: corpus.length,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

    console.log(`BENCHMARK_COMPLETED job=${jobId} duration=${durationMs}ms il_pct=${metrics.il_pct}%`);

  } catch (err) {
    // Falha geral → marcar job como failed
    const sb2 = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    await sb2.from("benchmark_runs").update({
      status: "failed",
      error_message: String(err),
      duration_ms: Date.now() - startTime,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

    console.error(`BENCHMARK_FAILED job=${jobId}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json().catch(() => ({})) as Record<string, unknown>;
  } catch { /* sem body */ }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ── MODO CONSULTA: job_id presente → retornar status/resultado ──
  if (body.job_id && typeof body.job_id === "string") {
    const { data, error } = await supabase
      .from("benchmark_runs")
      .select("*")
      .eq("id", body.job_id)
      .maybeSingle();

    if (error || !data) {
      return json({ error: "Job não encontrado", job_id: body.job_id }, 404);
    }

    // Se ainda running, retornar status simples
    if (data.status === "running") {
      const elapsed = Date.now() - new Date(data.started_at).getTime();
      return json({
        job_id: data.id,
        status: "running",
        elapsed_ms: elapsed,
        elapsed_human: `${Math.round(elapsed / 1000)}s`,
      });
    }

    // Completed ou failed → retornar tudo
    return json({
      job_id:         data.id,
      status:         data.status,
      timestamp:      data.completed_at,
      casos_rodados:  data.casos_rodados,
      duration_ms:    data.duration_ms,
      cleanup_feito:  data.cleanup,
      metrics:        data.metrics,
      por_pill:       data.por_pill,
      errors:         data.errors,
      detalhes:       data.detalhes,
      error_message:  data.error_message,
    });
  }

  // ── MODO DISPARO: criar job e rodar em background ──
  const pillsFilter    = Array.isArray(body.pills) ? body.pills as string[] : null;
  const personasFilter = Array.isArray(body.personas) ? body.personas as string[] : null;
  const doCleanup      = typeof body.cleanup === "boolean" ? body.cleanup : true;

  // Criar registro do job
  const { data: job, error: jobErr } = await supabase
    .from("benchmark_runs")
    .insert({
      status: "running",
      pills_filter: pillsFilter,
      personas_filter: personasFilter,
      cleanup: doCleanup,
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    return json({ error: "Falha ao criar job", detail: jobErr?.message }, 500);
  }

  const jobId = job.id;

  // Disparar em background usando EdgeRuntime.waitUntil
  // A response é retornada imediatamente, o benchmark continua rodando
  // @ts-ignore — EdgeRuntime é global no Supabase Edge Runtime
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(runBenchmark(jobId, pillsFilter, personasFilter, doCleanup));
  } else {
    // Fallback: rodar sem waitUntil (pode ser cortado pelo timeout)
    runBenchmark(jobId, pillsFilter, personasFilter, doCleanup);
  }

  return json({
    job_id: jobId,
    status: "running",
    message: "Benchmark disparado. Consulte o resultado com POST {\"job_id\": \"" + jobId + "\"}",
  }, 202);
});
