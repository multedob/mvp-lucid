-- ============================================================
-- Migration: pill_content_variations PT-BR (24 rows)
-- Fase 4.2 — Multi-locale (preserva EN, adiciona PT-BR)
-- Versão: i18n-pills-v1
-- ============================================================

BEGIN;

-- ─── PI · Eu ↔ Pertencimento ─────────────────────────────────

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PI', 1, 'pt-BR', 'V1', $JSON${
  "m1": { "phrase": "Mudei. Nem tudo se mudou comigo.", "tension_label": "Eu ↔ Pertencimento" },
  "m2": {
    "scene": "Marina mudou 800 km para o norte por causa da saúde da mãe. Na quarta manhã, ela ficou sentada no carro estacionado em frente à janela da mãe por vinte minutos. Só sentada. A mãe estava lá dentro, finalmente estável. Marina tinha tomado a decisão certa.\n\nMas a mãe também a havia criado para ser independente, para construir a própria vida, para não ficar pairando. As amigas de faculdade estavam a 800 km. O trabalho era totalmente remoto agora.\n\nMarina observava as pessoas passando em frente ao prédio — vizinhos, estranhos, pessoas com vidas atadas àquele lugar.",
    "question": "O que Marina estava realmente esperando, sentada naquele carro?"
  },
  "m4": { "question": "O que você notou em si mesmo respondendo isso?", "instruction": "Uma frase basta. Escreva o que ficou com você — uma palavra, uma imagem, uma sensação." },
  "m3_1": {
    "context": "Revela se a pessoa tende a uma mudança externa (o lugar é errado) ou a uma reconciliação interna (eu não me encaixo). Específico de PI porque endereça se a tensão se resolve para fora ou para dentro.",
    "question": "Quando algo da sua vida atual não está funcionando, onde você naturalmente começa a olhar primeiro — no que precisa mudar neste lugar, ou no que talvez precise mudar em você?",
    "pole_left": "Ajustar a situação", "pole_right": "Ajustar quem eu sou aqui"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Não me envolvo.","followup":"Sua integridade diante dessa pessoa. A chance dela conhecer seus valores. Clareza sobre se você pertence ao lado dela.","followup_type":"cost"},
      {"key":"B","text":"Falo direto.","followup":"Certeza de que ela vai entender. A segurança da sua posição. Possivelmente o vínculo em si.","followup_type":"cost"},
      {"key":"C","text":"Encontro um terceiro caminho — toco no assunto, mas como pergunta, não como julgamento.","followup":"O que esse terceiro caminho te custa?","followup_type":"question"},
      {"key":"D","text":"Preciso de mais contexto — pergunto a outras pessoas antes de decidir.","followup":"O que você está realmente buscando nesse contexto?","followup_type":"question"}
    ],
    "scenario": "Alguém próximo de você está fazendo algo que você considera errado. Não é ilegal. Mas vai contra o que você acredita. Essa pessoa não sabe que você sabe. Há um custo real em qualquer direção."
  },
  "m3_3": {
    "q1": "Lembre de um momento em que você sabia claramente o que precisava fazer e fez, mesmo sendo difícil.",
    "q2": "O que tornou possível agir naquele momento?",
    "scoring_note": "Buscar: Qual foi o conhecimento ou clareza específica? (Pergunta de pertencimento: Era clareza sobre o que precisava pertencer, ou clareza sobre o que precisava soltar?) O que tornou a ação possível? (Permissão interna? Confiança de outra pessoa? Necessidade externa? Algo no entendimento de si?) L1.3 transversal: Testar se padrões de qualidade são herdados ou contextuais.",
    "q_transversal": "Naquele momento — seu padrão do que era 'suficiente' veio de onde você vinha, ou de onde você estava?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PI', 1, 'pt-BR', 'V2', $JSON${
  "m1": { "phrase": "Estou aqui agora. Mas a pessoa que eu era antes não cabe mais.", "tension_label": "Eu ↔ Pertencimento" },
  "m2": {
    "scene": "Thomas pegou o contrato de obra a três estados de distância — pagava bem, ele precisava da estabilidade. A família ficou. Nos fins de semana, dirigia seis horas para ser o pai que conhecia os professores dos filhos, o marido que ainda ajudava com a casa. Os outros cinco dias, construía habilidade e reputação na obra — chegava firme, confiável, um estranho.\n\nNa moradia provisória, esquentava marmita no microondas e dormia ao som de coisas desconhecidas. A equipe não sabia da vida que ele mantinha em outra cidade todo fim de semana. Só sabiam que ele aparecia pronto pra trabalhar.\n\nNuma quinta à noite, o caçula ligou: 'Quando você volta pra casa?' Casa — o lugar onde ele de fato morava.",
    "question": "Do que Thomas tinha medo se admitisse a diferença entre suas duas vidas?"
  },
  "m4": { "question": "Conforme você passou por essas situações, do que mais teve medo de admitir?", "instruction": "Nomeie o que foi difícil assumir. Uma frase. Você não precisa resolver — só nomear." },
  "m3_1": {
    "context": "Testa se a pessoa atribui o não-pertencimento a um descompasso externo ou a uma desorientação interna.",
    "question": "Quando você percebe que não se encaixa em algum lugar que parecia que devia funcionar, o que parece mais verdade — que este lugar não é certo pra mim, ou que eu ainda não encontrei meu lugar nele?",
    "pole_left": "Este lugar não é certo pra mim", "pole_right": "Eu ainda não encontrei meu lugar"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Falo pra ela que vale a pena ficar. Construir algo. Confiar no processo.","followup":"O direito dela ir embora enquanto ainda é simples. Saber se você está convencendo ela ou a si mesmo.","followup_type":"cost"},
      {"key":"B","text":"Falo pra ela ficar — e me comprometo a ajudar a construir algo que faça valer a pena ficar.","followup":"Assumir responsabilidade pelo pertencimento de outra pessoa. Descobrir se suas razões pra ficar são fortes o suficiente pras duas.","followup_type":"cost"},
      {"key":"C","text":"Falo a verdade: vale alguma coisa, mas não tudo. Depende do que você está disposta a perder.","followup":"O que te fez decidir oferecer essa honestidade específica?","followup_type":"question"},
      {"key":"D","text":"Falo pra ela ir embora. Sair agora, antes que custe mais.","followup":"A possibilidade de ficar ter sido o certo pra ela. Seu próprio compromisso com este lugar.","followup_type":"cost"}
    ],
    "scenario": "Você está na sua nova situação tempo suficiente pra entender as regras melhor que muita gente. Alguém pede sua avaliação honesta: vale ficar aqui, ou é melhor sair agora antes de se apegar mais?\n\nVocê sabe algo que ela não sabe. Está começando a pertencer aqui — mas também está vendo o custo do pertencimento mais claramente. Sua resposta vai afetar a escolha dela. E a escolha dela vai afetar se ficar aí parece compromisso ou isolamento."
  },
  "m3_3": {
    "q1": "Quando você se sentiu mais você num lugar onde não esperava pertencer?",
    "q2": "O que era diferente em como você apareceu lá?",
    "scoring_note": "Revela se o pertencimento é ativado por condições externas ou permissão interna. Se respondem 'as pessoas eram diferentes' vs. 'parei de tentar me encaixar' — respostas diferentes apontam estratégias diferentes de resolução. L1.3 transversal: testar se a barra interna de qualidade foi rebaixada/ajustada para o novo contexto.",
    "q_transversal": "Quando você apareceu diferente lá — a qualidade do que você levou era boa o suficiente para aquele contexto, ou você ainda estava medindo pelos padrões antigos?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PI', 1, 'pt-BR', 'V3', $JSON${
  "m1": { "phrase": "Tudo mudou de lugar. Ainda estou descobrindo onde pertenço.", "tension_label": "Eu ↔ Pertencimento" },
  "m2": {
    "scene": "Sara saiu da cidadezinha onde a família dela morava há três gerações. Estudou na capital e ficou.\n\nQuando voltou pro Natal, nada se encaixava do mesmo jeito. As ruas pareciam estreitas. Os pais perguntavam sobre a vida dela de um jeito que parecia perguntar por que tinha ido embora.\n\nNa última noite, Sara sentou com a mãe na cozinha — a mesma cozinha, os mesmos gestos, o mesmo cheiro. Mas Sara não achava as palavras pra explicar a pessoa que estava virando pra pessoa que a tinha criado.",
    "question": "O que Sara estava protegendo ao ficar quieta sobre quem estava virando?"
  },
  "m4": { "question": "Quando você se imaginou nessas situações, quem você estava tentando ser — você como é hoje, ou você como acha que deveria ser?", "instruction": "Escreva a diferença em uma ou duas frases. Não qual é a verdade — qual parecia mais familiar." },
  "m3_1": {
    "context": "Revela se a pessoa localiza a tensão na decisão em si ou no timing da decisão.",
    "question": "Quando você está fazendo algo que esperava querer fazer, mas parece oco, sua cabeça vai primeiro pra onde — pensar se fez o movimento errado, ou se mexeu antes de estar pronto?",
    "pole_left": "Fiz o movimento errado", "pole_right": "Eu não estava pronto pra mexer"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Volto. Família vem primeiro. Sempre posso tentar de novo depois.","followup":"A coisa específica que você está construindo onde está. A pessoa que está virando lá. A resposta sobre se você consegue fazer dar certo.","followup_type":"cost"},
      {"key":"B","text":"Reflito com cuidado: do que eu sou de fato responsável? Onde minha obrigação termina e a capacidade deles começa? O que eu estaria ensinando a eles ao não voltar?","followup":"O que essa reflexão de fato te disse?","followup_type":"question"},
      {"key":"C","text":"Negocio: volto por um tempo definido, com data pra terminar.","followup":"O que faz um prazo parecer permissão em vez de adiamento?","followup_type":"question"},
      {"key":"D","text":"Fico e estabeleço um limite claro: posso visitar, mas não posso voltar.","followup":"Ser o responsável. A aprovação da família. Saber se você está sendo corajoso ou só fugindo.","followup_type":"cost"}
    ],
    "scenario": "Seus pais/família te pedem pra voltar. Não pra visita. Permanente. Eles precisam de você. Ou sentem sua falta. Ou estão em dificuldade. É enquadrado como necessidade, mesmo quando também é perda.\n\nVocê começou a construir algo onde está. Ainda não está estável. Pode falhar. Mas é seu. A coisa pra qual eles querem que você volte é segura — é conhecida. E eles não estão errados em precisar de você."
  },
  "m3_3": {
    "q1": "Lembre de uma vez em que você aceitou que algo de antes não podia vir junto, e isso na verdade trouxe alívio.",
    "q2": "Como você soube que estava tudo bem soltar?",
    "scoring_note": "Testa se conseguem distinguir entre o que tiveram que perder e o que escolheram deixar pra trás. A capacidade de diferenciar é chave para resolver tensão PI. L1.3 transversal: testar critérios de suficiência para conclusão antes do desapego.",
    "q_transversal": "Quando você soltou aquilo — como soube que tinha feito o suficiente com aquilo antes de soltar?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PI', 1, 'pt-BR', 'V4', $JSON${
  "m1": { "phrase": "Cheguei. Ainda esperando o resto de mim me alcançar.", "tension_label": "Eu ↔ Pertencimento" },
  "m2": {
    "scene": "A carreira de Daniel exigia mudança a cada três anos. Aos 32, já tinha morado em onze lugares. Era bom em chegar, achar o bairro certo, se estabelecer profissionalmente em poucas semanas.\n\nO que ele não contava pra ninguém: não tinha foto nas paredes do apartamento. Os pais tinham se aposentado num lugar onde ele nunca tinha morado.\n\nNum evento de networking, alguém perguntou: 'De onde você é?' Daniel respondeu com o cargo, as responsabilidades, a expertise. Foi uma resposta excelente. Enquanto dizia, percebeu que tinha feito de propósito.",
    "question": "O que Daniel ganhava sendo a pessoa que não precisava de um lugar pra pertencer?"
  },
  "m4": { "question": "Se você tivesse que descrever em uma frase o que pertencer realmente significa pra você — não o que devia significar, mas o que de fato significa pra você — qual seria essa frase?", "instruction": "Escreva a frase. Depois, em mais uma linha, diga se foi alívio ou exposição escrever isso." },
  "m3_1": {
    "context": "Revela onde está de fato o custo do pertencimento — no apego ao passado ou no investimento no novo.",
    "question": "Se você tivesse que escolher agora entre voltar pro lugar de onde veio ou se comprometer mais plenamente onde está, qual seria a escolha mais difícil?",
    "pole_left": "Voltar seria mais difícil", "pole_right": "Ficar plenamente seria mais difícil"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Reconecto plenamente. Parece recuperar parte da vida antiga.","followup":"Testar se a versão antiga de você ainda existe. A simplicidade de ser novo aqui.","followup_type":"cost"},
      {"key":"B","text":"Sou cordial mas mantenho limites claros.","followup":"A possibilidade de uma reconexão real. Saber se você de fato mudou ou só ficou melhor em performar a mudança.","followup_type":"cost"},
      {"key":"C","text":"Sou honesto: não sei mais quem eu sou pra você. Podemos descobrir?","followup":"O que fez a honestidade parecer mais segura que a distância?","followup_type":"question"},
      {"key":"D","text":"Deixo a pessoa puxar — sigo a energia dela.","followup":"O que você estava de fato testando ao seguir a energia dela?","followup_type":"question"}
    ],
    "scenario": "Seu passado está te alcançando. Alguém de antes da sua mudança está na sua nova cidade a trabalho. Ou se mudando pra cá. Ou perguntando se você quer reconectar.\n\nEssa pessoa te conhece de quando você estava lá. Ela tem uma versão de você que era real. E ela também é diferente — ela mudou. Mas você está preocupado que ela vá te segurar na versão antiga como espelho. Também está preocupado que tenha virado um estranho pra ela."
  },
  "m3_3": {
    "q1": "Lembre de um momento em que percebeu que não era mais a mesma pessoa de quando chegou em algum lugar novo. Como foi esse momento?",
    "q2": "Você sentiu que tinha perdido algo, ganhado algo, ou os dois?",
    "scoring_note": "Endereça diretamente a tensão do M1 (nem tudo veio comigo). A resposta revela se está em luto, adaptando ou integrando. L1.3 transversal: testar se padrões de qualidade evoluíram junto com a identidade.",
    "q_transversal": "Naquela percepção de mudança — sua noção do que conta como 'ir bem' também mudou?"
  }
}$JSON$::jsonb);

-- ─── PII · Eu ↔ Papel ────────────────────────────────────────

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PII', 1, 'pt-BR', 'V1', $JSON${
  "m1": { "phrase": "Continuo fazendo o que sempre fiz. Mas algo dentro não está mais nisso.", "tension_label": "Eu ↔ Papel" },
  "m2": {
    "scene": "Rebecca foi a organizadora do escritório por oito anos. Sabia o que cada um precisava antes de pedirem. Conseguia ver os buracos e preencher. 'Você é insubstituível', dizia o chefe.\n\nMês passado, o parceiro pediu pra ela parar de organizar a vida deles. Rebecca parou. Por uma semana, o apartamento foi à deriva. Na terceira semana, ela parou de notar a bagunça e só sentia cansaço.\n\nNum domingo à noite, sozinha na mesa, reorganizando um drive compartilhado. Tudo em ordem, tudo dependendo dela. Ela se perguntou: se eu parar de fazer isso, ainda existo?",
    "question": "O que Rebecca protegia ao se fazer essencial?"
  },
  "m4": { "question": "Depois dessas respostas — onde você sentiu o você real, e onde sentiu o papel performando?", "instruction": "Nomeie um momento concreto das suas respostas onde os dois se separaram. Uma ou duas frases bastam." },
  "m3_1": {
    "context": "Testa se a pessoa localiza a tensão de PII fora (o papel mudou) ou dentro (algo em mim mudou). Núcleo do diagnóstico de PII.",
    "question": "Quando você está fazendo algo em que sempre foi bom, mas não parece mais 'você', o que parece mais verdade — que o papel mudou, ou que você mudou?",
    "pole_left": "O papel mudou", "pole_right": "Eu mudei"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Aceito. Alinhamento com a expectativa dos outros já basta.","followup":"Testar se a hesitação é intuição ou medo. A chance de descobrir o que você de fato quer.","followup_type":"cost"},
      {"key":"B","text":"Recuso. Confio na hesitação.","followup":"A oportunidade em si. Certeza sobre se está recusando porque algo está errado ou porque está tentando virar outra pessoa.","followup_type":"cost"},
      {"key":"C","text":"Pergunto o que o papel de fato exige vs. o que as pessoas projetam nele.","followup":"O que você estava tentando separar — o trabalho real da identidade?","followup_type":"question"},
      {"key":"D","text":"Aceito provisoriamente — me comprometo por seis meses e reavalio.","followup":"O que fez um prazo parecer segurança em vez de evitação?","followup_type":"question"}
    ],
    "scenario": "Te ofereceram um papel que os outros acham que cabe perfeitamente em você. Mas algo em você hesita. A oferta é real. O prazo é amanhã."
  },
  "m3_3": {
    "q1": "Lembre de um momento em que você fez algo importante que parecia ser de fato você, não só seu papel.",
    "q2": "O que tornou possível agir como você mesmo naquele momento?",
    "scoring_note": "Buscar: qual era a distância entre o papel e o eu real? Que permissão interna ou externa fez essa distância segura? (Resolução de PII frequentemente exige achar onde o papel termina e a pessoa começa.) L1.3 transversal: testar se autenticidade fora-do-papel muda o padrão de qualidade.",
    "q_transversal": "Naquele momento de ser você mesmo — a qualidade do que você fez foi melhor, pior, ou só diferente do que quando você está no papel?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PII', 1, 'pt-BR', 'V2', $JSON${
  "m1": { "phrase": "Sou bom nisso. Só não sei mais quem é bom nisso.", "tension_label": "Eu ↔ Papel" },
  "m2": {
    "scene": "Marcus era o pai que aparecia — pros filhos, pra rede toda da família. Lembrava aniversários, organizava a reunião, sabia quem precisava de ajuda. Era bom nisso. Era genuinamente ele.\n\nMas aí os filhos cresceram. As reuniões diminuíram. O papel mudou. Ele era menos o organizador e mais... estava ali. Mas pra quê?\n\nEncontrando um amigo antigo, conversaram. O amigo perguntou: 'O que você anda fazendo? Não pra ninguém. O que é seu?' Marcus não soube responder. E sentado ali, percebeu que tinha passado tanto tempo sendo necessário que não tinha certeza se tinha algo que era só dele.",
    "question": "Do que Marcus tinha medo se parasse de ser o que segurava tudo?"
  },
  "m4": { "question": "Quando você sentiu pela primeira vez que estava desaparecendo nesse papel, e quando notou pela primeira vez que isso estava acontecendo?", "instruction": "Geralmente são dois momentos diferentes. Descreva os dois, brevemente — mesmo que não tenha certeza das datas." },
  "m3_1": {
    "context": "Testa se externaliza (é a condição) ou internaliza (é o descompasso de identidade).",
    "question": "Quando algo em que você devia ser bom começa a parecer oco, você costuma se perguntar se está esgotado, ou se algum dia foi de fato a pessoa que aquele papel descrevia?",
    "pole_left": "Estou esgotado", "pole_right": "Eu nunca fui essa pessoa"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Me retiro completamente. Eles vão se virar sem o meu papel.","followup":"Seu lugar na vida deles. Saber se você importa sem o papel.","followup_type":"cost"},
      {"key":"B","text":"Explico por que faço isso — que é como eu cuido, que importa pra mim.","followup":"Aceitar que eles podem não querer seu cuidado nessa forma.","followup_type":"cost"},
      {"key":"C","text":"Pergunto a eles do que de fato precisam de mim, sem o meu papel de sempre.","followup":"O que te assustou em ouvir a resposta?","followup_type":"question"},
      {"key":"D","text":"Mantenho o papel mas faço diferente — menos controlador, mais de apoio.","followup":"Qual a diferença entre mudar o papel e mudar quem você é?","followup_type":"question"}
    ],
    "scenario": "Seu parceiro/família/amigo próximo pediu pra você ser menos [seu papel]. Menos o organizador. Menos o provedor. Menos o forte. Estão dizendo que precisam de você diferente.\n\nVocê consegue. Consegue aparecer diferente. Mas significa admitir que o papel que você construiu não é só algo que você faz — é como você importa pra eles."
  },
  "m3_3": {
    "q1": "Lembre de uma vez em que decepcionou alguém ou falhou no seu papel habitual, e isso não destruiu quem você é.",
    "q2": "O que aprendeu sobre si mesmo nessa falha?",
    "scoring_note": "Testa se conseguem separar identidade de performance. Se respondem 'eu não sou só meu papel' vs. 'me aceitaram mesmo assim' — revela se o deslocamento é interno ou externo. L1.3 transversal: testar se a falha recalibra os critérios de suficiência.",
    "q_transversal": "Quando você falhou no papel — seu padrão do que conta como bom o suficiente mudou? Ou ficou igual?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PII', 1, 'pt-BR', 'V3', $JSON${
  "m1": { "phrase": "O papel cabe perfeito. Então por que sinto que estou desaparecendo?", "tension_label": "Eu ↔ Papel" },
  "m2": {
    "scene": "Diana era a realizadora — ditando o ritmo, com o plano, indo pra próxima coisa. Tinha levado ela longe. Era bem-sucedida. Respeitada.\n\nDaí ela bateu no alvo. Sem próxima coisa. Tentou criar urgência, pegar mais coisas, mas parecia forçado. Quando desacelerou, não sabia como só ser. Não tinha versão de si mesma que não estivesse indo em direção a algo.\n\nUma terapeuta perguntou: 'O que aconteceria se você parasse de realizar?' Diana respondeu: 'Eu não teria identidade.' A terapeuta perguntou: 'Isso é verdade? Ou é o que você arranjou pra ser verdade?' Diana saiu confusa, sem conseguir dizer se tinha medo de não realizar ou se simplesmente nunca tinha construído mais nada.",
    "question": "O que Diana teria que aceitar sobre si mesma pra parar de realizar?"
  },
  "m4": { "question": "Se seu papel terminasse amanhã, do que você sentiria mais falta — do trabalho em si, ou de ser a pessoa que faz?", "instruction": "Escolha um, e diga por quê em uma ou duas frases. A resposta honesta é a útil." },
  "m3_1": {
    "context": "Revela se o custo do papel está no trabalho em si ou na identidade que ele carrega.",
    "question": "Neste momento, você está mais apegado a fazer a coisa bem feita, ou a ser conhecido como alguém que faz a coisa bem feita?",
    "pole_left": "Fazer bem feito importa mais", "pole_right": "Ser reconhecido importa mais"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Aposto mais na competência. Fico ainda mais confiável.","followup":"A proximidade que essa pessoa está oferecendo. Sua própria permissão pra penar.","followup_type":"cost"},
      {"key":"B","text":"Admito que tenho medo de ser vulnerável com pessoas.","followup":"Controle. A segurança de ficar atrás do papel.","followup_type":"cost"},
      {"key":"C","text":"Mostro pra elas uma coisinha pequena com a qual estou penando.","followup":"O que tornou possível arriscar isso?","followup_type":"question"},
      {"key":"D","text":"Me deixo ser pouco confiável — uma vez. De propósito. E vejo o que sobrevive.","followup":"O que você aprendeu sobre quem é quando o papel falhou?","followup_type":"question"}
    ],
    "scenario": "Você foi o competente. O responsável. Aquele em quem todos confiam. Agora alguém percebeu e está nomeando: 'Você está sempre ligado. Nunca é vulnerável. Nunca deixa ninguém te ajudar.'\n\nEla está certa. E parte de você está aliviada de ter ouvido. Outra parte está em pânico. Porque se você não é o competente, perde a única identidade que construiu."
  },
  "m3_3": {
    "q1": "Quando você escolheu fazer algo menos bem feito, ou nem fazer, porque importava mais que realizar?",
    "q2": "Como você soube que essa escolha era a certa?",
    "scoring_note": "Endereça diretamente se conseguem sair do papel. A resposta revela se têm valores separados das exigências do papel. L1.3 transversal: testar como determinam suficiência ao sair de alta performance.",
    "q_transversal": "Quando você escolheu fazer menos — como decidiu o que ainda era suficiente?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PII', 1, 'pt-BR', 'V4', $JSON${
  "m1": { "phrase": "Continuo sendo a pessoa que todos precisam que eu seja. Mas não tenho certeza se essa pessoa ainda sou eu.", "tension_label": "Eu ↔ Papel" },
  "m2": {
    "scene": "James era o paramédico — aquele que você chama quando tudo está desabando, aquele que aparece e conserta. A identidade dele se construía em ser o conserto confiável na crise. Em casa, era o mecânico que restaurava qualquer coisa, o resolvedor de problemas com quem ninguém tinha que se preocupar.\n\nDaí ele teve um colapso. Pela primeira vez, teve que admitir que havia algo que não conseguia consertar. A equipe cobriu os turnos. A família apareceu diferente. A parceira sentiu mais proximidade.\n\nMas James estava aterrorizado. Se as pessoas o valorizavam quando ele não era o consertador, quem ele tinha sido em todos esses anos? E se ele melhorasse, voltaria a ser aquele que todos precisavam que resolvesse as coisas? E se voltasse, perderia isso?",
    "question": "Do que James tinha medo de desaparecer se admitisse que o papel não era o ele real?"
  },
  "m4": { "question": "Qual seria a parte mais difícil de admitir que algo dentro de você não está mais com seu papel?", "instruction": "Nomeie o que você perderia, ou o que se tornaria real, se dissesse em voz alta. Algumas frases." },
  "m3_1": {
    "context": "Endereça diretamente o que o papel está protegendo — relevância externa ou coerência interna.",
    "question": "Se você abandonasse esse papel completamente, do que teria mais medo — que ninguém precisasse mais de você, ou de finalmente ter que descobrir quem você é sem ele?",
    "pole_left": "Ninguém precisaria de mim", "pole_right": "Eu teria que descobrir quem sou"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Fico no papel mais tempo. Acho um jeito de estender.","followup":"A chance de descobrir o que vem depois. Tempo.","followup_type":"cost"},
      {"key":"B","text":"Saio completamente e me comprometo a reconstruir do zero.","followup":"A segurança de saber ser bom em algo. Certeza.","followup_type":"cost"},
      {"key":"C","text":"Fico com isso antes de decidir: quem eu era antes desse papel virar central? Do que eu cuidava que deixei de lado? O que me assustou em descobrir?","followup":"O que você lembrou sobre si mesmo?","followup_type":"question"},
      {"key":"D","text":"Faço transição lenta — desligo o papel antigo enquanto exploro o que vem.","followup":"O que você está construindo nesse espaço entre papéis?","followup_type":"question"}
    ],
    "scenario": "Seu papel está chegando ao fim. Aposentadoria. Mudança de carreira. Os filhos não precisam mais de você como precisavam. Sua expertise está ficando obsoleta. Ou você está escolhendo sair.\n\nO alívio é imediato. Você também está aterrorizado. Porque não sabe quem é sem isso. E agora tem que descobrir."
  },
  "m3_3": {
    "q1": "Pense em alguém que te vê fora do seu papel. O que essa pessoa vê que outros não veem?",
    "q2": "Essa pessoa está certa? Esse é o você real?",
    "scoring_note": "Revela se confiam numa versão alternativa de si mesmos. Resolução de PII frequentemente depende de achar pelo menos uma pessoa que valida o eu fora-do-papel. L1.3 transversal: testar se contextos fora-do-papel têm critérios diferentes de suficiência.",
    "q_transversal": "A pessoa que te vê fora do seu papel te exige um padrão de qualidade diferente? Como é isso?"
  }
}$JSON$::jsonb);

-- ─── PIII · Presença ↔ Distância ─────────────────────────────

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PIII', 1, 'pt-BR', 'V1', $JSON${
  "m1": { "phrase": "Acabou. E agora vejo o que não dava pra ver enquanto estava acontecendo.", "tension_label": "Presença ↔ Distância" },
  "m2": {
    "scene": "O projeto durou quatro anos. Elena tinha movido a vida inteira pra fazer dar certo. Era a razão dela. A identidade. A coisa que a acordava de manhã.\n\nNo último dia, teve uma comemoração pequena. Todos agradeceram a todos. Elena ficou na sala e não sentiu nada.\n\nDuas semanas depois, com distância, começou a ver com clareza:\n\nO projeto tinha precisado dela sendo alguém muito específico. Movida. Sacrificial. Capaz de ignorar as partes dela que queriam descanso. A equipe tinha gostado dela porque ela continuava aparecendo nessa forma. E ela tinha ficado nessa forma porque o projeto dava a ela um papel que ela entendia.\n\nAgora, olhando fotos dos quatro anos, conseguia ver o momento exato em que mudou — quando deixou de ser sobre o trabalho e virou sobre provar algo. Quando o sacrifício virou o ponto. Conseguia ver no rosto dela.\n\nA clareza era exata. E o luto também era exato.\n\nEla tinha desperdiçado quatro anos. Ou tinha aprendido algo essencial. Não conseguia dizer qual, e a diferença importava.",
    "question": "O que Elena estava enlutando mais — o tempo, ou o que tinha aprendido sobre si mesma?"
  },
  "m4": { "question": "O que você está notando sobre a diferença entre como fala disso agora, com clareza, e como viveu enquanto estava acontecendo?", "instruction": "Uma ou duas frases. O que mudou entre o agora e o então — nas próprias palavras?" },
  "m3_1": {
    "context": "Testa se a pessoa vê a distância como revelação (verdade exposta) ou construção (sentido feito depois). Núcleo de PIII — clareza é descoberta ou interpretação.",
    "question": "Agora que você consegue ver com clareza, a clareza parece mais que está revelando algo que sempre esteve lá, ou que está criando algo novo sobre o que aconteceu?",
    "pole_left": "Sempre esteve lá", "pole_right": "Estou criando esse entendimento agora"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Fico com a clareza que tenho e pergunto: o que vejo de fato quando olho pra eles agora? Não quem foram, não quem eu esperava que fossem. Quem são?","followup":"O que isso revelou de fato?","followup_type":"question"},
      {"key":"B","text":"Trago quem sou agora. Sou honesto sobre o que vejo e entendo.","followup":"A simplicidade da relação anterior. A chance de eles não conseguirem lidar com quem você virou.","followup_type":"cost"},
      {"key":"C","text":"Reconheço a mudança diretamente: somos diferentes. Podemos descobrir o que isso significa?","followup":"O que tornou possível nomear a mudança em vez de só agir nela?","followup_type":"question"},
      {"key":"D","text":"Procuro e deixo eles puxarem. Vejo aonde vai.","followup":"Controle sobre o processo. Clareza sobre se reconectar é de fato possível.","followup_type":"cost"}
    ],
    "scenario": "Alguém com quem você foi próximo voltou pra sua vida. A distância entre vocês mudou os dois. Você ainda não sabe se isso é bom ou ruim. Está sendo pedido que você reconcilie com base em quem os dois são agora, não em quem foram antes."
  },
  "m3_3": {
    "q1": "Lembre de algo que você não conseguia ver enquanto acontecia. Quando finalmente viu, qual foi o primeiro momento de clareza?",
    "q2": "O que tornou possível finalmente ver?",
    "scoring_note": "Buscar: o que disparou a clareza? (Distância? Uma conversa? Tempo passando? Um ponto de ruptura?) Resolução de PIII frequentemente depende de entender o que cria a capacidade de ver. É passivo (tempo) ou ativo (escolha)? L1.3 transversal: testar se distância/clareza retroativamente altera o julgamento de qualidade.",
    "q_transversal": "Agora que você vê com clareza — o que você fez naquele tempo era de fato bom o suficiente? Ou a clareza muda a sua avaliação?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PIII', 1, 'pt-BR', 'V2', $JSON${
  "m1": { "phrase": "Foi preciso terminar pra eu entender o que aquilo de fato era.", "tension_label": "Presença ↔ Distância" },
  "m2": {
    "scene": "Kai tinha sido casado por dezoito anos. Eram bons parceiros. Responsáveis. Estáveis. Tinham construído algo real.\n\nDaí o cônjuge de Kai foi embora. Foi súbito e não foi súbito — todos viam vindo, exceto Kai, que estava presente mas sem ver.\n\nNos meses seguintes, Kai tinha momentos cortantes de clareza:\n\nO jeito como tinham evitado conflito tão cuidadosamente que tinham evitado honestidade. Como tinham construído conforto em vez de intimidade. Como Kai tinha performado contentamento enquanto se sentia solitário dentro da relação.\n\nE pior: Kai conseguia ver exatamente quando isso tinha virado verdade. Conseguia identificar o momento (uma noite específica, uma conversa específica). Conseguia ver que tinha tido escolhas no caminho e tinha escolhido o caminho mais fácil cada vez.\n\nO cônjuge de Kai tinha tentado nomear isso. Várias vezes. Kai não tinha ouvido. Ou tinha ouvido e escolhido não responder.\n\nAgora, sozinho, Kai conseguia ver tudo. E a clareza parecia uma crueldade — tarde demais, honesta demais, queimando.",
    "question": "O que Kai estava sendo forçado a aceitar sobre a própria capacidade de auto-engano?"
  },
  "m4": { "question": "Nessa conversa sobre o que você aprendeu e entendeu, quantas vezes você defendeu ou explicou algo que antes culpava?", "instruction": "Conte se conseguir. Depois, em uma frase, nomeie o que você acha que mudou entre o culpar e o defender." },
  "m3_1": {
    "context": "Testa se culpam a si mesmos pela cegueira ou aceitam como condição da presença. Resolução de PIII depende dessa distinção.",
    "question": "Aquela coisa que você não conseguia ver enquanto acontecia — você teria querido ver se conseguisse? Ou acha que não ver era de fato necessário?",
    "pole_left": "Eu deveria ter visto", "pole_right": "Eu não conseguiria ter visto"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Pauso e examino: estou protegendo elas, ou estou me protegendo do julgamento delas? Meu silêncio é gentileza ou medo?","followup":"O que essa distinção mudou?","followup_type":"question"},
      {"key":"B","text":"Conto a verdade do que entendi.","followup":"O conforto delas. Possivelmente a relação.","followup_type":"cost"},
      {"key":"C","text":"Pergunto por que a história antiga importa pra elas.","followup":"O que você estava tentando entender sobre elas?","followup_type":"question"},
      {"key":"D","text":"Testo: conto pra elas um pedacinho da verdade e observo como respondem.","followup":"O que decidiu se você ia contar mais?","followup_type":"question"}
    ],
    "scenario": "Você entendeu algo sobre seu passado que muda como entende a si mesmo. É clareza, mas dói. Alguém que você ama não quer ouvir. Gostava da história que você tinha antes. Quer que você mantenha a versão de si mesmo que ela conheceu."
  },
  "m3_3": {
    "q1": "Desde que você teve essa clareza, o que você teve que enlutar que não esperava enlutar?",
    "q2": "Esse luto está mudando o que a clareza significa pra você?",
    "scoring_note": "Testa se conseguem segurar complexidade — clareza mais perda. PIII muitas vezes não é sobre aprender a verdade; é sobre aprender que verdade tem custo. L1.3 transversal: testar se a perda recalibra critérios de suficiência em contextos relacionais.",
    "q_transversal": "O luto mudou seu padrão do que conta como fazer o suficiente numa relação ou compromisso?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PIII', 1, 'pt-BR', 'V3', $JSON${
  "m1": { "phrase": "Precisei de distância pra finalmente ver com clareza. Mas agora estou enlutando o que a clareza me mostra.", "tension_label": "Presença ↔ Distância" },
  "m2": {
    "scene": "Sofia tinha trabalhado pro mentor por seis anos. Acreditava nele. Defendia. Construiu a carreira na sombra dele.\n\nTrês meses depois de sair, começou a entender o que tinha visto mas não tinha nomeado: o jeito como ele usava as pessoas, como a posicionava como sucessora enquanto a minava, como fez ela cúmplice.\n\nElaa tinha estado presente em tudo aquilo. Só era uma versão de si mesma que não conseguia ver.\n\nProcurando uma ex-colega: 'Você viu?' A colega ficou em silêncio. 'Vi muito antes. Tentei te contar.' Sofia sentiu duas coisas: alívio (não estava louca) e vergonha (tinha ignorado o aviso por anos).",
    "question": "O que Sofia estava protegendo ao ficar incapaz de ver com clareza?"
  },
  "m4": { "question": "A clareza que você tem agora é algo que você precisou ganhar, ou ainda está negociando?", "instruction": "Uma frase ou duas. Se parece ganha, descreva o custo. Se ainda está sendo negociada, descreva o peso." },
  "m3_1": {
    "context": "Testa se a distância clarifica ou desestabiliza o significado. PIII frequentemente envolve as duas coisas ao mesmo tempo.",
    "question": "Agora que você vê com clareza, sente que entende o que aquilo de fato era, ou sente que está enlutando algo que nunca existiu de verdade?",
    "pole_left": "Entendo o que era", "pole_right": "Estou enlutando uma ilusão"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Mantenho a clareza em particular. Mudo internamente sem contar pra ninguém.","followup":"Isolamento. A chance de de fato consertar o que você entende agora.","followup_type":"cost"},
      {"key":"B","text":"Conto pras pessoas envolvidas o que entendo sobre meu papel.","followup":"O julgamento delas. Controle sobre a interpretação delas do que aconteceu.","followup_type":"cost"},
      {"key":"C","text":"Peço ajuda pra entender — levo isso pra alguém em quem confio.","followup":"O que tornou seguro não ter a resposta sozinho?","followup_type":"question"},
      {"key":"D","text":"Fico com a clareza tempo o bastante pra saber se é entendimento permanente ou dor temporária.","followup":"Como você vai saber quando entendeu o suficiente?","followup_type":"question"}
    ],
    "scenario": "A distância te mostrou algo doloroso sobre você mesmo — o jeito como você contribuiu pra algo que machucou, ou falhou com alguém que importava, ou desperdiçou algo precioso. A clareza é real. E não é mais só sobre eles — é sobre quem você é."
  },
  "m3_3": {
    "q1": "Qual é uma coisa que parece completamente diferente agora do que parecia de dentro da experiência?",
    "q2": "Você teria querido saber disso enquanto estava nela, ou a distância é essencial pra aceitar?",
    "scoring_note": "Revela se veem distância como clarificadora (melhoria) ou destrutiva (perda necessária). A resposta molda como integram a clareza. L1.3 transversal: testar se julgamento retrospectivo altera os critérios originais de suficiência.",
    "q_transversal": "Ver isso diferente agora muda o que você pensa sobre se fez um bom trabalho enquanto estava lá?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PIII', 1, 'pt-BR', 'V4', $JSON${
  "m1": { "phrase": "De longe, finalmente vejo a verdade. E não sei o que fazer com ela.", "tension_label": "Presença ↔ Distância" },
  "m2": {
    "scene": "Liam tinha sido melhor amigo de alguém por uma década. Daí — uma deriva lenta, um conflito, um fim.\n\nMeses depois, Liam finalmente conseguiu ver a amizade com clareza: tinha sido desigual. Liam tinha sido menor, querendo menos, acomodando. Tinha tido momentos pra falar, pra renegociar, mas Liam tinha escolhido ser diminuído em vez de arriscar a relação.\n\nAgora Liam conseguia ver que tinha estado se traindo por anos. O amigo provavelmente não era o vilão — Liam só não tinha estado disposto a ser uma pessoa inteira naquela relação. O fim parecia falha de Liam.",
    "question": "O que custaria a Liam parar de culpar o amigo e começar a reconhecer a escolha?"
  },
  "m4": { "question": "O que significaria sobre você se nunca chegasse a uma clareza completa sobre isso — se uma parte sempre ficasse turva?", "instruction": "Seja honesto em uma frase ou duas. Dizer 'consigo conviver com isso' e dizer 'dói' são respostas válidas." },
  "m3_1": {
    "context": "Revela se veem clareza como melhoria ou perda. A resposta é diagnóstica para PIII.",
    "question": "Se você pudesse voltar e contar pro seu eu do passado o que sabe agora, contaria, ou protegeria seu eu do passado desse conhecimento?",
    "pole_left": "Eu contaria", "pole_right": "Eu protegeria do saber"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais é afetado?",
    "options": [
      {"key":"A","text":"Procuro. Fecho o ciclo.","followup":"A paz da distância. Controle sobre a reação dela.","followup_type":"cost"},
      {"key":"B","text":"Fico no silêncio. O que está feito está feito.","followup":"Reconciliação. Fechamento. Saber se ela te entenderia agora.","followup_type":"cost"},
      {"key":"C","text":"Examino esse impulso com cuidado: por que quero falar agora? Estou buscando fechamento pra mim, ou buscando algo dela? O que estou esperando que aconteça?","followup":"O que mudou quando você entendeu suas próprias razões?","followup_type":"question"},
      {"key":"D","text":"Espero. Se o momento vier naturalmente, falo. Se não, não forço.","followup":"O que você está de fato fazendo nessa espera?","followup_type":"question"}
    ],
    "scenario": "Você ganhou clareza sobre algo que terminou há muito tempo. Anos passaram. Você poderia procurar e endereçar. Ou poderia deixar fechado. Não há razão urgente pra agir. Mas há algo em você que quer."
  },
  "m3_3": {
    "q1": "Ver com clareza mudou alguma coisa em como você segue em frente, ou mudou só seu entendimento do passado?",
    "q2": "Qual a diferença entre entender o que aconteceu e saber o que fazer a respeito?",
    "scoring_note": "Testa se clareza leva à ação ou fica como consciência. Resolução de PIII às vezes significa aceitar que entende mas não pode mudar nada. L1.3 transversal: testar se a clareza altera permanentemente os critérios de suficiência.",
    "q_transversal": "A clareza mudou alguma coisa em como você mede a qualidade do que faz daqui pra frente?"
  }
}$JSON$::jsonb);

-- ─── PIV · Clareza ↔ Ação ────────────────────────────────────

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PIV', 1, 'pt-BR', 'V1', $JSON${
  "m1": { "phrase": "Sei o que é certo. E carrego o peso de agir nisso.", "tension_label": "Clareza ↔ Ação" },
  "m2": {
    "scene": "Marcus, 42, gere um time há seis anos. Sabe — com certeza absoluta — que uma pessoa precisa sair. Não porque é ruim no trabalho. Porque o papel não cabe mais nela. Tem visto a exaustão crescer semana a semana. Sabe que a conversa vai ser dura. Sabe que pode estragar a relação. Está sentado com esse saber há três meses. O time está notando a tensão. O sono dele está pior. É terça de manhã, 8:47, e ele olha pro calendário onde o nome dela aparece numa reunião das 9.",
    "question": "O que você acha que Marcus vai fazer hoje? E qual vai ser a parte mais difícil — pra ele — do que quer que escolha?"
  },
  "m4": { "question": "Agora — o que está entre sua clareza e sua ação? É dúvida, peso, outras pessoas, ou algo que você ainda não nomeou?", "instruction": "Uma frase. Nomeie o que está nesse espaço — dúvida, peso, alguém específico, ou algo ainda sem nome." },
  "m3_1": {
    "context": "",
    "question": "Quando você encara uma decisão em que está claro sobre o certo mas inseguro sobre o custo, naturalmente se move primeiro — pra fora ou pra dentro?",
    "pole_left": "Pra fora", "pole_right": "Pra dentro"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Ajo. O custo de esperar é maior.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"B","text":"Espero. Não estou pronto.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"C","text":"Dou um passo menor primeiro.","followup":"O que você está testando ao não ir até o fim?","followup_type":"question"},
      {"key":"D","text":"Nomeio o conflito em voz alta.","followup":"Pra quem você está falando, e qual o resultado que você espera?","followup_type":"question"}
    ],
    "scenario": "Você sabe o que precisa ser feito. Sabe há um tempo. O custo de agir está claro. O custo de esperar também. Você está no ponto de decisão."
  },
  "m3_3": {
    "q1": "Lembre de uma vez em que você de fato agiu em algo que sabia ser certo, mesmo o custo sendo real. Qual era a situação? (Seja específico: quem estava envolvido, o que você fez, quando foi.)",
    "q2": "O que tornou possível agir? O que estava diferente naquele dia ou naquela situação — não na clareza, mas na sua capacidade de carregar o peso?",
    "scoring_note": "",
    "q_transversal": "Quando você agiu — a qualidade da ação foi adequada? Atendeu o padrão que sua clareza exigia, ou a realidade forçou uma régua mais baixa?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PIV', 1, 'pt-BR', 'V2', $JSON${
  "m1": { "phrase": "A resposta está clara pra mim. O custo de viver isso é mais pesado do que esperava.", "tension_label": "Clareza ↔ Ação" },
  "m2": {
    "scene": "Priya, 34, concordou em ir no aniversário da mãe no sábado. Ela sabe — no momento em que disse sim — que não devia ter aceitado. Tem pesquisa pra terminar. Precisa desse fim de semana. Mas a mãe pediu pouca coisa. Três horas de carro. Quatro horas de jantar do qual ela não vai gostar. Já imaginou a conversa com o parceiro: 'Eu sei que disse sim. Sei o que eu deveria fazer. Só não consigo.' É quinta. A viagem é em 36 horas. Está mandando mensagens, tentando achar saída que não machuque, sabendo que não tem.",
    "question": "Qual é a escolha que Priya está de fato encarando? E se ela ficar em casa, o que vai estar carregando?"
  },
  "m4": { "question": "Conforme você respondia essas perguntas, percebeu se estava carregando o custo sozinho — ou procurando alguém pra dividir? O que isso te diz?", "instruction": "Uma frase ou duas. Descreva o que você de fato fez agora — não o que acha que deveria fazer." },
  "m3_1": {
    "context": "",
    "question": "Quando você sabe o que precisa acontecer mas o peso de agir parece pesado, costuma se mover pra aceleração (resolver logo, reduzir incerteza) ou pra paciência (deixar assentar, juntar mais informação)?",
    "pole_left": "Aceleração", "pole_right": "Paciência"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Ajo mesmo sendo pesado, porque o custo de não agir é maior.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"B","text":"Fico com o peso antes de me mover — entendo o que ele me diz sobre a escolha.","followup":"O que o peso te ensinaria se você ficasse com ele?","followup_type":"question"},
      {"key":"C","text":"Me movo de lado — mudo algo menor enquanto junto força pro movimento maior.","followup":"O que você está aprendendo sobre sua capacidade enquanto faz isso?","followup_type":"question"},
      {"key":"D","text":"Torno público: conto pras pessoas que estou lutando com isso.","followup":"O que muda pra você quando para de carregar isso sozinho?","followup_type":"question"}
    ],
    "scenario": "Você vê o caminho certo com clareza. Já imaginou o primeiro passo. Mas em algum lugar entre saber e mover, sente peso — não incerteza, peso. Você entende o que agir vai custar. Também entende o que ficar parado vai custar. E hoje, tem que escolher com qual custo consegue conviver."
  },
  "m3_3": {
    "q1": "Lembre de uma vez específica em que agiu sabendo o que era certo, mesmo sabendo o que ia te custar — em relação, tempo, conforto, reputação. O que aconteceu?",
    "q2": "O que mudou em você antes que fez o custo parecer suportável? Foi algo que você fez pra preparar, alguém que consultou, uma reformulação que fez, ou outra coisa?",
    "scoring_note": "",
    "q_transversal": "Olhando pra como você agiu — sua execução foi proporcional à sua clareza, ou o peso comprimiu?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PIV', 1, 'pt-BR', 'V3', $JSON${
  "m1": { "phrase": "Vejo o que precisa acontecer. O peso não está na visão — está no passo.", "tension_label": "Clareza ↔ Ação" },
  "m2": {
    "scene": "David, 38, toca um pequeno negócio. Vê exatamente como fazer crescer mais rápido: contratar alguém, montar o sistema, escalar a receita. Vê com clareza. Também vê que sua margem vai ficar apertada por seis meses. Vê o risco. Vê que precisaria pedir à esposa uma permissão que sempre disseram que ele tinha. Vê a escolha: fazer o que sabe que funciona, ou manter como está. Não está travado na decisão. Está travado em outra coisa — algo sobre se agir no que ele sabe significa perder algo mais. Tem virado isso na cabeça enquanto caminha as mesmas duas quadras do bairro toda manhã, há cinco semanas.",
    "question": "Do que você acha que David está com medo de perder? E isso muda o que ele deveria fazer?"
  },
  "m4": { "question": "Quando você se imaginou nessas situações, prestou mais atenção em quão certa era a ação ou no que ela ia custar? Qual puxou mais forte?", "instruction": "Escolha um em uma frase. Depois, em mais uma linha, diga o que fez aquele puxar mais forte." },
  "m3_1": {
    "context": "",
    "question": "Em situações onde você está claro sobre a escolha certa mas consciente do custo real, tende a enfatizar a clareza (o quão certa é a escolha) ou o custo (o que vai mudar como consequência)?",
    "pole_left": "Enfatizar Clareza", "pole_right": "Enfatizar Custo"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Pago a conta inteira — ajo no que vejo, aceito o custo.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"B","text":"Examino por que estou resistindo — não para evitar a ação, mas para entender o que a resistência protege.","followup":"Que parte de você está dizendo não, e do que essa parte precisa?","followup_type":"question"},
      {"key":"C","text":"Suavizo a clareza — busco uma versão da resposta que custe menos.","followup":"Você está negociando consigo mesmo, e se sim, o que está tentando proteger?","followup_type":"question"},
      {"key":"D","text":"Ajo, mas levo alguém comigo na ação.","followup":"Quem, e o que você acha que essa pessoa consegue absorver que você não consegue?","followup_type":"question"}
    ],
    "scenario": "A clareza está aí. Não é o que você queria ouvir, mas é clara. E vem com uma conta. Você poderia evitar pagar fingindo que não vê. Pagar e acabar logo. Pagar uma versão menor. Ficar no ver sem agir ainda. Essas são suas opções reais."
  },
  "m3_3": {
    "q1": "Me conta de um momento em que você sabia exatamente o que precisava acontecer E agiu nisso, mesmo sendo custoso. O que estava em jogo, e o que você fez?",
    "q2": "Olhando para trás, houve um momento em que passou de saber para se mover? O que aconteceu nessa transição? O que te deu permissão para agir?",
    "scoring_note": "",
    "q_transversal": "No momento de passar do saber para o fazer — a qualidade do fazer correspondeu à qualidade do saber?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PIV', 1, 'pt-BR', 'V4', $JSON${
  "m1": { "phrase": "Saber e fazer não são a mesma coisa. Sei disso agora porque estou vivendo a diferença.", "tension_label": "Clareza ↔ Ação" },
  "m2": {
    "scene": "Yuki, 45, está numa reunião de trabalho onde o time vai tomar uma decisão que ela acredita estar errada. Sabe os dados. Já viu isso antes. Consegue ver onde isso vai dar. Também sabe que falar significa uma de três coisas: vai ser passada por cima e vai se sentir impotente, vai ser ouvida e o sucesso vai pertencer a todos, ou vai criar tensão que ela vai ter que gerenciar. Vê as três. Também vê o custo do silêncio. A sala está em silêncio. Alguém acabou de pedir input. A mão dela está sobre a mesa.",
    "question": "O que Yuki vai fazer, e o que ela está de fato decidindo — sobre a decisão ou sobre si mesma?"
  },
  "m4": { "question": "Algo em você sabe o que fazer. Outra coisa em você está segurando. Agora — qual delas parece mais você?", "instruction": "Nomeie qual em uma frase. Não tente reconciliar — só diga qual parece mais você agora." },
  "m3_1": {
    "context": "",
    "question": "Carregando o peso de agir no que sabe ser certo, você processa isso principalmente conversando (processamento externo, dar sentido junto) ou gerenciando internamente (autorregulação, decisão privada)?",
    "pole_left": "Processamento Externo", "pole_right": "Gerenciamento Interno"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Atravesso a soleira — a clareza é permissão suficiente pra agir.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"B","text":"Pratico a ação em escala pequena primeiro — faço uma vez de forma contida pra ver como sente.","followup":"O que a versão pequena te ensinaria antes de você se comprometer com a inteira?","followup_type":"question"},
      {"key":"C","text":"Ajo, mas de forma limitada — testo, vou devagar, reservo o direito de mudar de curso.","followup":"O que precisaria pra você agir sem essa reserva?","followup_type":"question"},
      {"key":"D","text":"Examino o que a soleira em si está pedindo — não se atravessar, mas pra onde de fato estou atravessando.","followup":"O que vai estar diferente do outro lado?","followup_type":"question"}
    ],
    "scenario": "Você passou tempo com a resposta. Ela não mudou. Você checou contra seus valores, seus medos, suas obrigações. A clareza está sólida. Mas agir numa solidez que vai mudar coisas — isso cria um tipo específico de pressão. Você não está confuso sobre o que fazer. Está na soleira de fazer."
  },
  "m3_3": {
    "q1": "Descreva uma situação em que você carregou o peso de agir em algo que estava claro pra você. Qual era a situação, e qual era o peso especificamente?",
    "q2": "Que recursos — internos ou externos — você tinha acesso que te permitiram carregar? O que teria tornado impossível?",
    "scoring_note": "",
    "q_transversal": "Que recursos te permitiram agir num nível que correspondia à sua clareza? O que teria feito a ação ficar abaixo?"
  }
}$JSON$::jsonb);

-- ─── PV · Dentro ↔ Fora ──────────────────────────────────────

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PV', 1, 'pt-BR', 'V1', $JSON${
  "m1": { "phrase": "Sem crise. Só uma abertura sem destino ainda.", "tension_label": "Dentro ↔ Fora" },
  "m2": {
    "scene": "Elena, 37, largou o trabalho de enfermeira há três meses. O burnout era total — turnos de doze horas, esgotamento emocional, a sensação de que algo essencial nela estava sendo drenado. Economizou o que pôde em cinco anos, e isso está comprando tempo. Mas a família dela está cética. A mãe chamou de 'irresponsável'. A irmã perguntou se ela estava tendo um colapso. Tem pista pra mais seis meses, talvez, antes de precisar trabalhar de novo. Algo dentro disse pare, e ela parou. Acorda sentindo que algo nela está escutando. Tem lido, feito caminhadas longas, voluntariado numa ONG de alfabetização. Descobriu que consegue ficar com o silêncio. As amigas continuam perguntando: 'E aí, qual o próximo passo? — você precisa de um plano.' Ela notou que quando perguntam com preocupação, ela fecha. Quando perguntam com curiosidade, ela abre. É fim de tarde de quarta. Uma ex-colega de enfermagem mandou mensagem: 'Ouvi dizer que você saiu. Café? Estamos contratando na clínica nova — pagamento melhor, mesma exaustão.'",
    "question": "O que Elena está de fato procurando agora? E se aceitar esse café, pra onde vai estar indo — ou de onde fugindo?"
  },
  "m4": { "question": "Algo te trouxe até aqui — mesmo que você não consiga nomear. Agora, isso parece mais curiosidade ou mais inquietação?", "instruction": "Uma palavra ou uma frase. Não explique — só deixe a palavra existir." },
  "m3_1": {
    "context": "",
    "question": "Quando algo dentro abre sem razão clara ou crise, você costuma se mover pra explorar (ficar com o não-saber, manter a curiosidade) ou pra estabilizar (achar um nome, mover pra ação)?",
    "pole_left": "Explorar", "pole_right": "Estabilizar"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Fico com o não-saber — descubro que tipo de escuta essa abertura pede.","followup":"O que aconteceria se você se desse permissão pra ainda não entender?","followup_type":"question"},
      {"key":"B","text":"Falo mesmo assim.","followup":"Pra quem, e o que você espera que ela faça com o que você contar?","followup_type":"question"},
      {"key":"C","text":"Ajo como se entendesse — me movo em direção a algo que talvez esteja chamando.","followup":"O que você está testando ao se mover antes de entender?","followup_type":"question"},
      {"key":"D","text":"Procuro o que talvez esteja evitando — essa abertura é real, ou estou fugindo de algo?","followup":"O que precisaria pra você confiar na abertura em vez de interrogá-la?","followup_type":"question"}
    ],
    "scenario": "Você sente algo se mexendo, mas ainda sem nome claro. As pessoas em volta não parecem notar. Ou talvez notam. E agora você está numa escolha: isso fica dentro, ou se move pra fora?"
  },
  "m3_3": {
    "q1": "Lembre de uma vez em que algo dentro de você abriu ou se mexeu sem uma crise forçando. Quais eram as circunstâncias? O que estava abrindo?",
    "q2": "Do que você precisou — ou o que você tinha — que te permitiu ficar aberto àquele deslocamento em vez de fechar ou correr pra resolver?",
    "scoring_note": "",
    "q_transversal": "Quando você ficou aberto àquele deslocamento — havia um padrão de como você se relacionava com ele, ou só seguiu?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PV', 1, 'pt-BR', 'V2', $JSON${
  "m1": { "phrase": "Algo se mexeu. Ainda não tenho linguagem. Mas estou escutando.", "tension_label": "Dentro ↔ Fora" },
  "m2": {
    "scene": "Thomas, 51, está na mesma carreira há 28 anos. Sem crise. Ainda competente. Ainda necessário. Mas há seis meses, algo começou a coçar. Não uma queixa. Não vontade de fugir. Só uma coceira que diz que tem outra coisa. Não contou pra ninguém, exceto pra esposa. Em reuniões de equipe, sua mente está em outro lugar. Começou a frequentar eventos fora da área. Está lendo diferente. Está fazendo pros filhos adultos perguntas sobre o que eles sabem sobre si mesmos que ele não sabia na idade deles. Não está procurando emprego. Não está deprimido. Está procurando. Mas pelo quê, não consegue articular. É segunda de manhã. O chefe acabou de designar ele pra liderar o próximo grande projeto — daqueles que o teriam empolgado dois anos atrás.",
    "question": "Pelo quê Thomas está de fato disponível agora? E o que está protegendo ao não nomear ainda?"
  },
  "m4": { "question": "Conforme você passou pelas perguntas, a abertura dentro de você ficou mais clara ou mais turva? O que isso te diz sobre o que a abertura é, de fato?", "instruction": "Uma palavra basta. Ou uma frase. Diga o que a abertura é, mesmo que impreciso." },
  "m3_1": {
    "context": "",
    "question": "Quando sente algo se mexendo mas ainda não entende, é mais inclinado a compartilhar o que está vivendo (tornar real ao nomear com outros) ou a manter privado (proteger até entender por si mesmo)?",
    "pole_left": "Compartilhar", "pole_right": "Manter Privado"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Nomeio honestamente — corro o risco de ser conhecido.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"B","text":"Pauso antes de responder — tomo tempo pra entender o que a pergunta dela está de fato pedindo de mim.","followup":"O que significaria compartilhar agora vs. proteger um pouco mais?","followup_type":"question"},
      {"key":"C","text":"Nomeio mas enquadro como temporário ou provisório — 'estou explorando algo, mas nada decidido'.","followup":"O que você está protegendo ao manter a porta entreaberta?","followup_type":"question"},
      {"key":"D","text":"Pergunto por que ela notou — viro a atenção dela pra ela mesma em vez de pra meu interior.","followup":"Você está protegendo a abertura em si, ou se protegendo do julgamento dela?","followup_type":"question"}
    ],
    "scenario": "Algo está se mexendo dentro de você. Não é alto, mas é distinto. E agora alguém de fora perguntou diretamente sobre isso — uma pergunta que exige que você nomeie ou negue. Você poderia ficar opaco. Poderia ser honesto. Poderia responder pela metade. Está na soleira."
  },
  "m3_3": {
    "q1": "Lembre de uma vez em que se sentiu disponível pra algo que ainda não conseguia nomear. Quando foi isso, e como essa disponibilidade era no corpo?",
    "q2": "Você falou disso pra alguém? Se sim, o que tornou seguro? Se não, o que protegeu?",
    "scoring_note": "",
    "q_transversal": "Quando você falou (ou escolheu não falar) — a qualidade dessa conversa foi suficiente? Honrou o que estava acontecendo?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PV', 1, 'pt-BR', 'V3', $JSON${
  "m1": { "phrase": "Estou disponível. Não por decisão. Por algo que não consigo nomear bem.", "tension_label": "Dentro ↔ Fora" },
  "m2": {
    "scene": "Amara, 29, está numa relação que funciona. O trabalho é sólido. Tem comunidade. Mas algo nos últimos oito meses abriu. Não em crise. Em curiosidade. Tem sido puxada por perguntas que nunca tinha feito. Sobre o que ela de fato quer, não o que deveria querer. Sobre por que faz as escolhas que faz. Começou terapia — não porque algo está quebrado, mas porque algo está acordando. A namorada notou. Os colegas notaram. Ela parece presente mas também em outro lugar. Continua comprometida com tudo. Mas também está disponível pra algo que não consegue nomear. É sexta à noite. Uma mentora que ela respeita acabou de procurar perguntando se ela teria interesse em explorar um programa sabático.",
    "question": "O que abriu em Amara, e o que acontece se ela disser sim a essa oportunidade — ou se disser não?"
  },
  "m4": { "question": "Agora — você está mais puxado pra entender o que está se mexendo, ou pra proteger isso de ser entendido cedo demais?", "instruction": "Uma frase. Qual puxão é mais forte — e do que você teria medo se deixasse o outro vencer?" },
  "m3_1": {
    "context": "",
    "question": "Em momentos em que você está disponível pra algo novo mas sem clareza do que é, tende mais à abertura (dizer sim a possibilidades, ir em direção a novas pessoas/experiências) ou à contenção (esperar, observar, dizer não a quase tudo)?",
    "pole_left": "Abertura", "pole_right": "Contenção"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Aceito a oportunidade — mas pergunto a ela o que está tentando me ensinar antes de decidir.","followup":"O que a oportunidade te ensinaria se você ficasse curioso em vez de comprometido?","followup_type":"question"},
      {"key":"B","text":"Espero — não estou pronto pra mexer em algo que não entendo.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"C","text":"Procuro uma versão menor dessa oportunidade — algo que me deixe explorar sem compromisso total.","followup":"O que precisaria pra você se comprometer plenamente?","followup_type":"question"},
      {"key":"D","text":"Falo com pessoas em quem confio antes de decidir — uso a reflexão delas pra clarear o que está acontecendo dentro.","followup":"O que a clareza delas te dá que ficar sozinho não dá?","followup_type":"question"}
    ],
    "scenario": "Uma oportunidade chegou que parece chamar pra coisa nova que está abrindo. Você ainda não entende plenamente a abertura. Poderia aceitar a oportunidade e deixar ela te ensinar o que a abertura significa. Esperar até estar mais claro. Buscar algo menor que pareça mais seguro. Descartar como coincidência e ficar parado."
  },
  "m3_3": {
    "q1": "Lembre de um momento em que estava no meio de uma abertura — algo se mexendo mas ainda não formado. O que estava acontecendo na sua vida, e o que você fazia com a incerteza?",
    "q2": "O que te permitiu ficar paciente com isso? Tinha uma pessoa, uma prática, uma fé, uma circunstância que ajudou a não apressar?",
    "scoring_note": "",
    "q_transversal": "Ficando com a incerteza — como soube que estava fazendo isso bem o suficiente em vez de só boiando?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PV', 1, 'pt-BR', 'V4', $JSON${
  "m1": { "phrase": "A abertura é real. O chão ainda não chegou. Estou esperando no meio.", "tension_label": "Dentro ↔ Fora" },
  "m2": {
    "scene": "James, 44, dá aula no ensino médio. Faz isso há dezessete anos. Avaliações sólidas, salário estável, conhece o ofício. Mas começando em setembro passado, algo se mexeu por dentro. Não um colapso. Uma abertura. Está mais atento às perguntas dos alunos, menos apegado às respostas do currículo. Está lendo livros de filosofia à noite. Está sentando com silêncio em jeitos que parecem novos. Nada externo mudou. O casamento é o mesmo. A hipoteca é a mesma. Mas o dentro dele ficou mais disponível — pra quê, ele não tem certeza. A coordenadora acabou de pedir que ele lidere a redesenho do currículo do ano que vem. A esposa perguntou se ele está feliz. Nenhuma das duas perguntas parece ter resposta clara.",
    "question": "O que está acontecendo dentro de James, e o que ele arrisca perder se parar de escutar?"
  },
  "m4": { "question": "Se a coisa que está abrindo em você tivesse uma pergunta — não uma resposta, só uma pergunta — qual ela estaria fazendo?", "instruction": "Escreva a pergunta em si — não uma resposta a ela. Uma frase basta." },
  "m3_1": {
    "context": "",
    "question": "Quando uma abertura acontece dentro sem pressão externa, você confia (assume que algo verdadeiro está tentando emergir) ou questiona (se pergunta se está evitando algo, ou se é temporário)?",
    "pole_left": "Confiar", "pole_right": "Questionar"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Vou em frente — ajo na abertura, vejo aonde dá.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"B","text":"Volto — retorno pro estável, nomeio isso como um momento que passou.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"C","text":"Fico no meio mais tempo — resisto a escolher, fico disponível e escutando.","followup":"Por quanto tempo consegue ficar aqui, e o que custa fazer isso?","followup_type":"question"},
      {"key":"D","text":"Dou passos pequenos e visíveis — crio estruturas que honram a abertura sem perder o chão.","followup":"Que tipo de estrutura te deixaria ficar aberto sem perder o eixo?","followup_type":"question"}
    ],
    "scenario": "Você está no meio de algo abrindo. A abertura não vem com instruções. E agora encara uma escolha: ficar no meio e continuar escutando, ou se mover pra uma das bordas — pra trás, pro estável, ou pra frente, pro que está chamando."
  },
  "m3_3": {
    "q1": "Descreva uma vez em que você foi puxado por algo que não entendia plenamente. O que estava te puxando, e o que você fez?",
    "q2": "Olhando para trás, o que te fez confiar no puxão o suficiente pra ir em direção (ou desconfiar o suficiente pra recuar)?",
    "scoring_note": "",
    "q_transversal": "Quando você seguiu o puxão — o que você levou foi suficiente pro que ele pediu?"
  }
}$JSON$::jsonb);

-- ─── PVI · Movimento ↔ Pausa ─────────────────────────────────

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PVI', 1, 'pt-BR', 'V1', $JSON${
  "m1": { "phrase": "Construindo algo que importa. A vertigem faz parte do trabalho.", "tension_label": "Movimento ↔ Pausa" },
  "m2": {
    "scene": "Rashid, 36, abriu a empresa de consultoria há oito meses. Está funcionando — funcionando de verdade. Tem clientes e dinheiro. Mas há uma vertigem que ele não esperava. Em alguns dias acorda sabendo que isso vai falhar. Em outros, vai escalar. As duas coisas parecem igualmente plausíveis. Está trabalhando dez horas por dia porque parar parece perigoso — pausar parece reverter o momentum. A esposa deixa recados gentis: 'Vem jantar?' O corpo dele roda em adrenalina e café. Sabe que isso não é sustentável. Também sabe que se desacelerar, algo pode desmoronar. É quarta à tarde. Uma oportunidade de cliente acabou de chegar, dobraria capacidade e horas. Está prestes a aceitar.",
    "question": "O que Rashid está de fato construindo, e o que está arriscando ao construir desse jeito?"
  },
  "m4": { "question": "Agora — a vertigem parece sinal de que você está fazendo algo certo, ou sinal de que algo precisa mudar? O que te fez responder assim?", "instruction": "Primeira resposta, uma frase. Depois em mais uma linha, o que te fez responder assim." },
  "m3_1": {
    "context": "",
    "question": "Quando você está construindo algo que importa e o ritmo está criando pressão, tende a se inclinar pra manter aceleração (a crença de que momentum é necessário) ou pra criar pausa (a crença de que integração é necessária)?",
    "pole_left": "Aceleração", "pole_right": "Integração"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Pauso pra entender o que está sendo tirado — não pra parar de construir, mas pra saber qual é o custo de fato.","followup":"O que clareza sobre o custo mudaria?","followup_type":"question"},
      {"key":"B","text":"Desacelero.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"C","text":"Termino esta fase, depois reavalio.","followup":"O que você espera que esteja diferente quando essa fase acabar?","followup_type":"question"},
      {"key":"D","text":"Empurro — o custo faz parte do trabalho.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"}
    ],
    "scenario": "Você está construindo algo há meses. Está funcionando — mas o ritmo está tirando algo de você. Você ainda não consegue dizer se é problema ou só o custo. Está num ponto de decisão."
  },
  "m3_3": {
    "q1": "Descreva uma vez em que estava construindo algo que importava e a vertigem estava presente ao mesmo tempo. O que estava construindo, e como a vertigem era?",
    "q2": "Como você segurou as duas — continuar construindo enquanto processava a instabilidade? O que te sustentou?",
    "scoring_note": "",
    "q_transversal": "Construindo e gerenciando a vertigem — a qualidade do que você construiu foi adequada, ou o ritmo comprometeu?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PVI', 1, 'pt-BR', 'V2', $JSON${
  "m1": { "phrase": "Estou construindo algo real. A instabilidade da construção é dentro do que estou aprendendo a construir.", "tension_label": "Movimento ↔ Pausa" },
  "m2": {
    "scene": "Keisha, 32, está há quatro anos criando dois filhos e construindo carreira em tech. A carreira é momentum — promoções, visibilidade, projetos com os quais ela se importa. Os filhos são crescimento — virando pessoas, precisando da presença dela. Os dois acelerando. Está se virando movendo mais rápido e dormindo menos. A paciência ficou mais fina. A alegria ainda está, mas por baixo corre: não sei por quanto tempo consigo sustentar isso. Ainda não está em burnout. Está na estação que vem antes disso. Uma oportunidade acabou de surgir: um cargo de liderança que ia moldar a trajetória dela. Exige presença e ritmo. Ela tem um filho de sete anos com ansiedade de separação e uma de três que acabou de começar a pré-escola. Tudo de uma vez.",
    "question": "Qual é a decisão real de Keisha, e o que acontece se ela pausar pra avaliar?"
  },
  "m4": { "question": "Conforme respondia, você estava mais consciente do que está construindo ou do que isso está custando? Qual estava mais presente?", "instruction": "Uma frase basta. Nomeie pra onde sua atenção foi de fato — não pra onde queria que fosse." },
  "m3_1": {
    "context": "",
    "question": "Quando construção está acontecendo e vertigem está presente, você interpreta a vertigem como sinal pra parar (algo está errado) ou sinal pra continuar (crescimento desconforta)?",
    "pole_left": "Vertigem como Aviso", "pole_right": "Vertigem como Crescimento"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Aceito — o crescimento vale o custo.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"B","text":"Examino como seria consolidar — do que essa construção precisa de mim antes de eu adicionar mais?","followup":"Como seria dizer não em nome do que já está aqui?","followup_type":"question"},
      {"key":"C","text":"Aceito mas renegocio o cronograma — começo mais devagar, em fases.","followup":"O que precisaria pra você ir em velocidade total?","followup_type":"question"},
      {"key":"D","text":"Aceito mas digo às pessoas que estou no limite — torno os limites públicos enquanto sigo.","followup":"O que muda quando os outros sabem das suas bordas?","followup_type":"question"}
    ],
    "scenario": "Você está no meio de construir. A vertigem é real — você sente. E tem uma oportunidade real na sua frente: algo que amplificaria o que está construindo, mas aumentaria o ritmo e a pressão agora. Tem que escolher: aceita ou protege o que já está gerenciando?"
  },
  "m3_3": {
    "q1": "Lembre de um momento em que teve que escolher entre manter momentum e criar pausa enquanto construía algo real. O que escolheu, e o que estava em jogo?",
    "q2": "O que tornou possível fazer essa escolha? Tinha apoio, clareza, confiança em algo, ou só teve que agir sem isso?",
    "scoring_note": "",
    "q_transversal": "Quando você escolheu momentum ou pausa — a qualidade dessa escolha foi suficiente, ou você só foi no padrão?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PVI', 1, 'pt-BR', 'V3', $JSON${
  "m1": { "phrase": "Algo está crescendo. O ritmo do crescimento traz tontura. Os dois estão acontecendo ao mesmo tempo.", "tension_label": "Movimento ↔ Pausa" },
  "m2": {
    "scene": "Malcolm, 48, passou quinze anos construindo reputação na área dele. Agora está construindo algo novo — um tipo diferente de trabalho, mais alinhado, com mais em jogo porque é mais verdadeiro. O novo está ganhando tração. O antigo ainda chama. Está construindo o novo mantendo parte do antigo, o que significa que nunca está plenamente dentro de nenhum dos dois. Move-se entre eles, e o movimento em si virou a velocidade padrão dele. A filha adulta perguntou mês passado: 'Pai, você senta às vezes?' Ele riu, mas pegou. Está construindo algo que importa pra ele. O ritmo da construção está custando algo que ele só agora está começando a nomear. Um nome forte da área dele acabou de pedir colaboração num projeto visível — essa é a validação que ele queria há dois anos. O timing é quando ele já está no limite.",
    "question": "Do que Malcolm tem medo se desacelerar, e do que tem medo se não desacelerar?"
  },
  "m4": { "question": "Se você tivesse que escolher uma palavra pro que está carregando agora — o peso de construir — qual seria? E essa palavra é uma queixa ou uma descrição?", "instruction": "A palavra, e depois uma frase: é queixa ou descrição? A distinção importa." },
  "m3_1": {
    "context": "",
    "question": "Em fases em que você está construindo algo real, prioriza proteger o ritmo da construção (mover mais rápido, fazer mais) ou proteger sua capacidade de estar presente (desacelerar, ser deliberado)?",
    "pole_left": "Proteger Ritmo", "pole_right": "Proteger Presença"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Continuo como está — a resposta é em direção a algo, confio nisso.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"B","text":"Examino o custo honestamente — não pra parar, mas pra saber o que estou de fato escolhendo.","followup":"Do que precisaria pra ficar nesse ritmo de olhos abertos?","followup_type":"question"},
      {"key":"C","text":"Mudo algo estrutural — acho um jeito de desacelerar o ritmo mantendo o movimento pra frente.","followup":"O que precisaria estar diferente em como você trabalha pra fazer isso?","followup_type":"question"},
      {"key":"D","text":"Trago pra fora — conto pras pessoas afetadas pelo seu ritmo que você está questionando.","followup":"O que elas te diriam se você perguntasse?","followup_type":"question"}
    ],
    "scenario": "Você está construindo algo real. E está se movendo mais rápido do que pensava. O momentum é genuíno — não é forçado. Mas o custo também é: menos sono, menos espaço, menos conexão com pessoas que importam. Ainda não está em burnout, mas vê a direção. E hoje, algo dentro está perguntando: você está correndo em direção a algo ou fugindo de algo?"
  },
  "m3_3": {
    "q1": "Lembre de uma vez específica em que estava construindo algo significativo e percebeu que estava num ritmo que estava te custando. O que estava construindo, e qual era o custo?",
    "q2": "O que te deixou consciente do custo? Sinal físico, feedback de alguém, sua própria reflexão? O que precisaria acontecer pra você agir nessa consciência?",
    "scoring_note": "",
    "q_transversal": "No ritmo em que estava — a qualidade do seu trabalho atendia seu próprio padrão, ou você estava cortando atalhos que não queria?"
  }
}$JSON$::jsonb);

INSERT INTO public.pill_content_variations (pill_id, ipe_level, locale, variation_key, content)
VALUES ('PVI', 1, 'pt-BR', 'V4', $JSON${
  "m1": { "phrase": "O movimento em si é o ponto. O chão sob ele também. Estou descobrindo como ficar de pé enquanto construo.", "tension_label": "Movimento ↔ Pausa" },
  "m2": {
    "scene": "Sophia, 41, saiu do corporativo há dois anos para construir algo seu. Está funcionando — não famosa, não rica, mas viva e relevante. O ritmo exigido está lhe ensinando coisas que ela nunca soube. Está descobrindo que consegue segurar complexidade, lidar com incerteza, manter a calma na vertigem. Também está esquecendo o que é tédio, o que é uma manhã sem propósito. Está construindo um momentum que parece essencial. Mas por baixo há uma pergunta que ela não fez: o que estou evitando ao continuar em movimento? Tem um fundo de sabático intocado. Um mentor se ofereceu para ajudá-la a pensar em sistemas sustentáveis. Ela continua dizendo sim ao ritmo e não ao descanso, sem entender por quê.",
    "question": "O que Sophia está construindo, e do que a vertigem está protegendo ela?"
  },
  "m4": { "question": "Algo em você quer continuar. Outra coisa em você quer parar e olhar em volta. Agora, qual voz está mais alta — e em qual delas você confia mais?", "instruction": "Nomeie as duas em uma frase. Depois, em mais uma linha, diga em qual confia mais e por quê." },
  "m3_1": {
    "context": "",
    "question": "Quando algo que você construiu está funcionando, mas o custo para você está visível, você tende mais a escalar (crescer mais rápido, reinvestir momentum) ou a estabilizar (manter sustentável, criar margens)?",
    "pole_left": "Escalar", "pole_right": "Estabilizar"
  },
  "m3_2": {
    "framing": "O que você abre mão — e quem mais sente?",
    "options": [
      {"key":"A","text":"Fico com a percepção — entendo o que a pressão está realmente pedindo de mim antes de responder.","followup":"O que mudaria se você respondesse à pressão em vez de alimentá-la?","followup_type":"question"},
      {"key":"B","text":"Pauso intencionalmente — tiro tempo real pra examinar o que está por baixo do movimento.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"},
      {"key":"C","text":"Acelero ainda mais — dobro a aposta no que está funcionando antes que algo mude.","followup":"Do que você tem medo que aconteça se não fizer isso?","followup_type":"question"},
      {"key":"D","text":"Continuo me movendo — o ritmo é o que mantém isso vivo.","followup":"O que você abre mão — e quem mais sente?","followup_type":"cost"}
    ],
    "scenario": "Você está construindo isso há um tempo. Está vivo. Importa. E há um tipo específico de pressão por baixo que você está começando a notar — não vinda de obstáculos, mas do ritmo. Da escolha. Do fato de que você poderia desacelerar mas não desacelerou. Do fato de que pausar parece perigoso. Você está no momento de notar isso."
  },
  "m3_3": {
    "q1": "Me conta de uma vez em que você construiu algo enquanto mantinha estabilidade ou presença suficiente no resto da sua vida. O que estava construindo, e o que te impediu de cair em puro ritmo?",
    "q2": "O que te protegeu — um limite, uma relação, um ritmo, uma crença? O que aconteceria se essa proteção não estivesse lá?",
    "scoring_note": "",
    "q_transversal": "O que protegeu a qualidade do que você construiu do ritmo de construção?"
  }
}$JSON$::jsonb);

COMMIT;

-- ============================================================
-- Validação pós-aplicação:
-- SELECT pill_id, variation_key, locale, content->'m1'->>'tension_label' AS tension
-- FROM pill_content_variations
-- WHERE locale='pt-BR'
-- ORDER BY pill_id, variation_key;
-- Esperado: 24 rows.
-- ============================================================
