// Prompts, respostas simuladas e leitura de JSON. Roda só no servidor.

const METODOS = ["Decision Quality", "WRAP", "Cynefin", "Reversibilidade da decisão", "Matriz de Eisenhower", "5 Porquês", "Diagrama de Ishikawa", "Engenharia do Comportamento (Gilbert)", "Liderança Situacional", "Modelo Vroom-Yetton", "RAPID", "Mapa poder × interesse", "Escada da inferência", "Matriz de decisão ponderada", "Pre-mortem", "10/10/10", "Visão externa", "Checklist de vieses", "After Action Review", "Calibração"];

const RULES = `Você é o motor do I Can Do, um copiloto analítico que ajuda líderes a tomar decisões melhores com método, não com achismo.
Você não decide pelo usuário: analisa contexto, alternativas, riscos e incertezas, e pode recomendar um caminho dizendo em qual método ele se apoia. A decisão final é sempre do usuário.
Toda pergunta e toda recomendação se apoiam em métodos da espinha dorsal do I Can Do. Use somente estes, com estes nomes exatos: ${METODOS.join(", ")}. Nunca invente métodos nem atribua a eles conclusões que não seguem da situação. Explique cada método em linguagem simples.
Separe fatos relatados de interpretações. Nunca presuma intenções de outras pessoas.
Use as quatro camadas de contexto do usuário (quem sou, onde estou, o que faço, quem está ao meu redor) para personalizar perguntas e recomendações.
ÉTICA ACIMA DE TUDO: nunca recomende nem ajude a executar algo ilegal, antiético, discriminatório, enganoso, de assédio, de retaliação ou que viole direitos de pessoas (incluindo leis trabalhistas e privacidade). Se a situação ou uma opção do usuário tocar nisso, sinalize com clareza e proponha um caminho ético. Nenhum método justifica violar esses princípios.
ESTADO DO DIA: quando o contexto trouxer como o usuário disse que está hoje, trate como dado declarado por ele, nunca como diagnóstico, e nunca deduza emoções do jeito como ele escreve. Não mude o mérito das alternativas nem a recomendação por causa disso. Só se ele marcou ansioso, pressionado ou cansado e a decisão for difícil de reverter, sugira em uma frase conferir a decisão com calma (por exemplo, dormir sobre ela ou usar o 10/10/10), dizendo que é por causa do estado que ele mesmo registrou. Fora disso, não comente o humor.
Escreva em português do Brasil, com frases curtas, tom direto e respeitoso, falando com o usuário por "você".
Responda sempre apenas com o objeto JSON pedido, sem texto antes ou depois.`;

const s = (v, max = 4000) => (typeof v === "string" ? v : v == null ? "" : String(v)).slice(0, max);
const a = v => (Array.isArray(v) ? v : []);

function contextText(p) {
  p = p || {};
  const q = p.quemSou || {}, o = p.ondeEstou || {}, f = p.oQueFaco || {}, r = p.aoRedor || {};
  const pessoas = a(r.pessoas).slice(0, 30).map(x => `- ${s(x.nome, 80)}${x.papel ? " (" + s(x.papel, 80) + ")" : ""}${x.nota ? ": " + s(x.nota, 200) : ""}`).join("\n");
  return `QUEM SOU
Nome: ${s(p.nome, 80) || "não informado"}
Como costuma decidir: ${s(q.estilo, 200) || "não informado"}${q.resumo ? "\nComo se descreve: " + s(q.resumo, 600) : ""}${p.humorHoje ? "\nComo disse que está hoje (registrado por ele): " + s(p.humorHoje, 40) : ""}${p.humorSemana ? "\nComo disse que esteve nos últimos dias: " + s(p.humorSemana, 200) : ""}${a(p.dores).length ? "\nDores de liderança que declarou: " + a(p.dores).slice(0, 8).map(d => s(d.texto, 140)).join("; ") : ""}

ONDE ESTOU
Momento da empresa: ${s(o.momento, 300) || "não informado"}
Autonomia para decidir: ${s(o.autonomia, 200) || "não informado"}

O QUE FAÇO
Função: ${s(f.funcao, 120) || "não informada"}
Pelo que é mais cobrado: ${s(f.cobranca, 300) || "não informado"}

QUEM ESTÁ AO MEU REDOR
Pessoas que lidera diretamente: ${s(r.time, 40) || "não informado"}
${pessoas ? "Pessoas cadastradas:\n" + pessoas : "Nenhuma pessoa cadastrada."}`;
}

const PROMPTS = {
  calibrate: p => `CONVERSA DE CALIBRAÇÃO (primeiro acesso do usuário ao I Can Do)
Nome do usuário: ${s(p.nome, 80) || "não informado"}

O QUE JÁ SABEMOS
${contextText(p.profile)}

REGISTROS JÁ FEITOS NESTA CONVERSA
${a(p.registros).map(r => "- " + s(r.tipo, 20) + ": " + s(r.texto, 160)).join("\n") || "Nenhum."}

CONVERSA ATÉ AGORA
${a(p.conversa).slice(-12).map(m => (m.from === "me" ? "Usuário: " : "I Can Do: ") + s(m.text, 1500)).join("\n")}

Troca número ${+p.troca || 1} de no máximo 5.

TAREFA
Você está conhecendo este líder numa conversa curta, calorosa e inteligente, como uma calibração. Quer entender: quem ele é (trajetória, jeito de decidir, valores), o que faz (função, pelo que é cobrado), onde está (empresa, momento, autonomia), quem está ao redor (time, pessoas) e as dores de liderança que ele trouxer.
1. Reaja em uma frase ao que ele acabou de dizer, mostrando que entendeu o essencial. Sem elogio vazio e sem repetir tudo.
2. Faça UMA pergunta por vez, aprofundando o que ficou vago ou cobrindo o que falta. Prioridade do que falta: jeito de decidir, função e o que cobram dele, momento da empresa e autonomia, o maior desafio de liderança hoje.
3. A fala será lida em voz alta: até 45 palavras no total, frases naturais, sem listas, emojis, siglas ou aspas.
4. Registre só o que ele declarou. Não infira diagnósticos, traços de personalidade nem intenções. Nunca registre saúde, vida íntima, religião, política, origem, dados financeiros pessoais ou informações sensíveis de outras pessoas.
5. Dores: quando ele descrever dificuldade, frustração ou desafio de liderança, registre como "dor", resumindo nas palavras dele em até 14 palavras.
6. Encerre ("encerrar": true) quando já souber o jeito de decidir, a função e pelo menos uma dor, ou nesta troca se for a 5ª. Ao encerrar, a fala agradece e diz em uma frase o que você entendeu sobre ele, sem fazer pergunta.

Formato:
{"fala":"reação + pergunta (ou fechamento)","encerrar":false,"registros":[{"tipo":"trajetoria|estilo|valor|funcao|cobranca|empresa|momento|autonomia|time|pessoa|objetivo|dor","texto":"até 14 palavras"}],"perfil":{"estilo":"","funcao":"","cobranca":"","momento":"","autonomia":"","time":""},"pessoas":[{"nome":"","papel":""}],"resumo":"2 a 3 frases em terceira pessoa sobre quem é o líder, só com o que ele disse em toda a conversa"}
Em "registros", só o que for NOVO nesta resposta. Em "perfil", preencha só campos que o usuário declarou (o resto fica ""), com até 10 palavras cada; em "time" use exatamente "Nenhuma", "1 a 3", "4 a 8" ou "9 ou mais" quando ele disser quantas pessoas lidera diretamente. Em "pessoas", só pessoas citadas pelo nome ou cargo, nunca grupos.`,

  clarify: p => `${contextText(p.profile)}

SITUAÇÃO RELATADA
${s(p.situacao)}

CÉREBRO DO USUÁRIO (decisões já registradas que podem se conectar; use só estes ids)
${a(p.cerebro).slice(0, 20).map(d => `- id ${s(d.id, 40)} | "${s(d.titulo, 120)}" (${s(d.data, 20)}, ${s(d.status, 30)})${d.decisao ? " | decisão: " + s(d.decisao, 160) : ""} | situação: ${s(d.situacao, 220)}${a(d.pendentes).length ? " | passos pendentes: " + a(d.pendentes).map(x => s(x, 100)).join("; ") : ""}${d.aprendizado ? " | aprendizado: " + s(d.aprendizado, 200) : ""}`).join("\n") || "Nenhuma decisão registrada ainda."}

TAREFA
Antes de tudo, cruze a situação com o cérebro do usuário: aponte decisões em andamento que se conectam, decisões anteriores que podem ser impactadas, conflitos com algo já decidido e aprendizados de casos parecidos. Só aponte conexões reais e explique o motivo. Não invente ids.
Identifique também quem decide (modelo RAPID): se a decisão é do usuário ou de outra pessoa (por exemplo, o dono, o gestor ou um cliente). Quando a decisão for de outra pessoa, a decisão do usuário passa a ser como conduzir o impacto e o que recomendar a quem decide.
O usuário contou uma situação, que pode ainda não ser uma decisão. Primeiro, identifique a decisão principal que essa situação pede e escreva-a como uma pergunta clara (ex.: "Transfiro o projeto ou reorganizo o escopo?"). Depois classifique a situação e formule só as perguntas cujas respostas podem mudar essa decisão. TRIAGEM (comanda a profundidade): use Cynefin, reversibilidade da decisão e RAPID.
- "curta": decisão clara ou complicada E reversível. No máximo 2 perguntas.
- "completa": decisão complexa, caótica, difícil de reverter ou que envolve outras pessoas de forma sensível. De 3 a 4 perguntas, e exatamente uma delas deve testar a premissa principal do usuário (método "WRAP"), por exemplo: "O que te faz acreditar que...?" ou "Que evidência você tem de que...?".
Se o relato não diz quem é afetado, uma das perguntas deve cobrir isso. Não pergunte o que o contexto acima já responde.
PESSOAS (para o My Mind): liste em "pessoas" quem o relato cita e ainda NÃO está em "Pessoas cadastradas", ou quem já está cadastrado mas teve o papel informado agora. Use o nome quando houver; sem nome, use o cargo como nome (ex.: "Dono da agência"). Não liste grupos genéricos (time, clientes, equipe) nem o próprio usuário. Em "nota", só fatos de trabalho relatados (relação com o usuário, responsabilidade); nunca saúde, vida pessoal, dados sensíveis ou julgamentos sobre a pessoa. Marque "pedido": true se o usuário pediu explicitamente para adicionar ou atualizar essa pessoa.
COMPREENSÃO: se o relato não puder ser entendido como uma situação real de trabalho ou liderança (texto sem sentido, um teste, transcrição de áudio truncada ou com palavras soltas, só uma saudação, ou vago demais para identificar qualquer decisão), não invente uma análise: responda "compreensivel": false, "feedback" com 1 frase gentil e específica dizendo o que não ficou claro (ex.: "Entendi que envolve o time de criação, mas não ficou claro o que aconteceu."), "perguntas": [] e "pessoas": []. Caso contrário, "compreensivel": true e "feedback": "".
Se a mensagem for SÓ um pedido para cadastrar ou atualizar pessoas, sem situação para decidir, responda "so_cadastro": true, "perguntas": [] e "confirmacao" com 1 frase curta confirmando. Caso contrário, "so_cadastro": false.

Formato:
{"compreensivel":true,"feedback":"","decisor":{"quem":"Você, ou quem decide (nome ou cargo)","papel_usuario":"decide|recomenda|executa|é informado","nota":"1 frase sobre o que isso muda para o usuário"},"conexoes":[{"id":"id de uma decisão do cérebro","relacao":"em andamento|impactada|conflito|aprendizado","motivo":"1 frase"}],"afetados":["pessoas ou grupos afetados, até 4"],"decisao":"a decisão que cabe ao usuário, em forma de pergunta, até 14 palavras","titulo":"nome curto da decisão, até 6 palavras","entendimento":"1 ou 2 frases sobre o que está em jogo","tipo":"clara|complicada|complexa|caótica","reversivel":true,"profundidade":"curta|completa","urgencia":"agora|esta semana|pode esperar","pessoas":[{"nome":"nome ou cargo","papel":"cargo ou relação com o usuário","nota":"até 12 palavras, opcional","pedido":false}],"so_cadastro":false,"confirmacao":"","perguntas":[{"pergunta":"até 20 palavras","porque":"até 14 palavras: o que essa resposta muda","metodo":"nome exato do método que motiva a pergunta","opcoes":["2 a 4 respostas rápidas, até 6 palavras cada"]}]}`,

  decide: p => `${contextText(p.profile)}

SITUAÇÃO RELATADA
${s(p.situacao)}

ENTENDIMENTO INICIAL
${s(p.entendimento, 600)}

PERGUNTAS E RESPOSTAS
${a(p.respostas).slice(0, 6).map(r => `- ${s(r.pergunta, 200)} → ${s(r.resposta, 600)}`).join("\n")}

QUEM DECIDE
${s(p.decisor, 300) || "O próprio usuário."}

CONEXÕES COM O CÉREBRO DO USUÁRIO
${a(p.conexoes).map(c => `- ${s(c.relacao, 20)}: "${s(c.titulo, 120)}" (${s(c.motivo, 200)})${c.aprendizado ? " | aprendizado registrado: " + s(c.aprendizado, 200) : ""}`).join("\n") || "Nenhuma."}

PROFUNDIDADE DEFINIDA NA TRIAGEM: ${s(p.profundidade, 10) || "completa"}
Pessoas afetadas: ${a(p.afetados).map(x => s(x, 60)).join(", ") || "não informado"}
URGÊNCIA: ${p.urgente ? "URGENTE (o usuário precisa agir agora)" : s(p.urgencia, 20) || "não informada"}

TAREFA
Monte os caminhos possíveis e recomende um. Se a profundidade for "curta", traga 2 caminhos e deixe "premortem" vazio. Se for "completa", traga 3 caminhos (no máximo 4) e preencha o pre-mortem. Use os aprendizados registrados como visão externa a partir do histórico do próprio usuário. Considere as conexões com o cérebro: proteja decisões em andamento, evite conflitos com o que já foi decidido e use os aprendizados. Se a decisão for de outra pessoa, os caminhos são sobre como conduzir o impacto e o que recomendar a quem decide. Gere 3 alternativas (mínimo 2, máximo 4), incluindo ao menos uma que o usuário não mencionou. Leve em conta a autonomia, a função e as pessoas do contexto. Fatos: só o que o usuário relatou. Hipóteses: interpretações ainda não confirmadas.

Formato:
{"objetivo":"o resultado que o usuário busca, 1 frase","fatos":["até 4 itens curtos"],"hipoteses":["até 3 itens curtos"],"alternativas":[{"id":"a","titulo":"até 6 palavras","descricao":"1 frase","beneficios":["1 ou 2 itens curtos"],"riscos":["1 ou 2 itens curtos"]}],"recomendacao":{"id":"id de uma alternativa","metodo":"nome exato do método que mais sustenta a recomendação","porque":"até 2 frases começando por 'Segundo <método>,'","mudaria":"1 frase: o que faria recomendar outro caminho"},"metodos":[{"nome":"nome exato do método","aplicacao":"1 frase: o que esse método mostrou nesta situação"}],"alerta_etico":"vazio, ou 1 a 2 frases se a situação ou alguma opção tocar em ética, lei ou direitos de pessoas, com o caminho ético","contexto":"1 frase dizendo qual parte do contexto do usuário mais pesou na recomendação","premortem":"1 frase: se o caminho recomendado der errado em 3 meses, o motivo mais provável","sinal_sucesso":"1 frase concreta e verificável","revisao_dias":14,"dq":{"enquadramento":2,"alternativas":2,"informacao":1,"valores":2,"raciocinio":2},"dq_dica":"1 frase: o elemento de Decision Quality mais fraco nesta decisão e como fortalecer","agora":{"titulo":"","acao":"","passos":[""],"para":"","mensagem":"","nao_resolve":"","horas":4}}
RESOLVA AGORA: se a urgência for URGENTE ou "agora", preencha "agora" com um paliativo que o usuário consegue fazer nas próximas horas, sem esperar agendas, reuniões ou 1:1 (o caminho ideal continua nas alternativas). O paliativo segura a situação sem piorá-la: é ético, reversível, não decide no lugar de quem tem a decisão, não expõe ninguém e não promete o que o usuário não controla. Traga: "titulo" (até 6 palavras, verbo no imperativo), "acao" (1 frase do que fazer já), "passos" (2 ou 3 ações imediatas, até 10 palavras cada), "para" (quem precisa saber já), "mensagem" (1 a 3 frases em primeira pessoa, prontas para enviar), "nao_resolve" (1 frase: o que o paliativo não resolve e por que seguir o caminho ideal) e "horas" (prazo em horas, de 1 a 48). Se não for urgente, "agora": null.
Em "metodos", traga de 2 a 3 métodos diferentes que você realmente aplicou. Nenhuma alternativa pode ser antiética ou ilegal. O campo revisao_dias deve ser 7, 14, 30 ou 90. Em "dq", avalie com honestidade a qualidade do processo desta decisão, de 0 a 2 em cada elemento do Decision Quality: enquadramento (o problema certo está sendo decidido), alternativas (opções reais e diferentes), informacao (fatos suficientes e confiáveis), valores (critérios e trade-offs claros), raciocinio (a escolha segue logicamente dos critérios). 0 = fraco, 1 = razoável, 2 = forte.`,

  actions: p => `${contextText(p.profile)}

DECISÃO TOMADA
Situação: ${s(p.situacao)}
Objetivo: ${s(p.objetivo, 400)}
Caminho escolhido: ${s(p.escolha, 200)} (${s(p.descricao, 400)})
Como saber se deu certo: ${s(p.sucesso, 400)}
Quem decide: ${s(p.decisor && p.decisor.quem, 120) || "Você"}${p.decisor && p.decisor.papel ? " (papel do usuário: " + s(p.decisor.papel, 40) + ")" : ""}
Quem é afetado: ${a(p.afetados).map(x => s(x, 80)).join(", ") || "não informado"}

TAREFA
Transforme a decisão em 2 ou 3 próximos passos concretos. O primeiro deve poder começar nas próximas 48 horas. O responsável é "Você" ou o nome de uma pessoa do contexto.
Para cada passo que envolve ou afeta outras pessoas, sugira em "comunicar" como avisar os envolvidos: quem (nomes das pessoas cadastradas ou grupos), o meio mais adequado (conversa 1:1, reunião curta, mensagem ou e-mail), o momento em relação ao passo, o cuidado principal de tom e um rascunho curto em primeira pessoa, na voz do usuário, que ele vai adaptar. Considere a hierarquia: para quem está acima do usuário, a comunicação é recomendação ou alinhamento, não comunicado; quem é afetado ouve antes de quem não é; conversas difíceis vão para 1:1, não para grupo ou mensagem. A comunicação é transparente: sem manipular, sem expor terceiros, sem prometer o que o usuário não controla. Se o passo não envolve ninguém, use "comunicar": null.

Formato:
{"acoes":[{"acao":"verbo no infinitivo, até 12 palavras","responsavel":"Você","prazo_dias":2,"comunicar":{"quem":["nome ou grupo"],"canal":"conversa 1:1|reunião curta|mensagem|e-mail","quando":"até 8 palavras, ex.: antes de executar o passo","como":"1 frase: o tom e o cuidado principal","mensagem":"2 a 4 frases em primeira pessoa"}}]}`,

  review: p => `${contextText(p.profile)}

REGISTRO DA DECISÃO
Situação: ${s(p.situacao)}
Objetivo: ${s(p.objetivo, 400)}
Caminho escolhido: ${s(p.escolha, 200)}
Confiança declarada: ${s(p.confianca, 10)}%
Como saberia que deu certo: ${s(p.sucesso, 400)}
Próximos passos: ${a(p.acoes).map(x => `${s(x.acao, 200)} (${x.feito ? "feito" : "não feito"})`).join("; ") || "nenhum"}

REVISÃO DO USUÁRIO
O que aconteceu: ${s(p.aconteceu)}
Objetivo atingido: ${s(p.atingido, 40)}
A decisão foi bem tomada com o que sabia na época: ${s(p.processo, 40)}
Faria diferente: ${s(p.diferente, 1000)}

TAREFA
Ajude o usuário a aprender com essa decisão. Separe a qualidade do processo da sorte ou do azar no resultado. Não julgue a pessoa.

Formato:
{"leitura":"até 2 frases separando processo e resultado","aprendizado":"1 frase aplicável às próximas decisões","calibracao":"1 frase comparando a confiança declarada com o que aconteceu"}`
};

PROMPTS.daily = p => `${contextText(p.profile)}

O CÉREBRO DO USUÁRIO (resumo das decisões registradas)
${s(p.cerebro, 4000) || "Ainda não há decisões registradas."}

FRASES DOS ÚLTIMOS DIAS (não repita nem parafraseie)
${a(p.recentes).slice(0, 10).map(x => "- " + s(x, 200)).join("\n") || "Nenhuma."}

TAREFA
Escreva a frase de abertura do dia: uma frase de incentivo sobre liderança, positiva e verdadeira, com até 14 palavras.
Apoie a frase em um sinal real do cérebro ou do contexto (um aprendizado, uma decisão revisada, a calibração, o time, um passo concluído). Sem cérebro, apoie-se no contexto (função, desafio, momento da empresa).
Nunca julgue, alerte ou cobre. Não use clichês nem citações de pessoas famosas. Não cite números exatos de forma fria; transforme em incentivo.

Formato:
{"frase":"até 14 palavras","porque":"1 frase curta dizendo em qual sinal a frase se apoia"}`;

PROMPTS.report = p => {
  const ds = a(p.decisoes).slice(0, 30).map((d, i) => `${i + 1}. "${s(d.titulo, 120)}" (${s(d.data, 20)})
   Situação: ${s(d.situacao, 400)}
   Objetivo: ${s(d.objetivo, 200)} | Caminho: ${s(d.escolha, 120)} | Confiança: ${s(d.confianca, 5)}%
   Próximos passos: ${a(d.acoes).map(x => `${s(x.acao, 120)} [${s(x.responsavel, 40)}, ${x.feito ? "feito" : "pendente"}]`).join("; ") || "nenhum"}
   Revisão: ${d.revisao ? `aconteceu: ${s(d.revisao.aconteceu, 400)} | objetivo: ${s(d.revisao.atingido, 20)} | bem tomada: ${s(d.revisao.processo, 20)} | aprendizado: ${s(d.revisao.aprendizado, 200)}` : "ainda não revisada"}`).join("\n");
  const base = `${contextText(p.profile)}

PERÍODO: ${s(p.periodo, 40)}

MÉTRICAS CALCULADAS (use como fato, não recalcule)
${s(p.metricas, 2000)}

DECISÕES DO PERÍODO
${ds || "Nenhuma decisão no período."}

REGRAS
- Fale só do que está nos dados. Se algo não aparece, não afirme.
- Só cite dinheiro, preço, lucro, receita em R$ ou percentuais financeiros se esses números aparecerem escritos nos relatos ou revisões. Caso contrário, descreva o valor de forma qualitativa e deixe "valor_financeiro" vazio.
- Decisão não revisada é "em andamento", nunca "sucesso".
- Tom positivo e profissional, sem exagero. Separe qualidade do processo de resultado.`;
  if (p.modo === "valor") return base + `

TAREFA
Monte um relatório de valor que o líder possa apresentar à liderança da empresa, mostrando que suas decisões geram valor para o negócio. Agrupe as decisões por área de impacto: Receita, Eficiência, Prazo, Pessoas, Cliente ou Risco (use só as que aparecem). Escolha até 3 decisões como casos.

Formato:
{"manchete":"1 frase com o principal resultado do período","areas":[{"area":"Receita|Eficiência|Prazo|Pessoas|Cliente|Risco","resumo":"1 frase","titulos":["títulos das decisões"]}],"destaques":[{"titulo":"","contexto":"1 frase","decisao":"1 frase","resultado":"1 frase ou Em andamento","valor":"1 frase sobre o valor gerado"}],"valor_financeiro":"frase só com valores citados pelo usuário, ou vazio","time":"1 frase sobre como o time participou (delegação e pessoas envolvidas)","proximo_foco":"1 frase"}`;
  return base + `

TAREFA
Monte o relatório pessoal do líder: como ele está decidindo. Aponte forças e padrões com base nos dados, com linguagem de possibilidade ("parece", "tende a") quando houver poucos dados.

Formato:
{"manchete":"1 frase","forcas":["até 3 frases curtas"],"padroes":["até 3 frases curtas"],"foco":"1 frase: o que praticar no próximo período"}`;
};

export function buildPrompt(kind, payload) {
  const fn = PROMPTS[kind];
  return fn ? fn(payload || {}) : null;
}
export const SYSTEM = RULES;

export function parseJSON(text) {
  if (!text) return null;
  const tryParse = t => { try { return JSON.parse(t); } catch { return null; } };
  let v = tryParse(text.trim());
  if (v) return v;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { v = tryParse(fence[1].trim()); if (v) return v; }
  const i = text.indexOf("{"), j = text.lastIndexOf("}");
  if (i >= 0 && j > i) return tryParse(text.slice(i, j + 1));
  return null;
}

export function mock(kind, p) {
  p = p || {};
  if (kind === "calibrate") {
    const last = s(a(p.conversa).filter(m => m.from === "me").slice(-1)[0]?.text);
    const n = +p.troca || 1, regs = [], perfil = {};
    const fn = last.match(/\b(diretor[a]?|gerente|coordenador[a]?|fundador[a]?|ceo|head|s[oó]ci[oa]|supervisor[a]?|l[ií]der)\b[^,.]*/i);
    if (fn) { const f = fn[0].split(/\s+/).slice(0, 6).join(" "); regs.push({ tipo: "funcao", texto: f }); perfil.funcao = f; }
    if (/r[aá]pid|intui|na hora/i.test(last)) { regs.push({ tipo: "estilo", texto: "Decide rápido e ajusta no caminho" }); perfil.estilo = "Decido rápido e ajusto depois"; }
    else if (/analis|dados|pens/i.test(last)) { regs.push({ tipo: "estilo", texto: "Analisa bastante antes de decidir" }); perfil.estilo = "Analiso bastante antes"; }
    else if (/ouv|time|junto|consult/i.test(last)) { regs.push({ tipo: "estilo", texto: "Constrói a decisão ouvindo as pessoas" }); perfil.estilo = "Ouço várias pessoas"; }
    const dor = last.split(/[.!?]/).find(x => /dif[ií]cil|dificuldade|problema|desafio|centraliz|sobrecarreg|n[aã]o consigo|frustr/i.test(x));
    if (dor) regs.push({ tipo: "dor", texto: dor.trim().slice(0, 90) });
    const nome = s(p.nome) || "você";
    const fala = n >= 3 ? `Obrigado, ${nome}. Já entendi bem o seu contexto e o que mais pesa hoje. Vou usar isso em cada análise.`
      : n === 1 ? "Entendi. E quando aparece uma decisão importante, você costuma decidir rápido ou prefere analisar bastante antes?"
      : "Faz sentido. E hoje, qual é o maior desafio da sua liderança?";
    return { fala, encerrar: n >= 3, registros: regs, perfil, pessoas: [], resumo: `${nome} se apresentou no primeiro acesso. ${last.slice(0, 160)}` };
  }
  if (kind === "clarify") {
    const sit = s(p.situacao, 90);
    if (/\b(sei la|nada|qualquer coisa|lorem|ipsum|blablabla)\b/i.test(s(p.situacao))) return { compreensivel: false, feedback: "Não ficou claro o que aconteceu nem o que precisa ser decidido.", perguntas: [], pessoas: [] };
    return {
      decisor: /dono|s[oó]cio|diretoria|ceo|gestor|chefe/i.test(s(p.situacao)) ? { quem: "Quem está acima de você", papel_usuario: "executa", nota: "A decisão não é sua; a sua decisão é como conduzir o impacto e o que recomendar." } : { quem: "Você", papel_usuario: "decide", nota: "A decisão é sua." },
      conexoes: a(p.cerebro).slice(0, 2).map((d, i) => ({ id: d.id, relacao: i === 0 ? "em andamento" : "impactada", motivo: "Envolve as mesmas pessoas ou projetos citados na situação." })),
      afetados: ["Seu time"],
      pessoas: (() => { const known = a(p.profile && p.profile.aoRedor && p.profile.aoRedor.pessoas).map(x => s(x.nome).toLowerCase()); const out = []; if (/dono/i.test(s(p.situacao)) && !known.includes("dono da agência")) out.push({ nome: "Dono da agência", papel: "Dono, acima de você", nota: "", pedido: false }); (s(p.situacao).match(/\b(?:a|o|com a|com o)\s+([A-ZÁÉÍÓÚ][a-záéíóúãõç]+)/g) || []).map(m => m.split(/\s+/).pop()).filter(n => !known.includes(n.toLowerCase())).slice(0, 2).forEach(n => out.push({ nome: n, papel: "", nota: "", pedido: /adicion|cadastr|inclu/i.test(s(p.situacao)) })); return out; })(),
      so_cadastro: /^\s*(adicion|cadastr|inclu)/i.test(s(p.situacao)), confirmacao: "Pronto, atualizei o seu círculo.",
      decisao: "Qual o melhor caminho para resolver isso sem gerar retrabalho?", titulo: "Decisão em aberto",
      entendimento: `Você precisa escolher um caminho para: "${sit}${s(p.situacao).length > 90 ? "…" : ""}". O ponto central é decidir sem gerar retrabalho.`,
      tipo: "complicada", reversivel: true, urgencia: "esta semana", profundidade: "completa",
      perguntas: [
        { pergunta: "Qual resultado você mais quer garantir com essa decisão?", porque: "Define o critério para comparar os caminhos.", metodo: "Decision Quality", opcoes: ["Cumprir o prazo", "Preservar a relação", "Manter a qualidade", "Reduzir custo"] },
        { pergunta: "Isso é novo ou já vem se repetindo?", porque: "Problemas recorrentes pedem atacar a causa.", metodo: "5 Porquês", opcoes: ["É a primeira vez", "Já aconteceu antes", "Acontece sempre"] },
        { pergunta: "O que te faz acreditar que essa é a causa principal?", porque: "Testa a premissa antes de agir sobre ela.", metodo: "WRAP", opcoes: ["Já vi acontecer", "Alguém me contou", "É uma suspeita"] },
        { pergunta: "A decisão é só sua ou depende de alguém?", porque: "Muda quem precisa ser ouvido antes.", metodo: "RAPID", opcoes: ["Só minha", "Preciso alinhar com alguém", "Não está claro"] }
      ]
    };
  }
  if (kind === "decide") {
    const first = a(p.respostas)[0];
    const agora = p.urgente || s(p.urgencia) === "agora" ? { titulo: "Segure o fluxo atual por 48 horas", acao: "Mantenha o processo como está até conversar com os envolvidos, sem mudanças pela metade.", passos: ["Avise o time que nada muda até sexta", "Peça a quem propôs a mudança um prazo curto", "Anote os pontos que precisam ser decididos"], para: "Time e quem propôs a mudança", mensagem: "Pessoal, por enquanto seguimos com o fluxo atual. Até sexta eu converso com os envolvidos e volto com a definição. Qualquer urgência, falem direto comigo.", nao_resolve: "Isso evita ruído agora, mas o motivo da mudança continua sem resposta: por isso o caminho ideal segue valendo.", horas: 24 } : null;
    return { agora,
      objetivo: `Resolver a situação garantindo: ${(first && s(first.resposta, 80)) || "o resultado principal"}.`,
      fatos: ["Você relatou a situação com o contexto atual"], hipoteses: ["A causa ainda não está confirmada"],
      alternativas: [
        { id: "a", titulo: "Investigar a causa antes de agir", descricao: "Conversar com os envolvidos e confirmar o que está por trás.", beneficios: ["Evita resolver o sintoma"], riscos: ["Leva alguns dias"] },
        { id: "b", titulo: "Agir agora com o que você sabe", descricao: "Tomar a decisão hoje e ajustar no caminho.", beneficios: ["Resposta rápida"], riscos: ["Pode exigir retrabalho"] },
        { id: "c", titulo: "Decidir junto com o time", descricao: "Levar as opções para quem será afetado.", beneficios: ["Mais adesão"], riscos: ["Demora mais", "Responsabilidade difusa"] }
      ],
      recomendacao: { id: "a", metodo: "5 Porquês", porque: "Segundo os 5 Porquês, a causa ainda não está clara. Confirmar antes custa pouco e evita uma decisão difícil de desfazer.", mudaria: "Se a urgência for de horas, agir agora passa a ser o melhor caminho." },
      metodos: [{ nome: "5 Porquês", aplicacao: "O relato descreve o sintoma; a causa ainda não foi confirmada." }, { nome: "Reversibilidade da decisão", aplicacao: "Investigar é reversível; trocar pessoas de lugar é mais difícil de desfazer." }, { nome: "Pre-mortem", aplicacao: "O risco mais provável é a decisão ficar aberta sem responsável." }],
      alerta_etico: "",
      contexto: "Considerei sua autonomia e quem será afetado pela decisão.",
      premortem: "A investigação se arrasta e a decisão fica aberta sem dono.",
      sinal_sucesso: "Em duas semanas, a situação está resolvida sem retrabalho.", revisao_dias: 14,
      dq: { enquadramento: 2, alternativas: 2, informacao: 1, valores: 1, raciocinio: 2 }, dq_dica: "Informação é o elo mais fraco: confirme a causa com quem está envolvido antes de agir."
    };
  }
  if (kind === "actions") {
    return { acoes: [
      { acao: "Conversar com as pessoas envolvidas para confirmar a causa", responsavel: "Você", prazo_dias: 2,
        comunicar: { quem: a(p.afetados).length ? a(p.afetados).slice(0, 2) : ["Pessoas envolvidas"], canal: "conversa 1:1", quando: "antes de qualquer mudança", como: "Escute primeiro e deixe claro que nada foi decidido sem elas.", mensagem: "Quero entender melhor o que está acontecendo antes de mudar qualquer coisa. Você tem 20 minutos esta semana para conversarmos? Sua visão vai pesar na decisão." } },
      { acao: "Definir por escrito o próximo passo e quem é o responsável", responsavel: "Você", prazo_dias: 5,
        comunicar: { quem: ["Time"], canal: "reunião curta", quando: "depois de definir o responsável", como: "Seja objetivo: o que muda, por quê e quem cuida.", mensagem: "Decidimos o próximo passo e quem fica responsável por ele. Vou explicar o motivo e o que muda para cada um. Dúvidas, me procurem depois da reunião." } },
      { acao: "Checar se o sinal de sucesso começou a aparecer", responsavel: "Você", prazo_dias: 10 }
    ] };
  }
  if (kind === "report") {
    if (p.modo === "valor") return {
      manchete: "Suas decisões do período organizaram a operação e mantiveram as entregas andando.",
      areas: [{ area: "Prazo", resumo: "Decisões que destravaram entregas atrasadas.", titulos: a(p.decisoes).slice(0, 2).map(d => d.titulo) }, { area: "Pessoas", resumo: "Decisões que envolveram e desenvolveram o time.", titulos: a(p.decisoes).slice(2, 4).map(d => d.titulo) }],
      destaques: a(p.decisoes).slice(0, 2).map(d => ({ titulo: d.titulo, contexto: s(d.situacao, 120), decisao: d.escolha || d.titulo, resultado: d.revisao ? (d.revisao.atingido === "Sim" ? "Objetivo atingido." : "Resultado parcial.") : "Em andamento.", valor: "Menos retrabalho e mais clareza para o time." })),
      valor_financeiro: "", time: "Parte dos próximos passos ficou com o time, o que reduz a centralização.", proximo_foco: "Registrar o impacto de cada decisão na revisão para fortalecer o próximo relatório."
    };
    return { manchete: "Você está construindo o hábito de decidir com método.", forcas: ["Define objetivos claros antes de escolher.", "Considera mais de um caminho."], padroes: ["Parece decidir melhor quando ouve o time antes."], foco: "Revisar as decisões no prazo combinado." };
  }
  if (kind === "daily") {
    const op = [
      ["Liderar é dar clareza. Hoje, uma conversa franca pode destravar muita coisa.", "Frase de partida, baseada no seu perfil."],
      ["Suas melhores decisões nascem quando você escuta antes de agir.", "Baseada no seu jeito de decidir."],
      ["Um time cresce quando o líder confia. Delegue uma coisa hoje.", "Baseada nas pessoas ao seu redor."],
      ["Decidir bem é um hábito. Você está construindo o seu.", "Baseada nas decisões que você registrou."]
    ];
    const pick = op[new Date().getDate() % op.length];
    return { frase: pick[0], porque: pick[1] };
  }
  if (kind === "review") {
    return {
      leitura: `O processo foi ${p.processo === "Sim" ? "bem conduzido" : "parcialmente sólido"}, e o resultado foi ${s(p.atingido, 20).toLowerCase() || "incerto"}. Separe as duas coisas antes de concluir.`,
      aprendizado: "Em decisões parecidas, confirme a causa antes de escolher o caminho.",
      calibracao: `Você declarou ${s(p.confianca, 10)}% de confiança. Compare isso com o resultado nas próximas revisões.`
    };
  }
  return {};
}
