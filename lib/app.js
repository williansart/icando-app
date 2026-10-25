import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function start($app) {
  if (!$app || $app.dataset.started) return () => {};
  $app.dataset.started = "1";
  const sb = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, { auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } }) : null;

  // Erro vindo do link do e-mail (expirado, já usado etc.)
  let linkError = "";
  try {
    const q = new URLSearchParams(location.search);
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    const code = h.get("error_code") || q.get("error_code") || h.get("error") || q.get("error");
    if (code) {
      linkError = /expired|otp/i.test(code) ? "Esse link expirou ou já foi usado. Peça um novo e clique no e-mail mais recente." : "Não consegui entrar com esse link. Peça um novo.";
      history.replaceState(null, "", location.pathname);
    }
  } catch {}

  /* ---------- utilidades ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const str = v => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));
  const arr = v => (Array.isArray(v) ? v : []);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clone = o => JSON.parse(JSON.stringify(o));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c.5 4.6 2.9 7.5 10 10-7.1 2.5-9.5 5.4-10 10-.5-4.6-2.9-7.5-10-10 7.1-2.5 9.5-5.4 10-10z"/></svg>';
  const IC = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    hist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  const orb = size => `<span class="orb ${size}">${SPARK}</span>`;

  /* ---------- datas ---------- */
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = n => { const d = today(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fmt = iso => { try { return new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }); } catch { return iso; } };
  const isDue = d => !d.revisao && new Date(d.revisaoEm + "T00:00:00") <= today();
  const REV = [[7, "1 semana"], [14, "2 semanas"], [30, "1 mês"], [90, "3 meses"]];

  /* ---------- opções das camadas ---------- */
  const OPT = {
    estilo: ["Decido rápido e ajusto depois", "Analiso bastante antes", "Ouço várias pessoas", "Adio até ter certeza"],
    momento: ["Crescendo rápido", "Estável", "Reestruturando", "Começando agora"],
    autonomia: ["Decido quase tudo", "Decido, mas valido antes", "Pouca, quase tudo sobe"],
    funcao: ["Coordenador(a)", "Gerente", "Diretor(a)", "Fundador(a)"],
    cobranca: ["Prazo e entregas", "Receita e resultado", "Qualidade", "Desenvolver o time"],
    time: ["Nenhuma", "1 a 3", "4 a 8", "9 ou mais"]
  };
  const emptyProfile = () => ({ nome: "", quemSou: { estilo: "" }, ondeEstou: { momento: "", autonomia: "" }, oQueFaco: { funcao: "", cobranca: "" }, aoRedor: { time: "", pessoas: [] } });
  const fullProfile = p => {
    const e = emptyProfile(); p = p || {};
    return { nome: p.nome || "", quemSou: Object.assign(e.quemSou, p.quemSou), ondeEstou: Object.assign(e.ondeEstou, p.ondeEstou), oQueFaco: Object.assign(e.oQueFaco, p.oQueFaco), aoRedor: Object.assign(e.aoRedor, p.aoRedor, { pessoas: arr(p.aoRedor && p.aoRedor.pessoas) }) };
  };

  /* ---------- estado ---------- */
  const S = {
    ready: false, session: null, auth: { step: "email", email: "", code: "", msg: "", busy: false },
    profile: null, decisions: [], view: "home", linkError: "", param: null, demo: false, chat: null, sheet: false,
    draft: "", resetArm: false, pf: null, np: { nome: "", papel: "", nota: "" }, saveErr: "", listening: null, micMsg: ""
  };

  if (linkError) S.auth.msg = linkError;

  const EXAMPLE = {
    id: "exemplo", exemplo: true, criadaEm: new Date(Date.now() - 20 * 864e5).toISOString(), titulo: "Conversar e reorganizar o escopo",
    situacao: "O Caio vem atrasando as entregas do projeto da Kappa há três sprints. Estou pensando em transferir o projeto para a Bruna.",
    objetivo: "Recuperar o prazo da Kappa sem desmotivar o Caio.",
    alternativas: [
      { id: "a", titulo: "Conversar e reorganizar o escopo", descricao: "Alinhar prioridades com o Caio e cortar o que não é essencial." },
      { id: "b", titulo: "Transferir o projeto para a Bruna", descricao: "Passar a liderança do projeto e realocar o Caio." },
      { id: "c", titulo: "Dividir o projeto entre os dois", descricao: "O Caio segue, com a Bruna apoiando nas entregas críticas." }],
    recomendacao: { id: "a", porque: "O escopo mudou e o Caio não sabe do atraso. A causa parece de ambiente, não de competência." },
    escolhaId: "a", confianca: 70, sucesso: "Duas sprints seguidas entregues no prazo.", revisaoEm: addDays(-3),
    acoes: [{ acao: "Conversar com o Caio sobre o atraso e o novo escopo", responsavel: "Você", prazo: addDays(-15), feito: true }, { acao: "Registrar o novo prazo com o cliente", responsavel: "Você", prazo: addDays(-10), feito: false }],
    ajuda: null, revisao: null
  };
  const allDecisions = () => (S.decisions.length ? S.decisions : [EXAMPLE]);
  const findDecision = id => allDecisions().find(d => d.id === id);
  const decTitle = d => d.titulo || str(d.situacao).slice(0, 48);

  /* ---------- armazenamento ---------- */
  const LS = "icando-app-local";
  const skipKey = () => "icando-skip-" + (S.session ? S.session.user.id : "local");
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let wq = Promise.resolve();
  function queue(fn) {
    wq = wq.then(fn).then(r => { if (r && r.error) throw r.error; if (S.saveErr) { S.saveErr = ""; render(); } })
      .catch(e => { console.error(e); S.saveErr = "Não consegui salvar a última alteração. Verifique sua conexão."; render(); });
  }
  const store = {
    async load() {
      if (!sb) { const c = lsGet(LS) || {}; return { profile: c.profile || null, decisions: arr(c.decisions) }; }
      const id = S.session.user.id;
      const [p, d] = await Promise.all([
        sb.from("profiles").select("data").eq("user_id", id).maybeSingle(),
        sb.from("decisions").select("data").eq("user_id", id).order("created_at", { ascending: false })
      ]);
      if (p.error || d.error) throw p.error || d.error;
      return { profile: p.data ? p.data.data : null, decisions: (d.data || []).map(r => r.data) };
    },
    saveProfile() {
      if (!sb) return lsSet(LS, { profile: S.profile, decisions: S.decisions });
      const body = { user_id: S.session.user.id, data: clone(S.profile), updated_at: new Date().toISOString() };
      queue(() => sb.from("profiles").upsert(body));
    },
    saveDecision(d) {
      if (d.exemplo) return;
      if (!sb) return lsSet(LS, { profile: S.profile, decisions: S.decisions });
      const body = { id: d.id, user_id: S.session.user.id, data: clone(d), updated_at: new Date().toISOString() };
      queue(() => sb.from("decisions").upsert(body));
    },
    async reset() {
      if (!sb) { try { localStorage.removeItem(LS); } catch {} return; }
      const id = S.session.user.id;
      await sb.from("decisions").delete().eq("user_id", id);
      await sb.from("profiles").delete().eq("user_id", id);
    }
  };

  /* ---------- IA ---------- */
  const NORM = {
    clarify: (r, p) => ({
      titulo: str(r.titulo) || p.situacao.slice(0, 40), entendimento: str(r.entendimento), tipo: str(r.tipo), reversivel: !!r.reversivel, urgencia: str(r.urgencia),
      perguntas: arr(r.perguntas).slice(0, 4).map(q => ({ pergunta: str(q && q.pergunta), porque: str(q && q.porque), opcoes: arr(q && q.opcoes).map(str).filter(Boolean).slice(0, 4) })).filter(q => q.pergunta)
    }),
    decide: r => {
      const alts = arr(r.alternativas).slice(0, 4).map((a, i) => ({ id: str(a && a.id) || "abcd"[i], titulo: str(a && a.titulo), descricao: str(a && a.descricao), beneficios: arr(a && a.beneficios).map(str).filter(Boolean).slice(0, 2), riscos: arr(a && a.riscos).map(str).filter(Boolean).slice(0, 2) })).filter(a => a.titulo);
      const seen = new Set(); alts.forEach((a, i) => { if (seen.has(a.id)) a.id = a.id + i; seen.add(a.id); });
      const rec = r.recomendacao || {};
      const recId = alts.some(a => a.id === str(rec.id)) ? str(rec.id) : alts[0] && alts[0].id;
      const want = +r.revisao_dias || 14;
      const dias = [7, 14, 30, 90].reduce((b, v) => (Math.abs(v - want) < Math.abs(b - want) ? v : b), 14);
      return { objetivo: str(r.objetivo), fatos: arr(r.fatos).map(str).filter(Boolean).slice(0, 4), hipoteses: arr(r.hipoteses).map(str).filter(Boolean).slice(0, 3), alternativas: alts, recomendacao: { id: recId, porque: str(rec.porque), mudaria: str(rec.mudaria) }, contexto: str(r.contexto), premortem: str(r.premortem), sinal_sucesso: str(r.sinal_sucesso), revisao_dias: dias };
    },
    actions: r => ({ acoes: arr(r.acoes).slice(0, 3).map(a => ({ acao: str(a && a.acao), responsavel: str(a && a.responsavel) || "Você", prazo: addDays(Math.max(1, Math.min(120, +(a && a.prazo_dias) || 7))), feito: false })).filter(a => a.acao) }),
    review: r => ({ leitura: str(r.leitura), aprendizado: str(r.aprendizado), calibracao: str(r.calibracao) })
  };
  async function callAI(kind, payload, chat) {
    const ctl = new AbortController(); chat.ctl = ctl;
    const headers = { "content-type": "application/json" };
    if (S.session) headers.authorization = "Bearer " + S.session.access_token;
    let r;
    try {
      r = await fetch("/api/ai", { method: "POST", headers, body: JSON.stringify({ kind, payload: Object.assign({ profile: S.profile }, payload) }), signal: ctl.signal });
    } catch (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "network" }; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: j.code || "upstream_error" };
    S.demo = !!j.demo;
    return NORM[kind](j.result || {}, payload);
  }
  function errMsg(e) {
    const c = e && e.code;
    if (c === "rate_limited") return "Muitas consultas seguidas. Espere um pouco e tente de novo.";
    if (c === "invalid_json") return "Não consegui organizar a resposta.";
    if (c === "not_allowed") return "Seu e-mail ainda não foi liberado para usar a IA. Peça acesso a quem te convidou.";
    if (c === "unauthorized") return "Sua sessão expirou. Saia e entre de novo.";
    if (c === "network") return "Sem conexão com a internet.";
    return "A conexão com a IA falhou no meio do caminho.";
  }

  /* ---------- motor de conversa ---------- */
  function newChat(kind) {
    if (S.chat && S.chat.ctl) S.chat.ctl.abort();
    stopMic();
    S.chat = { kind, msgs: [], await: null, resolve: null, typing: false, input: "", sel: null, reg: { confianca: 70, sucesso: "", revisao: 14 }, locked: false };
    S.view = "chat"; S.sheet = false;
    return S.chat;
  }
  const alive = c => S.chat === c && S.view === "chat";
  function push(c, m) { c.msgs.push(m); if (alive(c)) render(); }
  function wait(c, opts) { c.await = opts; c.input = ""; if (alive(c)) render(); return new Promise(r => { c.resolve = r; }); }
  function answer(v) {
    const c = S.chat; if (!c || !c.await) return;
    stopMic();
    const a = c.await, r = c.resolve;
    c.await = null; c.resolve = null; c.input = "";
    if (!a.silent) c.msgs.push({ from: "me", text: v });
    render(); r(v);
  }
  async function think(c, kind, p) {
    for (;;) {
      c.typing = true; if (alive(c)) render();
      try { const res = await callAI(kind, p, c); c.typing = false; return res; }
      catch (e) {
        c.typing = false;
        if (!alive(c) || (e && e.code === "cancelled")) return null;
        push(c, { from: "ai", err: true, text: errMsg(e) });
        await wait(c, { chips: ["Tentar de novo"], silent: true });
        if (!alive(c)) return null;
      }
    }
  }

  /* ---------- fluxos ---------- */
  function splitPerson(t) {
    const m = t.split(/\s*[,(–-]\s*/);
    return { id: uid(), nome: str(m[0]).replace(/\)$/, ""), papel: str(m.slice(1).join(", ")).replace(/\)$/, ""), nota: "" };
  }
  async function onboarding() {
    const c = newChat("onboarding");
    const p = emptyProfile();
    push(c, { from: "ai", text: "Oi! Eu sou o I Can Do. Estou aqui para te ajudar a tomar decisões com mais clareza." });
    await sleep(450); if (!alive(c)) return;
    push(c, { from: "ai", text: "Para isso, preciso te conhecer em quatro partes: quem você é, onde está, o que faz e quem está ao seu redor. Leva uns dois minutos." });
    await sleep(450); if (!alive(c)) return;
    push(c, { from: "ai", layer: "Quem sou", text: "Como posso te chamar?" });
    p.nome = await wait(c, { text: true, placeholder: "Seu nome" }); if (!alive(c)) return;
    push(c, { from: "ai", layer: "Quem sou", text: `Prazer, ${p.nome}. Quando precisa decidir algo importante, você costuma…` });
    p.quemSou.estilo = await wait(c, { chips: OPT.estilo, text: true, placeholder: "Ou descreva do seu jeito" }); if (!alive(c)) return;
    push(c, { from: "ai", layer: "Onde estou", text: "Em que momento está a empresa onde você trabalha?", why: "Pode contar mais: setor, tamanho, o que está acontecendo." });
    p.ondeEstou.momento = await wait(c, { chips: OPT.momento, text: true, placeholder: "Ou conte com suas palavras" }); if (!alive(c)) return;
    push(c, { from: "ai", layer: "Onde estou", text: "Quanta autonomia você tem para decidir sobre a sua área?" });
    p.ondeEstou.autonomia = await wait(c, { chips: OPT.autonomia, text: true, placeholder: "Ou explique" }); if (!alive(c)) return;
    push(c, { from: "ai", layer: "O que faço", text: "Qual é a sua função hoje?" });
    p.oQueFaco.funcao = await wait(c, { chips: OPT.funcao, text: true, placeholder: "Ou escreva sua função" }); if (!alive(c)) return;
    push(c, { from: "ai", layer: "O que faço", text: "Pelo que você é mais cobrado?" });
    p.oQueFaco.cobranca = await wait(c, { chips: OPT.cobranca, text: true, placeholder: "Ou conte com suas palavras" }); if (!alive(c)) return;
    push(c, { from: "ai", layer: "Quem está ao meu redor", text: "Quantas pessoas você lidera diretamente?" });
    p.aoRedor.time = await wait(c, { chips: OPT.time }); if (!alive(c)) return;
    push(c, { from: "ai", layer: "Quem está ao meu redor", text: "Quer cadastrar alguém com quem trabalha? Escreva o nome e o papel.", why: "Exemplo: Caio, analista júnior. Isso me ajuda a considerar as pessoas em cada decisão." });
    let v = await wait(c, { chips: ["Agora não"], text: true, placeholder: "Nome, papel" }); if (!alive(c)) return;
    while (v !== "Agora não" && v !== "Pronto") {
      p.aoRedor.pessoas.push(splitPerson(v));
      push(c, { from: "ai", text: "Anotado. Mais alguém?" });
      v = await wait(c, { chips: ["Pronto"], text: true, placeholder: "Nome, papel" }); if (!alive(c)) return;
    }
    S.profile = p; store.saveProfile();
    push(c, { from: "ai", text: `Pronto, ${p.nome}. Vou usar isso para entender cada situação. Você pode ajustar tudo no seu perfil quando quiser.` });
    await wait(c, { chips: ["Começar"], silent: true }); if (!alive(c)) return;
    go("home");
  }

  async function decisionFlow(situacao) {
    const c = newChat("decision");
    c.msgs.push({ from: "me", text: situacao });
    const clar = await think(c, "clarify", { situacao }); if (!clar || !alive(c)) return;
    c.clar = clar;
    push(c, { from: "ai", understand: clar });
    const respostas = [];
    for (let i = 0; i < clar.perguntas.length; i++) {
      const q = clar.perguntas[i];
      await sleep(300); if (!alive(c)) return;
      push(c, { from: "ai", text: q.pergunta, why: q.porque, layer: `Pergunta ${i + 1} de ${clar.perguntas.length}` });
      const a = await wait(c, { chips: q.opcoes, text: true, placeholder: "Ou responda com suas palavras", skip: true }); if (!alive(c)) return;
      respostas.push({ pergunta: q.pergunta, resposta: a });
    }
    const dec = await think(c, "decide", { situacao, entendimento: clar.entendimento, respostas }); if (!dec || !alive(c)) return;
    if (!dec.alternativas.length) { push(c, { from: "ai", err: true, text: "Não consegui montar os caminhos desta vez. Volte ao início e tente descrever de novo." }); return; }
    c.dec = dec; c.respostas = respostas; c.sel = dec.recomendacao.id;
    c.reg = { confianca: 70, sucesso: dec.sinal_sucesso, revisao: dec.revisao_dias };
    push(c, { from: "ai", text: "Organizei os caminhos possíveis. Escolha o que faz mais sentido para você." });
    push(c, { from: "ai", decision: true });
    await wait(c, { choose: true }); if (!alive(c)) return;
    const d = c.saved;
    push(c, { from: "ai", text: "Decisão registrada. Agora vou transformar isso em próximos passos." });
    const act = await think(c, "actions", { situacao, objetivo: d.objetivo, escolha: d.titulo, descricao: (d.alternativas.find(a => a.id === d.escolhaId) || {}).descricao, sucesso: d.sucesso });
    if (!alive(c)) return;
    if (act && act.acoes.length) { d.acoes = act.acoes; store.saveDecision(d); push(c, { from: "ai", actions: d.id }); }
    await sleep(350); if (!alive(c)) return;
    push(c, { from: "ai", text: `Em ${fmt(d.revisaoEm)} eu volto para revisarmos juntos o que aconteceu.` });
    push(c, { from: "ai", text: "De 1 a 5, quanto essa conversa te ajudou a decidir?", why: "1 = não ajudou · 5 = ajudou muito" });
    const nota = await wait(c, { chips: ["1", "2", "3", "4", "5"] }); if (!alive(c)) return;
    d.ajuda = +nota; store.saveDecision(d);
    push(c, { from: "ai", text: "Obrigado. Isso me ajuda a melhorar." });
    const fim = await wait(c, { chips: ["Nova decisão", "Ver registro", "Voltar ao início"], silent: true }); if (!alive(c)) return;
    if (fim === "Ver registro") go("detail", d.id); else go("home", null, fim === "Nova decisão");
  }

  async function reviewFlow(id) {
    const d = findDecision(id); if (!d) return;
    const c = newChat("review");
    push(c, { from: "ai", text: `Vamos revisar "${decTitle(d)}".\n\nNa época você disse que saberia que deu certo assim: ${d.sucesso || "não definido"}.` });
    await sleep(350); if (!alive(c)) return;
    push(c, { from: "ai", text: "O que aconteceu de fato?" });
    const aconteceu = await wait(c, { text: true, placeholder: "Conte o que aconteceu" }); if (!alive(c)) return;
    push(c, { from: "ai", text: "O objetivo foi atingido?" });
    const atingido = await wait(c, { chips: ["Sim", "Em parte", "Não"] }); if (!alive(c)) return;
    push(c, { from: "ai", text: "Com o que você sabia na época, a decisão foi bem tomada?", why: "Uma boa decisão pode dar errado por azar, e uma ruim pode dar certo por sorte." });
    const processo = await wait(c, { chips: ["Sim", "Em parte", "Não"] }); if (!alive(c)) return;
    push(c, { from: "ai", text: "Você faria algo diferente?" });
    const diferente = await wait(c, { chips: ["Nada"], text: true, placeholder: "O que mudaria" }); if (!alive(c)) return;
    const alt = arr(d.alternativas).find(a => a.id === d.escolhaId) || {};
    const ia = await think(c, "review", { situacao: d.situacao, objetivo: d.objetivo, escolha: alt.titulo || d.titulo, confianca: d.confianca, sucesso: d.sucesso, acoes: d.acoes, aconteceu, atingido, processo, diferente });
    if (!ia || !alive(c)) return;
    d.revisao = { aconteceu, atingido, processo, diferente, ia, em: new Date().toISOString() };
    store.saveDecision(d);
    push(c, { from: "ai", learn: ia });
    const fim = await wait(c, { chips: ["Ver registro", "Voltar ao início"], silent: true }); if (!alive(c)) return;
    if (fim === "Ver registro") go("detail", d.id); else go("home");
  }

  function register() {
    const c = S.chat; if (!c || !c.dec) return;
    const dec = c.dec, clar = c.clar;
    const alt = dec.alternativas.find(a => a.id === c.sel);
    const d = {
      id: "d" + Date.now(), criadaEm: new Date().toISOString(), titulo: alt ? alt.titulo : clar.titulo, tema: clar.titulo,
      situacao: c.msgs[0].text, entendimento: clar.entendimento, tipo: clar.tipo, reversivel: clar.reversivel, urgencia: clar.urgencia,
      respostas: c.respostas, objetivo: dec.objetivo, fatos: dec.fatos, hipoteses: dec.hipoteses, alternativas: dec.alternativas,
      recomendacao: dec.recomendacao, contexto: dec.contexto, premortem: dec.premortem, escolhaId: c.sel, confianca: c.reg.confianca,
      sucesso: str(c.reg.sucesso) || dec.sinal_sucesso, revisaoEm: addDays(c.reg.revisao), acoes: [], ajuda: null, revisao: null
    };
    S.decisions.unshift(d); store.saveDecision(d);
    c.saved = d; c.locked = true; S.sheet = false;
    answer(alt ? `Vou seguir com: ${alt.titulo} (${c.reg.confianca}% de confiança)` : "Decisão registrada");
  }

  function toggleAction(did, i) {
    const d = findDecision(did); if (!d || !d.acoes || !d.acoes[i]) return;
    d.acoes[i].feito = !d.acoes[i].feito; store.saveDecision(d); render();
  }

  /* ---------- voz ---------- */
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  let rec = null;
  function getPath(path) { return path.split(".").reduce((o, k) => (o ? o[k] : undefined), S); }
  function setPath(path, val) { const k = path.split("."); let o = S; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = val; }
  function stopMic() { if (rec) { try { rec.stop(); } catch {} } }
  function toggleMic(targetId, bind) {
    if (rec) { stopMic(); return; }
    S.micMsg = "";
    const base = str(getPath(bind));
    let finals = "";
    rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = true;
    rec.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals += t; else interim += t;
      }
      const v = ((base ? base + " " : "") + finals + interim).replace(/\s+/g, " ");
      setPath(bind, v);
      const ta = document.getElementById(targetId);
      if (ta) { ta.value = v; autoGrow(ta); }
      syncSend();
    };
    rec.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") S.micMsg = "Permita o uso do microfone nas configurações do navegador."; };
    rec.onend = () => { rec = null; S.listening = null; render(); };
    try { rec.start(); S.listening = targetId; render(); } catch { rec = null; }
  }
  function micBtn(targetId, bind, enabled) {
    if (!SR) return "";
    const on = S.listening === targetId;
    return `<button class="mic${on ? " on" : ""}" data-a="mic" data-v="${targetId}|${bind}" aria-label="${on ? "Parar de ouvir" : "Falar"}" ${enabled ? "" : "disabled"}>${on ? IC.stop : IC.mic}</button>`;
  }
  function syncSend() {
    const h = document.getElementById("home-send"); if (h) h.disabled = S.draft.trim().length < 8;
    const c = document.getElementById("chat-send"); if (c && S.chat) c.disabled = !S.chat.input.trim();
  }

  /* ---------- navegação ---------- */
  function go(view, param, focusInput) {
    if (S.chat && S.chat.ctl && view !== "chat") S.chat.ctl.abort();
    stopMic();
    S.view = view; S.param = param || null; S.sheet = false; S.resetArm = false;
    if (view === "profile") { S.pf = fullProfile(clone(S.profile || {})); S.np = { nome: "", papel: "", nota: "" }; }
    render();
    if (focusInput) { const t = document.getElementById("home-input"); if (t) t.focus(); }
  }

  /* ---------- telas ---------- */
  const hdr = (left, center, right) => `<header class="hdr g">${left || '<span class="spacer"></span>'}<div class="hdr-c">${center || ""}</div>${right || '<span class="spacer"></span>'}</header>`;
  const backBtn = (act, v) => `<button class="icon-btn" data-a="${act}"${v ? ` data-v="${esc(v)}"` : ""} aria-label="Voltar">${IC.back}</button>`;
  const brand = orb("xs") + "<span>I Can Do</span>";
  const banner = () => (S.saveErr ? `<p class="banner">${esc(S.saveErr)}</p>` : "") + (S.micMsg ? `<p class="banner">${esc(S.micMsg)}</p>` : "");
  const TIPS = [
    "Um liderado vem atrasando entregas. Penso em passar o projeto dele para outra pessoa.",
    "Preciso decidir se contrato alguém agora ou espero o orçamento do próximo trimestre.",
    "Tenho que dar um feedback difícil para uma pessoa sênior do time e não sei como."
  ];

  function vLogin() {
    const a = S.auth;
    let h = `<main class="scroll"><div class="pad g login">${orb("lg")}<h1>Entre no I Can Do</h1>`;
    if (a.step === "email") {
      h += `<p>Digite seu e-mail. Enviamos um link de acesso, sem senha.</p>
        <form class="fld" data-form="email"><label for="email">E-mail</label><input class="field" id="email" type="email" autocomplete="email" inputmode="email" data-bind="auth.email" value="${esc(a.email)}" placeholder="voce@empresa.com" required>
        <button class="btn" type="submit" ${a.busy ? "disabled" : ""}>${a.busy ? "Enviando…" : "Receber link de acesso"}</button></form>`;
    } else {
      h += `<p>Enviamos um link para <b>${esc(a.email)}</b>. Abra o e-mail e toque em <b>Sign in</b>.</p>
        <p class="hint">Dica: no celular, abra o e-mail no mesmo navegador em que vai usar o app. O e-mail pode levar um minuto e às vezes cai no spam.</p>
        <button class="btn sec" data-a="authBack">Usar outro e-mail</button>`;
    }
    if (a.msg) h += `<p class="banner">${esc(a.msg)}</p>`;
    return h + "</div></main>";
  }

  function pendingActions() {
    const out = [];
    S.decisions.forEach(d => arr(d.acoes).forEach((a, i) => { if (!a.feito) out.push({ d, a, i }); }));
    return out.sort((x, y) => String(x.a.prazo).localeCompare(String(y.a.prazo)));
  }
  function actRow(d, a, i, showDec) {
    const late = !a.feito && new Date(a.prazo + "T23:59:59") < new Date();
    return `<button class="act${a.feito ? " done" : ""}" data-a="act" data-v="${esc(d.id)}|${i}" aria-pressed="${!!a.feito}"><span class="box">${a.feito ? IC.check : ""}</span><span class="ab"><span class="at">${esc(a.acao)}</span><span class="am">${esc(a.responsavel)} · <span class="${late ? "late" : ""}">até ${fmt(a.prazo)}</span>${showDec ? " · " + esc(decTitle(d)) : ""}</span></span></button>`;
  }

  function vHome() {
    const due = allDecisions().filter(isDue);
    const nome = S.profile && S.profile.nome;
    const pend = pendingActions().slice(0, 3);
    let h = hdr(`<button class="icon-btn" data-a="go" data-v="profile" aria-label="Seu perfil">${IC.user}</button>`, '<span class="proto">Versão de teste</span>',
      `<button class="icon-btn" data-a="go" data-v="history" aria-label="Suas decisões">${IC.hist}${due.length ? '<span class="dot"></span>' : ""}</button>`);
    h += `<main class="scroll"><div class="pad g">${banner()}`;
    h += `<section class="hero">${orb("lg")}<h1>${nome ? esc(nome) + ", qual decisão você precisa tomar?" : "Qual decisão você precisa tomar?"}</h1><p>Escreva ou fale com suas palavras. Eu faço as perguntas certas e organizo os caminhos.</p></section>`;
    if (due.length) {
      h += '<section class="blk"><h2 class="sec-t">Hora de revisar</h2>';
      due.slice(0, 2).forEach(d => { h += `<button class="due" data-a="review" data-v="${esc(d.id)}"><span class="tx"><span class="tt">${esc(decTitle(d))}</span><span class="st">Revisão prevista para ${fmt(d.revisaoEm)}${d.exemplo ? " · exemplo" : ""}</span></span><span class="go">Revisar</span></button>`; });
      h += "</section>";
    }
    if (pend.length) {
      h += '<section class="blk"><h2 class="sec-t">Seus próximos passos</h2><div class="acts">' + pend.map(x => actRow(x.d, x.a, x.i, true)).join("") + "</div></section>";
    }
    h += '<section class="blk"><h2 class="sec-t">Experimente com um exemplo</h2><div class="tips">';
    TIPS.forEach((t, i) => { h += `<button class="tip" data-a="tip" data-v="${i}"><span class="n">Exemplo ${i + 1}</span><span class="x">${esc(t)}</span></button>`; });
    h += "</div></section></div></main>";
    h += `<div class="composer-wrap g"><div class="composer"><textarea id="home-input" rows="1" data-bind="draft" placeholder="${S.listening === "home-input" ? "Ouvindo… fale à vontade" : "Descreva sua decisão aqui…"}" aria-label="Descreva sua decisão">${esc(S.draft)}</textarea>${micBtn("home-input", "draft", true)}<button class="send" id="home-send" data-a="start" aria-label="Começar" ${S.draft.trim().length < 8 ? "disabled" : ""}>${IC.send}</button></div></div>`;
    return h;
  }

  function msgHTML(m, c) {
    if (m.from === "me") return `<div class="row me"><div class="bubble me">${esc(m.text)}</div></div>`;
    if (m.understand) {
      const u = m.understand;
      const tags = [u.tipo && "Situação " + u.tipo, u.reversivel ? "Reversível" : "Difícil de reverter", u.urgencia && "Urgência: " + u.urgencia].filter(Boolean);
      return `<div class="row ai">${orb("sm")}<div class="bubble ai"><span class="lab">Entendi assim</span>${esc(u.entendimento)}<span class="tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</span></div></div>`;
    }
    if (m.decision) return decisionCard(c);
    if (m.actions) {
      const d = findDecision(m.actions); if (!d) return "";
      return `<div class="card"><p class="lbl">Próximos passos</p><div class="acts">${arr(d.acoes).map((a, i) => actRow(d, a, i, false)).join("")}</div><p class="hint">Marque cada passo quando concluir. Eles aparecem na tela inicial.</p></div>`;
    }
    if (m.learn) {
      const l = m.learn;
      return `<div class="card"><p class="lbl">O que essa decisão ensina</p><div class="blk"><p>${esc(l.leitura)}</p></div><div class="note"><b>Aprendizado</b>${esc(l.aprendizado)}</div><div class="note warn"><b>Calibração</b>${esc(l.calibracao)}</div></div>`;
    }
    return `<div class="row ai">${orb("sm")}<div class="bubble ai${m.err ? " err" : ""}">${m.layer ? `<span class="lab">${esc(m.layer)}</span>` : ""}${esc(m.text)}${m.why ? `<span class="why">${esc(m.why)}</span>` : ""}</div></div>`;
  }

  function decisionCard(c) {
    const d = c.dec; if (!d) return "";
    let h = '<div class="card">';
    if (d.objetivo) h += `<div class="blk"><p class="lbl">Seu objetivo</p><p>${esc(d.objetivo)}</p></div>`;
    h += '<div class="blk"><p class="lbl">Caminhos possíveis</p><div class="alts">';
    d.alternativas.forEach(a => {
      const on = c.sel === a.id;
      h += `<button class="alt" data-a="alt" data-v="${esc(a.id)}" aria-pressed="${on}"${c.locked ? " disabled" : ""}><span class="top"><span class="radio"></span><span class="t">${esc(a.titulo)}</span>${a.id === d.recomendacao.id ? '<span class="rec">Recomendado</span>' : ""}</span>`;
      if (a.descricao) h += `<span class="d">${esc(a.descricao)}</span>`;
      if (on && (a.beneficios.length || a.riscos.length)) h += `<span class="pc"><span class="pro"><span class="h">A favor</span>${a.beneficios.map(x => `<span class="li">${esc(x)}</span>`).join("")}</span><span class="con"><span class="h">Riscos</span>${a.riscos.map(x => `<span class="li">${esc(x)}</span>`).join("")}</span></span>`;
      h += "</button>";
    });
    h += "</div></div>";
    if (d.recomendacao.porque) h += `<div class="note"><b>Por que recomendo</b>${esc(d.recomendacao.porque)}${d.recomendacao.mudaria ? `<span class="hint">O que mudaria a recomendação: ${esc(d.recomendacao.mudaria)}</span>` : ""}</div>`;
    if (d.contexto) h += `<div class="note ctx"><b>Considerei seu contexto</b>${esc(d.contexto)}</div>`;
    if (d.premortem) h += `<div class="note warn"><b>Se der errado, o motivo mais provável</b>${esc(d.premortem)}</div>`;
    if (d.fatos.length || d.hipoteses.length) h += `<div class="fh"><div class="blk"><p class="lbl">Fatos</p><ul>${d.fatos.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div><div class="blk"><p class="lbl">Hipóteses</p><ul>${d.hipoteses.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div></div>`;
    if (c.locked) { const a = d.alternativas.find(x => x.id === c.sel); h += `<div class="chosen">${IC.check}Escolhido: ${esc(a ? a.titulo : "")}</div>`; }
    else h += '<button class="btn" data-a="openSheet">Seguir com este caminho</button>';
    return h + "</div>";
  }

  function vChat() {
    const c = S.chat;
    const right = c.kind === "onboarding" ? '<button class="pillbtn" data-a="skipOnb">Pular</button>' : null;
    let h = hdr(backBtn("leave"), brand, right);
    h += `<main class="scroll" id="chat-scroll"><div class="msgs g">${banner()}`;
    if (S.demo) h += '<p class="demo">Modo demonstração: respostas simuladas</p>';
    c.msgs.forEach(m => { h += msgHTML(m, c); });
    if (c.typing) h += `<div class="row ai thinking">${orb("sm")}<div class="bubble ai"><span class="dots"><i></i><i></i><i></i></span></div></div>`;
    h += "</div></main>";
    const a = c.await;
    h += '<div class="composer-wrap g">';
    if (a && (a.chips || a.skip)) h += `<div class="quick">${arr(a.chips).map(ch => `<button class="qr" data-a="chip" data-v="${esc(ch)}">${esc(ch)}</button>`).join("")}${a.skip ? '<button class="qr ghost" data-a="chip" data-v="Prefiro não responder">Pular</button>' : ""}</div>`;
    const canType = !!(a && a.text);
    const ph = canType ? (S.listening === "chat-input" ? "Ouvindo… fale à vontade" : a.placeholder || "Escreva aqui…") : c.typing ? "Pensando…" : a && a.choose ? "Escolha um caminho acima" : a ? "Toque em uma opção" : "";
    h += `<div class="composer${canType ? "" : " off"}"><textarea id="chat-input" rows="1" data-bind="chat.input" placeholder="${esc(ph)}" aria-label="Sua resposta" ${canType ? "" : "disabled"}>${esc(c.input)}</textarea>${micBtn("chat-input", "chat.input", canType)}<button class="send" id="chat-send" data-a="send" aria-label="Enviar" ${canType && c.input.trim() ? "" : "disabled"}>${IC.send}</button></div></div>`;
    if (S.sheet) h += sheetHTML(c);
    return h;
  }

  function sheetHTML(c) {
    const a = c.dec.alternativas.find(x => x.id === c.sel);
    return `<div class="scrim" data-a="closeSheet"><div class="sheet g" role="dialog" aria-label="Registrar decisão" data-stop="1"><span class="grab"></span>
      <div class="blk"><h2>Registrar decisão</h2><p class="sub">${esc(a ? a.titulo : "")}</p></div>
      <div class="fld"><span class="fl">Quanto você confia nessa escolha?</span><div class="conf"><input type="range" id="conf" min="10" max="100" step="5" data-bind="chat.reg.confianca" value="${c.reg.confianca}" aria-label="Confiança"><output id="conf-val">${c.reg.confianca}%</output></div><p class="hint">Na revisão, vamos comparar essa confiança com o que aconteceu.</p></div>
      <div class="fld"><label for="succ">Como você vai saber que deu certo?</label><textarea class="field" id="succ" rows="2" data-bind="chat.reg.sucesso">${esc(c.reg.sucesso)}</textarea></div>
      <div class="fld"><span class="fl">Revisar em</span><div class="opts">${REV.map(([d, l]) => `<button class="opt" data-a="rev" data-v="${d}" aria-pressed="${c.reg.revisao === d}">${l}</button>`).join("")}</div></div>
      <button class="btn" data-a="register">Registrar decisão</button><button class="btn sec" data-a="closeSheet">Voltar aos caminhos</button></div></div>`;
  }

  const statusPill = d => (d.revisao ? '<span class="pill ok">Revisada</span>' : isDue(d) ? '<span class="pill warn">Revisar agora</span>' : `<span class="pill">Revisão em ${fmt(d.revisaoEm)}</span>`);

  function vHistory() {
    let h = hdr(backBtn("go", "home"), "<span>Suas decisões</span>");
    h += `<main class="scroll"><div class="pad g">${banner()}`;
    if (!S.decisions.length) h += '<p class="hint">Você ainda não registrou decisões. Abaixo, um exemplo para você ver como funciona a revisão.</p>';
    h += '<div class="list">';
    allDecisions().forEach(d => {
      const n = arr(d.acoes).length, f = arr(d.acoes).filter(a => a.feito).length;
      h += `<button class="item" data-a="go" data-v="detail" data-p="${esc(d.id)}"><span class="tt">${esc(decTitle(d))}</span><span class="mt">${statusPill(d)}<span>${fmt(d.criadaEm)}</span><span>· ${d.confianca}% de confiança</span>${n ? `<span>· ${f}/${n} passos</span>` : ""}${d.exemplo ? '<span class="ex">Exemplo</span>' : ""}</span></button>`;
    });
    h += "</div></div></main>";
    return h + '<div class="composer-wrap g"><button class="btn" data-a="newDecision">Nova decisão</button></div>';
  }

  function vDetail() {
    const d = findDecision(S.param); if (!d) { S.view = "history"; return vHistory(); }
    let h = hdr(backBtn("go", "history"), "<span>Registro</span>");
    h += `<main class="scroll"><div class="pad g">${banner()}`;
    h += `<div class="blk"><h1 class="h2">${esc(decTitle(d))}</h1><span class="mt">${statusPill(d)}<span>Registrada em ${fmt(d.criadaEm)}</span>${d.exemplo ? '<span class="ex">Exemplo</span>' : ""}</span></div>`;
    h += '<div class="card kv">';
    h += `<div class="blk"><p class="lbl">Contexto</p><p>${esc(d.situacao)}</p></div>`;
    if (d.objetivo) h += `<div class="blk"><p class="lbl">Objetivo</p><p>${esc(d.objetivo)}</p></div>`;
    h += `<div class="blk"><p class="lbl">Caminhos considerados</p><ul class="alist">${arr(d.alternativas).map(a => `<li><span class="${a.id === d.escolhaId ? "ck" : "no"}">${a.id === d.escolhaId ? "✓" : "·"}</span><span>${esc(a.titulo)}${a.id === (d.recomendacao || {}).id ? ' <span class="pill">recomendado</span>' : ""}</span></li>`).join("")}</ul></div>`;
    if (d.recomendacao && d.recomendacao.porque) h += `<div class="blk"><p class="lbl">Justificativa</p><p>${esc(d.escolhaId === d.recomendacao.id ? d.recomendacao.porque : "Você escolheu um caminho diferente do recomendado. A recomendação era: " + d.recomendacao.porque)}</p></div>`;
    h += `<div class="blk"><p class="lbl">Confiança</p><p>${d.confianca}%</p></div>`;
    h += `<div class="blk"><p class="lbl">Resultado esperado</p><p>${esc(d.sucesso)}</p></div>`;
    h += `<div class="blk"><p class="lbl">Revisão</p><p>${d.revisao ? "Feita em " + fmt(d.revisao.em) : "Prevista para " + fmt(d.revisaoEm)}</p></div></div>`;
    if (arr(d.acoes).length) h += `<div class="card"><p class="lbl">Próximos passos</p><div class="acts">${d.acoes.map((a, i) => actRow(d, a, i, false)).join("")}</div></div>`;
    if (d.revisao) {
      const r = d.revisao;
      h += `<div class="card kv"><p class="lbl">Resultado real e aprendizado</p><div class="blk"><p class="lbl">O que aconteceu</p><p>${esc(r.aconteceu)}</p></div><div class="blk"><p class="lbl">Objetivo atingido</p><p>${esc(r.atingido)}</p></div><div class="blk"><p class="lbl">Decisão bem tomada</p><p>${esc(r.processo)}</p></div>`;
      if (r.ia) h += `<div class="note"><b>Aprendizado</b>${esc(r.ia.aprendizado)}</div><div class="note warn"><b>Calibração</b>${esc(r.ia.calibracao)}</div>`;
      h += "</div>";
    }
    h += "</div></main>";
    if (!d.revisao) h += `<div class="composer-wrap g"><button class="btn" data-a="review" data-v="${esc(d.id)}">${isDue(d) ? "Revisar agora" : "Antecipar revisão"}</button></div>`;
    return h;
  }

  function chips(bind, options, current) {
    return `<div class="opts">${options.map(o => `<button class="opt" data-a="pfOpt" data-v="${esc(bind)}|${esc(o)}" aria-pressed="${current === o}">${esc(o)}</button>`).join("")}</div>`;
  }
  function vProfile() {
    const p = S.pf;
    let h = hdr(backBtn("go", "home"), "<span>Seu contexto</span>");
    h += `<main class="scroll"><div class="pad g">${banner()}<p class="hint">O I Can Do usa essas quatro camadas para entender cada decisão. Quanto mais completo, mais personalizada a análise.</p>`;
    h += `<div class="card"><p class="lbl">Quem sou</p>
      <div class="fld"><label for="pf-nome">Nome</label><input class="field" id="pf-nome" data-bind="pf.nome" value="${esc(p.nome)}"></div>
      <div class="fld"><label for="pf-estilo">Como costuma decidir</label><input class="field" id="pf-estilo" data-bind="pf.quemSou.estilo" value="${esc(p.quemSou.estilo)}">${chips("pf.quemSou.estilo", OPT.estilo, p.quemSou.estilo)}</div></div>`;
    h += `<div class="card"><p class="lbl">Onde estou</p>
      <div class="fld"><label for="pf-mom">Empresa e momento</label><textarea class="field" id="pf-mom" rows="2" data-bind="pf.ondeEstou.momento">${esc(p.ondeEstou.momento)}</textarea></div>
      <div class="fld"><span class="fl">Autonomia para decidir</span>${chips("pf.ondeEstou.autonomia", OPT.autonomia, p.ondeEstou.autonomia)}</div></div>`;
    h += `<div class="card"><p class="lbl">O que faço</p>
      <div class="fld"><label for="pf-fun">Função</label><input class="field" id="pf-fun" data-bind="pf.oQueFaco.funcao" value="${esc(p.oQueFaco.funcao)}"></div>
      <div class="fld"><label for="pf-cob">Pelo que sou mais cobrado</label><textarea class="field" id="pf-cob" rows="2" data-bind="pf.oQueFaco.cobranca">${esc(p.oQueFaco.cobranca)}</textarea></div></div>`;
    h += `<div class="card"><p class="lbl">Quem está ao meu redor</p>
      <div class="fld"><span class="fl">Pessoas que lidero diretamente</span>${chips("pf.aoRedor.time", OPT.time, p.aoRedor.time)}</div>
      <div class="people">${p.aoRedor.pessoas.map((x, i) => `<div class="person"><span class="pn"><b>${esc(x.nome)}</b>${x.papel ? " · " + esc(x.papel) : ""}${x.nota ? `<span class="am">${esc(x.nota)}</span>` : ""}</span><button class="icon-btn sm" data-a="pfDel" data-v="${i}" aria-label="Remover ${esc(x.nome)}">${IC.x}</button></div>`).join("") || '<p class="hint">Nenhuma pessoa cadastrada.</p>'}</div>
      <div class="fld"><span class="fl">Adicionar pessoa</span><div class="row2"><input class="field" id="np-nome" placeholder="Nome" data-bind="np.nome" value="${esc(S.np.nome)}"><input class="field" id="np-papel" placeholder="Papel" data-bind="np.papel" value="${esc(S.np.papel)}"></div><input class="field" id="np-nota" placeholder="Observação (opcional): momento, maturidade, relação" data-bind="np.nota" value="${esc(S.np.nota)}"><button class="btn sec" data-a="pfAdd">Adicionar</button></div></div>`;
    h += '<button class="btn" data-a="saveProfile">Salvar contexto</button>';
    h += `<div class="card"><p class="lbl">Conta</p>${S.session ? `<p class="hint">Conectado como ${esc(S.session.user.email)}</p><button class="btn sec" data-a="logout">Sair</button>` : '<p class="hint">Modo local: os dados ficam só neste navegador.</p>'}
      ${S.resetArm ? '<button class="btn danger" data-a="resetDo">Confirmar: apagar tudo</button><button class="btn sec" data-a="resetCancel">Cancelar</button>' : '<button class="btn sec" data-a="resetArm">Apagar meus dados</button>'}</div>`;
    return h + "</div></main>";
  }

  const vSplash = () => `<div class="splash">${orb("lg")}<b>I Can Do</b><span>Carregando…</span></div>`;

  /* ---------- render ---------- */
  let lastKey = "", lastCount = 0;
  function autoGrow(t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 132) + "px"; }
  function render() {
    const sc = $app.querySelector(".scroll");
    const prevTop = sc ? sc.scrollTop : 0;
    const key = S.view + "|" + (S.param || "") + "|" + (S.chat && S.view === "chat" ? S.chat.kind : "");
    const count = S.chat ? S.chat.msgs.length + (S.chat.typing ? 1 : 0) + (S.chat.await ? 0.5 : 0) : 0;
    let h;
    if (!S.ready) h = vSplash();
    else if (sb && !S.session) h = vLogin();
    else if (S.view === "chat" && S.chat) h = vChat();
    else if (S.view === "history") h = vHistory();
    else if (S.view === "detail") h = vDetail();
    else if (S.view === "profile") h = vProfile();
    else h = vHome();
    $app.innerHTML = h;
    const nsc = $app.querySelector(".scroll");
    if (nsc) {
      if (S.view === "chat" && S.chat && (key !== lastKey || count !== lastCount)) {
        const last = S.chat.msgs[S.chat.msgs.length - 1] || {};
        const cards = nsc.querySelectorAll(".card");
        if (last.decision && cards.length && !S.chat.typing && !S.chat.locked && count !== lastCount) nsc.scrollTop = cards[cards.length - 1].offsetTop - 12;
        else nsc.scrollTop = nsc.scrollHeight;
      } else if (key === lastKey) nsc.scrollTop = prevTop;
    }
    lastKey = key; lastCount = count;
    $app.querySelectorAll("textarea[rows='1']").forEach(autoGrow);
    if (S.view === "chat" && S.chat && S.chat.await && S.chat.await.text && !S.sheet && !S.listening && matchMedia("(pointer:fine)").matches) {
      const t = document.getElementById("chat-input"); if (t) t.focus();
    }
  }

  /* ---------- eventos ---------- */
  const onInput = e => {
    const t = e.target; if (!t.dataset || !t.dataset.bind) return;
    setPath(t.dataset.bind, t.type === "range" ? +t.value : t.value);
    if (t.tagName === "TEXTAREA" && t.rows === 1) autoGrow(t);
    if (t.id === "conf") document.getElementById("conf-val").textContent = t.value + "%";
    syncSend();
  };
  const onKey = e => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
    if (e.target.id === "home-input") { e.preventDefault(); A.start(); }
    else if (e.target.id === "chat-input") { e.preventDefault(); A.send(); }
  };
  const onClick = e => {
    const b = e.target.closest("[data-a]"); if (!b || !$app.contains(b)) return;
    if (b.dataset.a === "closeSheet" && b.classList.contains("scrim") && e.target.closest("[data-stop]")) return;
    const fn = A[b.dataset.a]; if (fn) { e.preventDefault(); fn(b.dataset.v, b); }
  };
  const onSubmit = e => {
    const f = e.target.closest("[data-form]"); if (!f) return;
    e.preventDefault();
    if (f.dataset.form === "email") A.sendLink(); else A.verify();
  };
  $app.addEventListener("input", onInput);
  $app.addEventListener("keydown", onKey);
  $app.addEventListener("click", onClick);
  $app.addEventListener("submit", onSubmit);

  const A = {
    go: (v, b) => go(v, b && b.dataset.p),
    newDecision: () => go("home", null, true),
    tip: v => { S.draft = TIPS[+v]; render(); const t = document.getElementById("home-input"); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } },
    start: () => { const t = S.draft.trim(); if (t.length < 8) return; stopMic(); S.draft = ""; decisionFlow(t); },
    send: () => { const c = S.chat; if (!c || !c.await || !c.await.text) return; const v = c.input.trim(); if (v) answer(v); },
    chip: v => answer(v),
    mic: v => { const [id, bind] = v.split("|"); toggleMic(id, bind); },
    leave: () => go("home"),
    skipOnb: () => { lsSet(skipKey(), true); go("home"); },
    alt: v => { const c = S.chat; if (!c || c.locked) return; c.sel = v; render(); },
    openSheet: () => { S.sheet = true; render(); },
    closeSheet: () => { S.sheet = false; render(); },
    rev: v => { S.chat.reg.revisao = +v; render(); },
    register: () => register(),
    act: v => { const [id, i] = v.split("|"); toggleAction(id, +i); },
    review: v => reviewFlow(v),
    pfOpt: v => { const k = v.indexOf("|"); setPath(v.slice(0, k), v.slice(k + 1)); render(); },
    pfAdd: () => { const n = str(S.np.nome); if (!n) return; S.pf.aoRedor.pessoas.push({ id: uid(), nome: n, papel: str(S.np.papel), nota: str(S.np.nota) }); S.np = { nome: "", papel: "", nota: "" }; render(); },
    pfDel: v => { S.pf.aoRedor.pessoas.splice(+v, 1); render(); },
    saveProfile: () => { S.profile = clone(S.pf); store.saveProfile(); go("home"); },
    resetArm: () => { S.resetArm = true; render(); },
    resetCancel: () => { S.resetArm = false; render(); },
    resetDo: async () => { await store.reset().catch(() => {}); S.decisions = []; S.profile = null; S.draft = ""; try { localStorage.removeItem(skipKey()); } catch {} onboarding(); },
    logout: async () => { await sb.auth.signOut(); },
    sendLink: async () => {
      const a = S.auth; const email = str(a.email).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { a.msg = "Digite um e-mail válido."; return render(); }
      a.busy = true; a.msg = ""; render();
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin } });
      a.busy = false;
      if (error && error.status === 429) { a.step = "code"; a.email = email; a.msg = "Um link já foi enviado há pouco para este e-mail. Confira a caixa de entrada e o spam. Se não chegou, espere um minuto e peça de novo."; }
      else if (error) a.msg = "Não consegui enviar o e-mail. Confira o endereço e tente de novo.";
      else { a.step = "code"; a.email = email; }
      render();
    },
    verify: async () => {
      const a = S.auth; const token = str(a.code).replace(/\D/g, "");
      if (token.length < 6) { a.msg = "Digite o código que chegou no e-mail."; return render(); }
      a.busy = true; a.msg = ""; render();
      const { error } = await sb.auth.verifyOtp({ email: a.email, token, type: "email" });
      a.busy = false;
      if (error) { a.msg = "Código inválido ou expirado. Peça um novo link."; render(); }
    },
    authBack: () => { S.auth = { step: "email", email: S.auth.email, code: "", msg: "", busy: false }; render(); }
  };

  /* ---------- início ---------- */
  let loadedFor = null;
  async function loadAndBoot() {
    S.ready = false; render();
    try {
      const data = await store.load();
      S.profile = data.profile ? fullProfile(data.profile) : null;
      S.decisions = data.decisions;
    } catch (e) { console.error(e); S.saveErr = "Não consegui carregar seus dados. Recarregue a página."; }
    S.ready = true;
    if (!S.profile && !lsGet(skipKey())) onboarding(); else go("home");
  }
  render();
  if (sb) {
    sb.auth.onAuthStateChange((_ev, session) => {
      S.session = session;
      if (session && loadedFor !== session.user.id) { loadedFor = session.user.id; S.auth = { step: "email", email: "", code: "", msg: "", busy: false }; setTimeout(loadAndBoot, 0); }
      else if (!session) { loadedFor = null; S.ready = true; S.profile = null; S.decisions = []; S.view = "home"; S.chat = null; render(); }
    });
  } else {
    loadAndBoot();
  }

  return () => {
    stopMic();
    $app.removeEventListener("input", onInput); $app.removeEventListener("keydown", onKey);
    $app.removeEventListener("click", onClick); $app.removeEventListener("submit", onSubmit);
    delete $app.dataset.started;
  };
}
