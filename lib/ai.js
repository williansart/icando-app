// Prompts, respostas simuladas e leitura de JSON. Roda só no servidor.

const RULES = `Você é o motor do I Can Do, um copiloto que ajuda líderes a tomar decisões melhores.
Você não decide pelo usuário: ajuda a enxergar contexto, alternativas, riscos e incertezas, e pode recomendar um caminho explicando os critérios.
Separe fatos relatados de interpretações. Nunca presuma intenções de outras pessoas.
Use as quatro camadas de contexto do usuário (quem sou, onde estou, o que faço, quem está ao meu redor) para personalizar perguntas e recomendações.
Use por trás estes métodos, sem citar o nome deles: Cynefin, reversibilidade da decisão, urgência x importância, 5 porquês, análise pessoa x ambiente (Gilbert), liderança situacional, Vroom-Yetton, RAPID, mapa de stakeholders, escada da inferência, WRAP (ampliar opções, testar premissas, ganhar distância, preparar para errar), pre-mortem, visão externa e checklist de vieses.
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
Como costuma decidir: ${s(q.estilo, 200) || "não informado"}

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
  clarify: p => `${contextText(p.profile)}

SITUAÇÃO RELATADA
${s(p.situacao)}

TAREFA
Classifique a situação e formule só as perguntas cujas respostas podem mudar a decisão. Decisão simples e reversível: 2 perguntas. Difícil de reverter ou complexa: até 4. Se o relato não diz quem é afetado, uma das perguntas deve cobrir isso. Não pergunte o que o contexto acima já responde.

Formato:
{"titulo":"nome curto da decisão, até 6 palavras","entendimento":"1 ou 2 frases sobre o que está em jogo","tipo":"clara|complicada|complexa|caótica","reversivel":true,"urgencia":"agora|esta semana|pode esperar","perguntas":[{"pergunta":"até 20 palavras","porque":"até 14 palavras: o que essa resposta muda","opcoes":["2 a 4 respostas rápidas, até 6 palavras cada"]}]}`,

  decide: p => `${contextText(p.profile)}

SITUAÇÃO RELATADA
${s(p.situacao)}

ENTENDIMENTO INICIAL
${s(p.entendimento, 600)}

PERGUNTAS E RESPOSTAS
${a(p.respostas).slice(0, 6).map(r => `- ${s(r.pergunta, 200)} → ${s(r.resposta, 600)}`).join("\n")}

TAREFA
Monte os caminhos possíveis e recomende um. Gere 3 alternativas (mínimo 2, máximo 4), incluindo ao menos uma que o usuário não mencionou. Leve em conta a autonomia, a função e as pessoas do contexto. Fatos: só o que o usuário relatou. Hipóteses: interpretações ainda não confirmadas.

Formato:
{"objetivo":"o resultado que o usuário busca, 1 frase","fatos":["até 4 itens curtos"],"hipoteses":["até 3 itens curtos"],"alternativas":[{"id":"a","titulo":"até 6 palavras","descricao":"1 frase","beneficios":["1 ou 2 itens curtos"],"riscos":["1 ou 2 itens curtos"]}],"recomendacao":{"id":"id de uma alternativa","porque":"até 2 frases com os critérios","mudaria":"1 frase: o que faria recomendar outro caminho"},"contexto":"1 frase dizendo qual parte do contexto do usuário mais pesou na recomendação","premortem":"1 frase: se o caminho recomendado der errado em 3 meses, o motivo mais provável","sinal_sucesso":"1 frase concreta e verificável","revisao_dias":14}
O campo revisao_dias deve ser 7, 14, 30 ou 90.`,

  actions: p => `${contextText(p.profile)}

DECISÃO TOMADA
Situação: ${s(p.situacao)}
Objetivo: ${s(p.objetivo, 400)}
Caminho escolhido: ${s(p.escolha, 200)} (${s(p.descricao, 400)})
Como saber se deu certo: ${s(p.sucesso, 400)}

TAREFA
Transforme a decisão em 2 ou 3 próximos passos concretos. O primeiro deve poder começar nas próximas 48 horas. O responsável é "Você" ou o nome de uma pessoa do contexto.

Formato:
{"acoes":[{"acao":"verbo no infinitivo, até 12 palavras","responsavel":"Você","prazo_dias":2}]}`,

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
  if (kind === "clarify") {
    const sit = s(p.situacao, 90);
    return {
      titulo: "Decisão em aberto",
      entendimento: `Você precisa escolher um caminho para: "${sit}${s(p.situacao).length > 90 ? "…" : ""}". O ponto central é decidir sem gerar retrabalho.`,
      tipo: "complicada", reversivel: true, urgencia: "esta semana",
      perguntas: [
        { pergunta: "Qual resultado você mais quer garantir com essa decisão?", porque: "Define o critério para comparar os caminhos.", opcoes: ["Cumprir o prazo", "Preservar a relação", "Manter a qualidade", "Reduzir custo"] },
        { pergunta: "Isso é novo ou já vem se repetindo?", porque: "Problemas recorrentes pedem atacar a causa.", opcoes: ["É a primeira vez", "Já aconteceu antes", "Acontece sempre"] },
        { pergunta: "A decisão é só sua ou depende de alguém?", porque: "Muda quem precisa ser ouvido antes.", opcoes: ["Só minha", "Preciso alinhar com alguém", "Não está claro"] }
      ]
    };
  }
  if (kind === "decide") {
    const first = a(p.respostas)[0];
    return {
      objetivo: `Resolver a situação garantindo: ${(first && s(first.resposta, 80)) || "o resultado principal"}.`,
      fatos: ["Você relatou a situação com o contexto atual"], hipoteses: ["A causa ainda não está confirmada"],
      alternativas: [
        { id: "a", titulo: "Investigar a causa antes de agir", descricao: "Conversar com os envolvidos e confirmar o que está por trás.", beneficios: ["Evita resolver o sintoma"], riscos: ["Leva alguns dias"] },
        { id: "b", titulo: "Agir agora com o que você sabe", descricao: "Tomar a decisão hoje e ajustar no caminho.", beneficios: ["Resposta rápida"], riscos: ["Pode exigir retrabalho"] },
        { id: "c", titulo: "Decidir junto com o time", descricao: "Levar as opções para quem será afetado.", beneficios: ["Mais adesão"], riscos: ["Demora mais", "Responsabilidade difusa"] }
      ],
      recomendacao: { id: "a", porque: "A causa ainda não está clara. Confirmar antes custa pouco e evita uma decisão difícil de desfazer.", mudaria: "Se a urgência for de horas, agir agora passa a ser o melhor caminho." },
      contexto: "Considerei sua autonomia e quem será afetado pela decisão.",
      premortem: "A investigação se arrasta e a decisão fica aberta sem dono.",
      sinal_sucesso: "Em duas semanas, a situação está resolvida sem retrabalho.", revisao_dias: 14
    };
  }
  if (kind === "actions") {
    return { acoes: [
      { acao: "Conversar com as pessoas envolvidas para confirmar a causa", responsavel: "Você", prazo_dias: 2 },
      { acao: "Definir por escrito o próximo passo e quem é o responsável", responsavel: "Você", prazo_dias: 5 },
      { acao: "Checar se o sinal de sucesso começou a aparecer", responsavel: "Você", prazo_dias: 10 }
    ] };
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
