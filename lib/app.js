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
    profile: null, decisions: [], view: "home", linkError: "", ob: null, pfEdit: null, param: null, demo: false, chat: null, sheet: false,
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
  /* ---------- primeiro acesso em etapas ---------- */
  const LAYERS = [
    { n: "Quem sou", d: "Seu jeito de decidir" },
    { n: "Onde estou", d: "Empresa, momento e autonomia" },
    { n: "O que faço", d: "Função e o que cobram de você" },
    { n: "Quem está ao meu redor", d: "Time e pessoas-chave" }
  ];
  const LIC = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M8 8h3M8 12h3M8 16h3M2 21h20"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M17 14.5c2.4 0 4 1.6 4.8 4.5"/></svg>'
  ];
  const OB = [
    { k: "intro" },
    { k: "nome", L: 0, type: "text", bind: "nome", title: "Como podemos te chamar?", why: "É assim que vou falar com você.", ph: "Seu nome" },
    { k: "estilo", L: 0, type: "choice", bind: "quemSou.estilo", title: "Quando a decisão é importante, você costuma…", why: "Ajuda a equilibrar suas tendências: acelerar quando você trava, pausar quando você corre.",
      opts: [["Decido rápido e ajusto depois", "Prefiro agir e corrigir no caminho"], ["Analiso bastante antes", "Quero dados e tempo para pensar"], ["Ouço várias pessoas", "Construo a decisão junto"], ["Adio até ter certeza", "Evito errar, mesmo que demore"]] },
    { k: "momento", L: 1, type: "choice", bind: "ondeEstou.momento", other: "Descreva o momento da empresa", title: "Em que momento está a sua empresa?", why: "O mesmo problema pede caminhos diferentes numa empresa crescendo ou se reestruturando.",
      opts: [["Crescendo rápido", "Muita demanda, pouca estrutura"], ["Estável", "Rotina conhecida, foco em eficiência"], ["Reestruturando", "Mudanças de time, processo ou estratégia"], ["Começando agora", "Tudo sendo construído"]] },
    { k: "autonomia", L: 1, type: "choice", bind: "ondeEstou.autonomia", title: "Quanta autonomia você tem para decidir?", why: "Define se eu te ajudo a decidir, a propor ou a negociar.",
      opts: [["Decido quase tudo", "Só presto contas do resultado"], ["Decido, mas valido antes", "Proponho e alinho com a liderança"], ["Pouca, quase tudo sobe", "Dependo de aprovação para agir"]] },
    { k: "funcao", L: 2, type: "choice", bind: "oQueFaco.funcao", grid: true, other: "Sua função", title: "Qual é a sua função?", why: "Seu papel muda o que é decisão sua e o que é de outra pessoa.",
      opts: [["Coordenador(a)"], ["Gerente"], ["Diretor(a)"], ["Fundador(a)"]] },
    { k: "cobranca", L: 2, type: "choice", bind: "oQueFaco.cobranca", other: "Pelo que você é cobrado", title: "Pelo que você é mais cobrado?", why: "Vira critério na hora de comparar os caminhos.",
      opts: [["Prazo e entregas", "Cumprir o combinado"], ["Receita e resultado", "Impacto no número da empresa"], ["Qualidade", "Fazer bem feito"], ["Desenvolver o time", "Fazer as pessoas crescerem"]] },
    { k: "time", L: 3, type: "choice", bind: "aoRedor.time", grid: true, title: "Quantas pessoas você lidera diretamente?", why: "Muda o quanto você consegue acompanhar de perto.",
      opts: [["Nenhuma"], ["1 a 3"], ["4 a 8"], ["9 ou mais"]] },
    { k: "pessoas", L: 3, type: "people", title: "Quem são as pessoas-chave ao seu redor?", why: "Liderados, pares, seu gestor. Eu considero cada um nas suas decisões. Dá para completar depois." },
    { k: "done" }
  ];
  function onboarding() {
    if (S.chat && S.chat.ctl) S.chat.ctl.abort();
    stopMic();
    S.ob = { i: 0, p: fullProfile(S.profile || {}), other: false, otherText: "", np: { nome: "", papel: "" }, enter: true, lock: false };
    S.view = "onboard"; render();
  }
  const obStep = () => OB[S.ob.i];
  function obGo(d) {
    const o = S.ob; o.i = Math.max(0, Math.min(OB.length - 1, o.i + d)); o.other = false; o.otherText = ""; o.enter = true; o.lock = false;
    const st = obStep();
    if (st.type === "choice" && st.other) { const v = getPathIn(o.p, st.bind); if (v && !st.opts.some(x => x[0] === v)) { o.other = true; o.otherText = v; } }
    if (st.k === "done") { S.profile = clone(o.p); store.saveProfile(); }
    render();
  }
  function getPathIn(obj, path) { return path.split(".").reduce((x, k) => (x ? x[k] : undefined), obj); }
  function setPathIn(obj, path, v) { const k = path.split("."); let x = obj; for (let i = 0; i < k.length - 1; i++) x = x[k[i]]; x[k[k.length - 1]] = v; }
  function obValid() {
    const st = obStep(), o = S.ob;
    if (st.type === "text") return str(getPathIn(o.p, st.bind)).length > 0;
    if (st.type === "choice") return o.other ? str(o.otherText).length > 0 : !!getPathIn(o.p, st.bind);
    return true;
  }
  function vOnboard() {
    const o = S.ob, st = obStep();
    const prog = LAYERS.map((_, L) => {
      const steps = OB.map((s, i) => [s, i]).filter(([s]) => s.L === L);
      const done = steps.filter(([, i]) => i < o.i).length;
      return `<span class="seg L${L}"><i style="width:${Math.round((done / steps.length) * 100)}%"></i></span>`;
    }).join("");
    const left = o.i > 0 && st.k !== "done" ? backBtn("obBack") : '<span class="spacer"></span>';
    const right = st.k === "done" ? '<span class="spacer"></span>' : '<button class="pillbtn" data-a="skipOnb">Pular</button>';
    let h = `<header class="hdr g">${left}<div class="ob-progress" aria-label="Progresso">${st.k === "intro" ? "" : prog}</div>${right}</header>`;
    h += `<main class="scroll"><div class="ob g${o.enter ? " enter" : ""}">`;
    let foot = "";
    if (st.k === "intro") {
      h += `<div class="ob-hero">${orb("lg")}<h1>Antes de decidir, quero te conhecer</h1><p class="why">São 4 partes rápidas. Elas fazem cada análise ser sobre você, e não genérica.</p></div><div class="layers">`;
      LAYERS.forEach((l, i) => { h += `<div class="lrow L${i}"><span class="lic">${LIC[i]}</span><span class="lt"><b>${l.n}</b><span>${l.d}</span></span><span class="ln">${i + 1}</span></div>`; });
      h += "</div>";
      foot = '<button class="btn" data-a="obNext">Começar · 2 min</button>';
    } else if (st.k === "done") {
      const p = o.p;
      const rows = [
        [p.nome, p.quemSou.estilo],
        [p.ondeEstou.momento, p.ondeEstou.autonomia],
        [p.oQueFaco.funcao, p.oQueFaco.cobranca && "Cobrado por: " + p.oQueFaco.cobranca],
        [p.aoRedor.time && "Lidera: " + p.aoRedor.time, p.aoRedor.pessoas.length ? p.aoRedor.pessoas.map(x => x.nome).join(", ") : ""]
      ];
      h += `<div class="ob-hero">${orb("lg")}<h1>Tudo pronto${p.nome ? ", " + esc(p.nome) : ""}.</h1><p class="why">Este é o seu contexto. Ele entra em cada análise, e você ajusta no perfil quando quiser.</p></div><div class="sum">`;
      LAYERS.forEach((l, i) => {
        const vals = rows[i].filter(Boolean);
        h += `<div class="scard L${i}"><span class="sh"><span class="lic sm">${LIC[i]}</span>${l.n}</span>${vals.length ? vals.map(v => `<span class="sv">${esc(v)}</span>`).join("") : '<span class="sv muted">Não informado</span>'}</div>`;
      });
      h += "</div>";
      foot = '<button class="btn" data-a="obFinish">Fazer minha primeira decisão</button>';
    } else {
      const L = st.L, nIn = OB.filter(s => s.L === L).indexOf(st) + 1, tot = OB.filter(s => s.L === L).length;
      h += `<span class="layer-badge L${L}"><span class="lic sm">${LIC[L]}</span>${LAYERS[L].n}<span class="lcount">${nIn}/${tot}</span></span>`;
      h += `<h1 class="ob-t">${esc(st.title)}</h1><p class="why">${esc(st.why)}</p>`;
      if (st.type === "text") {
        h += `<input class="field big" id="ob-text" data-bind="ob.p.${st.bind}" value="${esc(getPathIn(o.p, st.bind))}" placeholder="${esc(st.ph)}" autocomplete="given-name" enterkeyhint="next">`;
        foot = `<button class="btn" id="ob-next" data-a="obNext" ${obValid() ? "" : "disabled"}>Continuar</button>`;
      } else if (st.type === "choice") {
        const cur = getPathIn(o.p, st.bind);
        h += `<div class="choices${st.grid ? " grid" : ""}">`;
        st.opts.forEach(([t, d]) => {
          const on = !o.other && cur === t;
          h += `<button class="choice" data-a="obPick" data-v="${esc(t)}" aria-pressed="${on}"><span class="cb"><span class="ct">${esc(t)}</span>${d ? `<span class="cd">${esc(d)}</span>` : ""}</span><span class="ck">${on ? IC.check : ""}</span></button>`;
        });
        if (st.other) h += `<button class="choice other" data-a="obOther" aria-pressed="${o.other}"><span class="cb"><span class="ct">Outra resposta</span><span class="cd">Escrever do meu jeito</span></span><span class="ck">${o.other ? IC.check : ""}</span></button>`;
        h += "</div>";
        if (o.other) h += `<textarea class="field" id="ob-other" rows="2" data-bind="ob.otherText" placeholder="${esc(st.other)}">${esc(o.otherText)}</textarea>`;
        foot = `<button class="btn" id="ob-next" data-a="obNext" ${obValid() ? "" : "disabled"}>Continuar</button>`;
      } else if (st.type === "people") {
        const ps = o.p.aoRedor.pessoas;
        h += `<div class="padd"><div class="row2"><input class="field" id="np-n" placeholder="Nome" data-bind="ob.np.nome" value="${esc(o.np.nome)}" enterkeyhint="next"><input class="field" id="np-p" placeholder="Papel (ex.: analista)" data-bind="ob.np.papel" value="${esc(o.np.papel)}" enterkeyhint="done"></div><button class="btn sec" data-a="obAddP">Adicionar pessoa</button></div>`;
        if (ps.length) h += `<div class="pchips">${ps.map((x, i) => `<span class="chipp"><b>${esc(x.nome)}</b>${x.papel ? `<span>${esc(x.papel)}</span>` : ""}<button data-a="obDelP" data-v="${i}" aria-label="Remover ${esc(x.nome)}">${IC.x}</button></span>`).join("")}</div>`;
        foot = `<button class="btn" data-a="obNext">${ps.length ? "Continuar" : "Pular por agora"}</button>`;
      }
    }
    h += "</div></main>";
    h += `<div class="ob-foot g">${foot}</div>`;
    o.enter = false;
    return h;
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
    const n = document.getElementById("ob-next"); if (n && S.ob) n.disabled = !obValid();
  }

  /* ---------- navegação ---------- */
  function go(view, param, focusInput) {
    if (S.chat && S.chat.ctl && view !== "chat") S.chat.ctl.abort();
    stopMic();
    S.view = view; S.param = param || null; S.sheet = false; S.resetArm = false;
    if (view === "profile") { S.pfEdit = null; S.pf = null; S.np = { nome: "", papel: "", nota: "" }; }
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

  /* ---------- perfil: contexto guardado ---------- */
  const BRAIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3.5a3 3 0 0 0-3 3 3 3 0 0 0-2.6 4.6A3.5 3.5 0 0 0 5.6 17a3 3 0 0 0 3.9 3V3.5z"/><path d="M14.5 3.5a3 3 0 0 1 3 3 3 3 0 0 1 2.6 4.6 3.5 3.5 0 0 1-1.7 5.9 3 3 0 0 1-3.9 3V3.5z"/><path d="M9.5 9.5H7.6M14.5 9.5h1.9M9.5 14.5H8.2M14.5 14.5h1.3"/></svg>';
  const PF_FIELDS = [
    [["nome", "Nome", "input"], ["quemSou.estilo", "Como costumo decidir", "textarea"]],
    [["ondeEstou.momento", "Empresa e momento", "textarea"], ["ondeEstou.autonomia", "Autonomia para decidir", "textarea"]],
    [["oQueFaco.funcao", "Função", "input"], ["oQueFaco.cobranca", "Pelo que sou mais cobrado", "textarea"]],
    [["aoRedor.time", "Pessoas que lidero diretamente", "input"]]
  ];
  function vProfile() {
    const p = fullProfile(S.profile || {});
    const g = mindGraph();
    const ini = (p.nome || (S.session && S.session.user.email) || "?").trim().charAt(0).toUpperCase();
    let h = hdr(backBtn("go", "home"), "<span>Seu contexto</span>", `<button class="icon-btn" data-a="go" data-v="mind" aria-label="My Mind">${BRAIN}</button>`);
    h += `<main class="scroll"><div class="pad g">${banner()}`;
    h += `<div class="me-head"><span class="avatar">${esc(ini)}</span><span class="mh"><b>${esc(p.nome || "Sem nome")}</b><span>${esc(p.oQueFaco.funcao || (S.session ? S.session.user.email : "Modo local"))}</span></span></div>`;
    h += `<button class="mind-card" data-a="go" data-v="mind"><span class="mc-stars" aria-hidden="true"></span><span class="mc-ic">${BRAIN}</span><span class="mc-t"><b>My Mind</b><span>Seu cérebro de decisões · ${g.counts.d} ${g.counts.d === 1 ? "decisão" : "decisões"} · ${g.counts.e} conexões</span></span><span class="mc-go">${IC.back}</span></button>`;
    h += '<p class="hint">Este é o contexto que entra em cada análise. Toque em Editar para atualizar uma camada.</p>';
    LAYERS.forEach((l, L) => {
      const editing = S.pfEdit === L;
      h += `<section class="ctx-card L${L}${editing ? " editing" : ""}"><header class="cc-h"><span class="lic">${LIC[L]}</span><span class="cc-t"><b>${l.n}</b><span>${l.d}</span></span>${editing ? "" : `<button class="cc-edit" data-a="pfEdit" data-v="${L}">Editar</button>`}</header>`;
      if (!editing) {
        h += '<dl class="cc-v">';
        PF_FIELDS[L].forEach(([path, label]) => { const v = str(getPathIn(p, path)); h += `<dt>${label}</dt><dd${v ? "" : ' class="empty"'}>${v ? esc(v) : "Não informado"}</dd>`; });
        if (L === 3) h += `<dt>Pessoas-chave</dt><dd${p.aoRedor.pessoas.length ? "" : ' class="empty"'}>${p.aoRedor.pessoas.length ? p.aoRedor.pessoas.map(x => `<span class="pp"><b>${esc(x.nome)}</b>${x.papel ? " · " + esc(x.papel) : ""}${x.nota ? `<span class="am">${esc(x.nota)}</span>` : ""}</span>`).join("") : "Nenhuma cadastrada"}</dd>`;
        h += "</dl>";
      } else {
        const d = S.pf;
        PF_FIELDS[L].forEach(([path, label, kind]) => {
          const id = "pf-" + path.replace(".", "-"), v = esc(getPathIn(d, path));
          h += `<div class="fld"><label for="${id}">${label}</label>${kind === "input" ? `<input class="field" id="${id}" data-bind="pf.${path}" value="${v}">` : `<textarea class="field" id="${id}" rows="2" data-bind="pf.${path}">${v}</textarea>`}</div>`;
        });
        if (L === 3) {
          h += `<div class="fld"><span class="fl">Pessoas-chave</span><div class="people">${d.aoRedor.pessoas.map((x, i) => `<div class="person"><span class="pn"><b>${esc(x.nome)}</b>${x.papel ? " · " + esc(x.papel) : ""}</span><button class="icon-btn sm" data-a="pfDel" data-v="${i}" aria-label="Remover ${esc(x.nome)}">${IC.x}</button></div>`).join("")}</div>
            <div class="row2"><input class="field" id="np-nome" placeholder="Nome" data-bind="np.nome" value="${esc(S.np.nome)}"><input class="field" id="np-papel" placeholder="Papel" data-bind="np.papel" value="${esc(S.np.papel)}"></div>
            <input class="field" id="np-nota" placeholder="Observação (opcional): maturidade, momento, relação" data-bind="np.nota" value="${esc(S.np.nota)}"><button class="btn sec" data-a="pfAdd">Adicionar pessoa</button></div>`;
        }
        h += '<div class="cc-act"><button class="btn sec" data-a="pfCancel">Cancelar</button><button class="btn" data-a="pfSave">Salvar</button></div>';
      }
      h += "</section>";
    });
    h += `<div class="card"><p class="lbl">Conta</p>${S.session ? `<p class="hint">Conectado como ${esc(S.session.user.email)}</p>` : '<p class="hint">Modo local: os dados ficam só neste navegador.</p>'}
      <button class="btn sec" data-a="redoOnb">Refazer apresentação</button>${S.session ? '<button class="btn sec" data-a="logout">Sair</button>' : ""}
      ${S.resetArm ? '<button class="btn danger" data-a="resetDo">Confirmar: apagar tudo</button><button class="btn sec" data-a="resetCancel">Cancelar</button>' : '<button class="btn sec" data-a="resetArm">Apagar meus dados</button>'}</div>`;
    return h + "</div></main>";
  }

  /* ---------- My Mind: a galáxia das decisões ---------- */
  const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function relevance(d) {
    const age = Math.max(0, (Date.now() - new Date(d.criadaEm).getTime()) / 864e5);
    let r = Math.exp(-age / 60);
    if (!d.revisao && isDue(d)) r += 0.35;
    if (arr(d.acoes).some(a => !a.feito)) r += 0.2;
    if (d.revisao) r = Math.max(r, 0.3) + 0.1;
    return Math.max(0.1, Math.min(1, r));
  }
  function mindGraph() {
    const p = fullProfile(S.profile || {});
    const ds = allDecisions();
    const nodes = [], edges = [];
    nodes.push({ id: "core", kind: "core", label: p.nome || "Você", rel: 1 });
    LAYERS.forEach((l, i) => nodes.push({ id: "L" + i, kind: "layer", L: i, label: l.n, rel: 0.8 }));
    let people = p.aoRedor.pessoas.map(x => ({ id: "p" + x.id, kind: "person", label: x.nome, sub: x.papel, nota: x.nota, rel: 0.5, key: norm(x.nome) }));
    if (!S.decisions.length && !people.length) people = [{ id: "pCaio", kind: "person", label: "Caio", sub: "exemplo", rel: 0.5, key: "caio" }, { id: "pBruna", kind: "person", label: "Bruna", sub: "exemplo", rel: 0.5, key: "bruna" }];
    nodes.push(...people);
    LAYERS.forEach((_, i) => edges.push(["core", "L" + i, 0.7]));
    people.forEach(x => edges.push(["L3", x.id, 0.45]));
    const sorted = ds.slice().sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)));
    sorted.forEach((d, k) => {
      const n = { id: "d" + d.id, kind: "decision", d, label: decTitle(d), rel: relevance(d), k };
      const text = norm([d.situacao, d.titulo, d.objetivo, arr(d.respostas).map(r => r.resposta).join(" "), arr(d.acoes).map(a => a.acao + " " + a.responsavel).join(" ")].join(" "));
      n.people = people.filter(x => x.key && new RegExp("\\b" + x.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(text)).map(x => x.id);
      nodes.push(n);
      edges.push(["core", n.id, 0.25]);
      n.people.forEach(pid => edges.push([pid, n.id, 0.8]));
      if (k > 0) edges.push(["d" + sorted[k - 1].id, n.id, 0.35]);
    });
    const dn = nodes.filter(n => n.kind === "decision");
    for (let i = 0; i < dn.length; i++) for (let j = i + 1; j < dn.length; j++) {
      if (dn[i].people.some(x => dn[j].people.includes(x))) edges.push([dn[i].id, dn[j].id, 0.6]);
    }
    const counts = { d: S.decisions.length, e: S.decisions.length ? edges.filter(e => e[0] !== "core").length : 0, l: S.decisions.filter(d => d.revisao).length };
    return { nodes, edges, counts, example: !S.decisions.length };
  }
  function vMind() {
    const g = mindGraph();
    return `<div class="mind" id="mind"><canvas id="mind-cv" aria-label="Mapa das suas decisões"></canvas>
      <header class="hdr g mind-h"><button class="icon-btn dark" data-a="go" data-v="profile" aria-label="Voltar">${IC.back}</button><div class="hdr-c"><span class="mind-ic">${BRAIN}</span>My Mind</div><span class="spacer"></span></header>
      <div class="mind-stats g"><span><b>${g.counts.d}</b> decisões</span><span><b>${g.counts.e}</b> conexões</span><span><b>${g.counts.l}</b> aprendizados</span></div>
      ${g.example ? '<p class="mind-ex g">Sua mente começa a se formar na primeira decisão. Por enquanto, um exemplo.</p>' : ""}
      <div class="mind-legend g"><span><i class="lg-b"></i>Brilho = relevância</span><span><i class="lg-g"></i>Aprendizado</span><span><i class="lg-a"></i>Revisar</span></div>
      <div class="mind-sheet g" id="mind-sheet" hidden></div></div>`;
  }
  let mindStop = null;
  function startMind() {
    if (mindStop) mindStop();
    const cv = document.getElementById("mind-cv"); if (!cv) return;
    const ctx = cv.getContext("2d");
    const g = mindGraph();
    const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // posições normalizadas: centro = você; camadas e pessoas por perto; decisões em espiral (mais antigas mais longe)
    const ds0 = g.nodes.filter(n => n.kind === "decision");
    const ageOf = n => Math.max(0, (Date.now() - new Date(n.d.criadaEm).getTime()) / 864e5);
    const maxAge = Math.max(30, ...ds0.map(ageOf));
    const ps0 = g.nodes.filter(x => x.kind === "person");
    g.nodes.forEach(n => {
      if (n.kind === "core") { n.r = 0; n.a = 0; }
      else if (n.kind === "layer") { n.r = 0.17; n.a = n.L * Math.PI / 2 + Math.PI / 4; }
      else if (n.kind === "person") { n.r = 0.34; n.a = (ps0.indexOf(n) / Math.max(1, ps0.length)) * Math.PI * 2 + 0.35; }
      else { const ageN = Math.log1p(ageOf(n)) / Math.log1p(maxAge); n.r = 0.5 + 0.46 * ageN + (n.k % 2 ? 0.03 : -0.03); n.a = n.k * 2.399 + 0.9; }
    });
    const stars = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.3 + 0.2, t: Math.random() * 6.28 }));
    let W = 0, H = 0, DPR = 1, RX = 1, RY = 1, CY = 0, rot = 0, sel = null, raf = 0, t0 = performance.now();
    function resize() {
      const r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      RX = W / 2 - 30; RY = Math.min(H * 0.34, RX * 1.55); CY = H * 0.47;
    }
    const pos = n => { const a = n.a + (n.kind === "decision" || n.kind === "person" ? rot : rot * 0.4); return [W / 2 + Math.cos(a) * n.r * RX, CY + Math.sin(a) * n.r * RY]; };
    const COL = { core: [190, 215, 255], decision: [111, 168, 255], gold: [255, 200, 90], due: [255, 150, 70], person: [190, 160, 255] };
    const LCOL = [[245, 165, 36], [45, 212, 191], [127, 166, 255], [179, 148, 255]];
    const colOf = n => n.kind === "core" ? COL.core : n.kind === "layer" ? LCOL[n.L] : n.kind === "person" ? COL.person : n.d.revisao ? COL.gold : isDue(n.d) ? COL.due : COL.decision;
    const sizeOf = n => n.kind === "core" ? 13 : n.kind === "layer" ? 5.5 : n.kind === "person" ? 5 : 4 + 6 * n.rel + (n.d.reversivel === false ? 1.5 : 0);
    function draw(now) {
      const t = (now - t0) / 1000;
      if (!reduce) rot += 0.00045;
      ctx.clearRect(0, 0, W, H);
      const neb = ctx.createRadialGradient(W * 0.5, CY, 0, W * 0.5, CY, Math.max(W, H) * 0.7);
      neb.addColorStop(0, "rgba(70,90,200,0.32)"); neb.addColorStop(0.35, "rgba(90,50,160,0.16)"); neb.addColorStop(1, "rgba(5,8,20,0)");
      ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
      stars.forEach(s => { const a = 0.35 + 0.35 * Math.sin(t * 1.3 + s.t); ctx.fillStyle = `rgba(220,230,255,${reduce ? 0.5 : a})`; ctx.fillRect(s.x * W, s.y * H, s.s, s.s); });
      g.edges.forEach(([a, b, w]) => {
        const A = byId[a], B = byId[b]; if (!A || !B) return;
        const [x1, y1] = pos(A), [x2, y2] = pos(B);
        const rel = Math.min(A.rel, B.rel), hot = sel && (sel === A || sel === B);
        const c = colOf(B.kind === "core" ? A : B);
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${hot ? 0.75 : (0.06 + 0.32 * rel) * w})`;
        ctx.lineWidth = hot ? 1.4 : 0.8;
        const mx = (x1 + x2) / 2 + (y2 - y1) * 0.12, my = (y1 + y2) / 2 - (x2 - x1) * 0.12;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
      });
      g.nodes.forEach(n => {
        const [x, y] = pos(n), c = colOf(n), s = sizeOf(n);
        const pulse = n.kind === "decision" && isDue(n.d) && !n.d.revisao && !reduce ? 1 + 0.25 * Math.sin(t * 3) : 1;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, s * 3.6 * pulse);
        glow.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.55 * n.rel})`); glow.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, s * 3.6 * pulse, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(${Math.min(255, c[0] + 40)},${Math.min(255, c[1] + 40)},${Math.min(255, c[2] + 30)},${0.25 + 0.75 * n.rel})`;
        ctx.beginPath(); ctx.arc(x, y, s, 0, 6.283); ctx.fill();
        if (n.kind === "decision" && n.d.revisao) { ctx.strokeStyle = `rgba(255,210,120,${0.4 + 0.4 * n.rel})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, s + 3.5, 0, 6.283); ctx.stroke(); }
        if (sel === n) { ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, s + 7, 0, 6.283); ctx.stroke(); }
        const showLabel = n.kind === "core" || n.kind === "person" || (n.kind === "decision" && n.rel > 0.45) || sel === n;
        if (showLabel) {
          ctx.font = `${n.kind === "core" ? 600 : 500} ${n.kind === "core" ? 13 : 11}px Poppins, Helvetica, Arial, sans-serif`;
          ctx.textAlign = "center"; ctx.fillStyle = `rgba(230,236,255,${n.kind === "decision" ? 0.35 + 0.6 * n.rel : 0.8})`;
          const lab = n.label.length > 26 ? n.label.slice(0, 25) + "…" : n.label;
          const tw = ctx.measureText(lab).width / 2;
          ctx.fillText(lab, Math.max(tw + 8, Math.min(W - tw - 8, x)), y + s + (n.kind === "core" ? 20 : 15));
        }
      });
      raf = requestAnimationFrame(draw);
    }
    function hit(ev) {
      const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      let best = null, bd = 26;
      g.nodes.forEach(n => { const [nx, ny] = pos(n), d = Math.hypot(nx - x, ny - y); if (d < bd) { bd = d; best = n; } });
      sel = best; showSheet(best, g);
    }
    resize(); raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize); ro.observe(cv);
    cv.addEventListener("click", hit);
    mindStop = () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("click", hit); mindStop = null; };
  }
  function showSheet(n, g) {
    const el = document.getElementById("mind-sheet"); if (!el) return;
    if (!n) { el.hidden = true; return; }
    const p = fullProfile(S.profile || {});
    let h = "";
    const close = '<button class="ms-x" data-a="mindClose" aria-label="Fechar">' + IC.x + "</button>";
    if (n.kind === "decision") {
      const d = n.d, pct = Math.round(n.rel * 100);
      const conn = g.nodes.filter(x => n.people.includes(x.id)).map(x => x.label);
      const linked = g.edges.filter(e => (e[0] === n.id || e[1] === n.id) && e[0].startsWith("d") && e[1].startsWith("d")).length;
      h = `${close}<p class="ms-k">${d.revisao ? "Aprendizado" : isDue(d) ? "Hora de revisar" : "Decisão"}${d.exemplo ? " · exemplo" : ""}</p><h3>${esc(decTitle(d))}</h3>
        <p class="ms-m">${fmt(d.criadaEm)} · ${d.confianca}% de confiança</p>
        <div class="ms-rel"><span>Relevância</span><span class="bar"><i style="width:${pct}%"></i></span><b>${pct >= 66 ? "alta" : pct >= 33 ? "média" : "baixa"}</b></div>
        ${conn.length || linked ? `<p class="ms-c">Conectada a ${[conn.join(", "), linked ? linked + (linked === 1 ? " decisão" : " decisões") : ""].filter(Boolean).join(" e ")}.</p>` : ""}
        ${d.revisao && d.revisao.ia ? `<p class="ms-l"><b>Aprendizado:</b> ${esc(d.revisao.ia.aprendizado)}</p>` : ""}
        <button class="btn" data-a="go" data-v="detail" data-p="${esc(d.id)}">Abrir registro</button>`;
    } else if (n.kind === "person") {
      const ds = g.nodes.filter(x => x.kind === "decision" && x.people.includes(n.id));
      h = `${close}<p class="ms-k">Pessoa</p><h3>${esc(n.label)}</h3>${n.sub ? `<p class="ms-m">${esc(n.sub)}</p>` : ""}${n.nota ? `<p class="ms-c">${esc(n.nota)}</p>` : ""}
        <p class="ms-c">${ds.length ? "Aparece em " + ds.length + (ds.length === 1 ? " decisão: " : " decisões: ") + ds.map(x => esc(x.label)).join(", ") + "." : "Ainda não aparece em nenhuma decisão."}</p>`;
    } else if (n.kind === "layer") {
      const v = [[p.nome, p.quemSou.estilo], [p.ondeEstou.momento, p.ondeEstou.autonomia], [p.oQueFaco.funcao, p.oQueFaco.cobranca], [p.aoRedor.time && "Lidera " + p.aoRedor.time, p.aoRedor.pessoas.map(x => x.nome).join(", ")]][n.L].filter(Boolean);
      h = `${close}<p class="ms-k">Camada de contexto</p><h3>${LAYERS[n.L].n}</h3><p class="ms-c">${v.length ? v.map(esc).join(" · ") : "Ainda não preenchida."}</p><button class="btn sec" data-a="go" data-v="profile">Editar no perfil</button>`;
    } else {
      h = `${close}<p class="ms-k">Você</p><h3>${esc(n.label)}</h3><p class="ms-c">${g.counts.d} decisões, ${g.counts.l} aprendizados. Nada aqui é esquecido: o que fica antigo perde brilho e vai para a borda da galáxia.</p>`;
    }
    el.innerHTML = h; el.hidden = false;
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
    else if (S.view === "onboard" && S.ob) h = vOnboard();
    else if (S.view === "chat" && S.chat) h = vChat();
    else if (S.view === "history") h = vHistory();
    else if (S.view === "detail") h = vDetail();
    else if (S.view === "profile") h = vProfile();
    else if (S.view === "mind") h = vMind();
    else h = vHome();
    if (mindStop && S.view !== "mind") mindStop();
    $app.innerHTML = h;
    if (S.view === "mind") startMind();
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
    if (S.view === "onboard" && S.ob && obStep().type === "text") { const t = document.getElementById("ob-text"); if (t && document.activeElement !== t) t.focus(); }
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
    else if (e.target.id === "ob-text") { e.preventDefault(); A.obNext(); }
    else if (e.target.id === "np-n") { e.preventDefault(); const t = document.getElementById("np-p"); if (t) t.focus(); }
    else if (e.target.id === "np-p") { e.preventDefault(); A.obAddP(); }
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
    skipOnb: () => { lsSet(skipKey(), true); if (S.ob && S.ob.p.nome && !S.profile) { S.profile = clone(S.ob.p); store.saveProfile(); } go("home"); },
    obNext: () => { if (obValid()) { const st = obStep(); if (st.type === "choice" && S.ob.other) setPathIn(S.ob.p, st.bind, str(S.ob.otherText)); obGo(1); } },
    obBack: () => obGo(-1),
    redoOnb: () => onboarding(),
    obPick: v => { const o = S.ob; if (o.lock) return; o.lock = true; o.other = false; setPathIn(o.p, obStep().bind, v); render(); setTimeout(() => { if (S.view === "onboard" && S.ob === o) obGo(1); }, 260); },
    obOther: () => { S.ob.other = true; render(); const t = document.getElementById("ob-other"); if (t) t.focus(); },
    obAddP: () => { const o = S.ob; const n = str(o.np.nome); if (!n) { const t = document.getElementById("np-n"); if (t) t.focus(); return; } o.p.aoRedor.pessoas.push({ id: uid(), nome: n, papel: str(o.np.papel), nota: "" }); o.np = { nome: "", papel: "" }; render(); const t = document.getElementById("np-n"); if (t) t.focus(); },
    obDelP: v => { S.ob.p.aoRedor.pessoas.splice(+v, 1); render(); },
    obFinish: () => { S.ob = null; go("home", null, true); },
    alt: v => { const c = S.chat; if (!c || c.locked) return; c.sel = v; render(); },
    openSheet: () => { S.sheet = true; render(); },
    closeSheet: () => { S.sheet = false; render(); },
    rev: v => { S.chat.reg.revisao = +v; render(); },
    register: () => register(),
    act: v => { const [id, i] = v.split("|"); toggleAction(id, +i); },
    review: v => reviewFlow(v),
    pfEdit: v => { S.pfEdit = +v; S.pf = fullProfile(clone(S.profile || {})); S.np = { nome: "", papel: "", nota: "" }; render(); },
    pfCancel: () => { S.pfEdit = null; S.pf = null; render(); },
    pfSave: () => { const n = str(S.np.nome); if (n) S.pf.aoRedor.pessoas.push({ id: uid(), nome: n, papel: str(S.np.papel), nota: str(S.np.nota) }); S.profile = clone(S.pf); store.saveProfile(); S.pfEdit = null; S.pf = null; render(); },
    pfAdd: () => { const n = str(S.np.nome); if (!n) return; S.pf.aoRedor.pessoas.push({ id: uid(), nome: n, papel: str(S.np.papel), nota: str(S.np.nota) }); S.np = { nome: "", papel: "", nota: "" }; render(); },
    pfDel: v => { S.pf.aoRedor.pessoas.splice(+v, 1); render(); },
    mindClose: () => { const el = document.getElementById("mind-sheet"); if (el) el.hidden = true; },
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
