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
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  const SPINE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/><path d="M14 6h4M10 12H6M14 18h4"/></svg>';
  /* nomes das pessoas do círculo em destaque dentro dos textos das decisões */
  let NAME_KEY = null, NAME_RE = null;
  const ACC = { a: "[aáàâã]", e: "[eéê]", i: "[ií]", o: "[oóôõ]", u: "[uúü]", c: "[cç]" };
  function nameRe() {
    const ns = fullProfile(S.profile || {}).aoRedor.pessoas.map(x => str(x.nome).trim()).filter(n => n.length >= 2);
    const key = ns.join("|");
    if (key === NAME_KEY) return NAME_RE;
    NAME_KEY = key;
    if (!ns.length) return (NAME_RE = null);
    const pat = ns.sort((a, b) => b.length - a.length).map(n => norm(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[aeiouc]/g, ch => ACC[ch]).replace(/\s+/g, "\\s+")).join("|");
    try { NAME_RE = new RegExp("(?<![\\p{L}\\p{N}])(?:" + pat + ")(?![\\p{L}\\p{N}])", "giu"); } catch { NAME_RE = null; }
    return NAME_RE;
  }
  const hl = t => { const e = esc(t), re = nameRe(); return re ? e.replace(re, m => `<b class="nm">${m}</b>`) : e; };
  const orb = size => `<span class="orb ${size}">${SPARK}</span>`;

  /* ---------- datas ---------- */
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isoLocal = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addDays = n => { const d = today(); d.setDate(d.getDate() + n); return isoLocal(d); };
  /* contador de dias até a revisão */
  const daysTo = iso => Math.round((new Date(String(iso).slice(0, 10) + "T00:00:00") - today()) / 864e5);
  const countdown = iso => { const n = daysTo(iso); return n > 1 ? `Faltam ${n} dias` : n === 1 ? "Falta 1 dia" : n === 0 ? "É hoje" : n === -1 ? "Atrasada há 1 dia" : `Atrasada há ${-n} dias`; };
  const revProgress = d => { const a = new Date(String(d.criadaEm).slice(0, 10) + "T00:00:00"), b = new Date(d.revisaoEm + "T00:00:00"); const tot = (b - a) / 864e5; return tot > 0 ? Math.max(0, Math.min(1, (today() - a) / 864e5 / tot)) : 1; };
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
  const emptyProfile = () => ({ nome: "", quemSou: { estilo: "", resumo: "", conversa: [], registros: [] }, ondeEstou: { momento: "", autonomia: "" }, oQueFaco: { funcao: "", cobranca: "" }, aoRedor: { time: "", pessoas: [] }, dores: [] });
  const fullProfile = p => {
    const e = emptyProfile(); p = p || {};
    return { nome: p.nome || "", quemSou: Object.assign(e.quemSou, p.quemSou), ondeEstou: Object.assign(e.ondeEstou, p.ondeEstou), oQueFaco: Object.assign(e.oQueFaco, p.oQueFaco), aoRedor: Object.assign(e.aoRedor, p.aoRedor, { pessoas: arr(p.aoRedor && p.aoRedor.pessoas) }), dores: arr(p.dores) };
  };

  /* ---------- estado ---------- */
  const S = {
    ready: false, session: null, auth: { step: "email", email: "", code: "", msg: "", busy: false },
    profile: null, decisions: [], view: "home", linkError: "", ob: null, pfEdit: null, video: false, daily: null, repPeriod: 90, reports: {}, copyMsg: "", param: null, demo: false, chat: null, sheet: false,
    draft: "", speaking: false, resetArm: false, pf: null, np: { nome: "", papel: "", nota: "" }, saveErr: "", listening: null, micMsg: ""
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

  /* ---------- Decision Quality ---------- */
  const DQ_KEYS = ["enquadramento", "alternativas", "informacao", "valores", "raciocinio", "compromisso"];
  const DQ_LABEL = { enquadramento: "Enquadramento", alternativas: "Alternativas", informacao: "Informação", valores: "Valores e critérios", raciocinio: "Raciocínio", compromisso: "Compromisso" };
  function dqCommit(d) { let v = 0; if (str(d.sucesso)) v++; if (arr(d.acoes).length && d.revisaoEm) v++; return v; }
  function dqScore(dq) { if (!dq) return null; const t = DQ_KEYS.reduce((a, k) => a + (+dq[k] || 0), 0); return Math.round(t / 12 * 100); }
  function dqBlock(dq, dica, title) {
    if (!dq) return "";
    const sc = dqScore(dq);
    return `<div class="dq"><div class="dq-h"><span class="lbl">${title || "Qualidade desta decisão"} · Decision Quality</span><b>${sc}<small>/100</small></b></div><div class="dq-grid">${DQ_KEYS.map(k => `<span class="dqe-k">${DQ_LABEL[k]}</span><span class="dq-b">${[0, 1].map(i => `<i class="${(+dq[k] || 0) > i ? "on" : ""}"></i>`).join("")}</span>`).join("")}</div>${dica ? `<p class="dq-tip">${esc(dica)}</p>` : ""}</div>`;
  }

  /* ---------- IA ---------- */
  const NORM = {
    clarify: (r, p) => ({
      decisor: r.decisor && typeof r.decisor === "object" ? { quem: str(r.decisor.quem), papel: str(r.decisor.papel_usuario), nota: str(r.decisor.nota) } : null,
      conexoes: arr(r.conexoes).map(c => ({ id: str(c && c.id), relacao: str(c && c.relacao), motivo: str(c && c.motivo) })).filter(c => c.id && arr(p.cerebro).some(d => d.id === c.id)).slice(0, 5),
      afetados: arr(r.afetados).map(str).filter(Boolean).slice(0, 4),
      pessoas: arr(r.pessoas).map(x => ({ nome: str(x && x.nome).slice(0, 60), papel: str(x && x.papel).slice(0, 80), nota: str(x && x.nota).slice(0, 140), pedido: !!(x && x.pedido) })).filter(x => x.nome).slice(0, 5),
      so_cadastro: !!r.so_cadastro, confirmacao: str(r.confirmacao),
      profundidade: (str(r.profundidade) === "curta" || str(r.profundidade) === "completa") ? str(r.profundidade) : (r.reversivel && /clara|complicada/.test(str(r.tipo)) ? "curta" : "completa"),
      titulo: str(r.titulo) || p.situacao.slice(0, 40), decisao: str(r.decisao), entendimento: str(r.entendimento), tipo: str(r.tipo), reversivel: !!r.reversivel, urgencia: str(r.urgencia),
      perguntas: arr(r.perguntas).slice(0, 4).map(q => ({ pergunta: str(q && q.pergunta), porque: str(q && q.porque), metodo: str(q && q.metodo), opcoes: arr(q && q.opcoes).map(str).filter(Boolean).slice(0, 4) })).filter(q => q.pergunta)
    }),
    decide: r => {
      const alts = arr(r.alternativas).slice(0, 4).map((a, i) => ({ id: str(a && a.id) || "abcd"[i], titulo: str(a && a.titulo), descricao: str(a && a.descricao), beneficios: arr(a && a.beneficios).map(str).filter(Boolean).slice(0, 2), riscos: arr(a && a.riscos).map(str).filter(Boolean).slice(0, 2) })).filter(a => a.titulo);
      const seen = new Set(); alts.forEach((a, i) => { if (seen.has(a.id)) a.id = a.id + i; seen.add(a.id); });
      const rec = r.recomendacao || {};
      const recId = alts.some(a => a.id === str(rec.id)) ? str(rec.id) : alts[0] && alts[0].id;
      const want = +r.revisao_dias || 14;
      const dias = [7, 14, 30, 90].reduce((b, v) => (Math.abs(v - want) < Math.abs(b - want) ? v : b), 14);
      return { objetivo: str(r.objetivo), fatos: arr(r.fatos).map(str).filter(Boolean).slice(0, 4), hipoteses: arr(r.hipoteses).map(str).filter(Boolean).slice(0, 3), alternativas: alts, recomendacao: { id: recId, metodo: str(rec.metodo), porque: str(rec.porque), mudaria: str(rec.mudaria) }, metodos: arr(r.metodos).slice(0, 3).map(m => ({ nome: str(m && m.nome), aplicacao: str(m && m.aplicacao) })).filter(m => m.nome), alerta_etico: str(r.alerta_etico), contexto: str(r.contexto), premortem: str(r.premortem), dq: DQ_KEYS.slice(0, 5).reduce((o, k) => { const v = Math.round(+((r.dq || {})[k])); o[k] = isFinite(v) ? Math.max(0, Math.min(2, v)) : 1; return o; }, {}), dq_dica: str(r.dq_dica), sinal_sucesso: str(r.sinal_sucesso), revisao_dias: dias };
    },
    actions: r => ({ acoes: arr(r.acoes).slice(0, 3).map(a => ({ acao: str(a && a.acao), responsavel: str(a && a.responsavel) || "Você", prazo: addDays(Math.max(1, Math.min(120, +(a && a.prazo_dias) || 7))), feito: false })).filter(a => a.acao) }),
    review: r => ({ leitura: str(r.leitura), aprendizado: str(r.aprendizado), calibracao: str(r.calibracao) }),
    daily: r => ({ frase: str(r.frase), porque: str(r.porque) }),
    calibrate: r => {
      const pf = r.perfil && typeof r.perfil === "object" ? r.perfil : {};
      const TIPOS = ["trajetoria", "estilo", "valor", "funcao", "cobranca", "empresa", "momento", "autonomia", "time", "pessoa", "objetivo", "dor"];
      return {
        fala: str(r.fala).slice(0, 600), encerrar: !!r.encerrar, resumo: str(r.resumo).slice(0, 900),
        registros: arr(r.registros).map(x => ({ tipo: norm(str(x && x.tipo)).replace(/[^a-z]/g, ""), texto: str(x && x.texto).slice(0, 140) })).filter(x => x.texto && TIPOS.includes(x.tipo)).slice(0, 6),
        perfil: ["estilo", "funcao", "cobranca", "momento", "autonomia", "time"].reduce((o, k) => { o[k] = str(pf[k]).slice(0, 120); return o; }, {}),
        pessoas: arr(r.pessoas).map(x => ({ nome: str(x && x.nome).slice(0, 60), papel: str(x && x.papel).slice(0, 80) })).filter(x => x.nome).slice(0, 6)
      };
    },
    report: r => ({
      manchete: str(r.manchete), valor_financeiro: str(r.valor_financeiro), time: str(r.time), proximo_foco: str(r.proximo_foco), foco: str(r.foco),
      areas: arr(r.areas).slice(0, 6).map(a => ({ area: str(a && a.area), resumo: str(a && a.resumo), titulos: arr(a && a.titulos).map(str).filter(Boolean) })).filter(a => a.area && a.resumo),
      destaques: arr(r.destaques).slice(0, 3).map(x => ({ titulo: str(x && x.titulo), contexto: str(x && x.contexto), decisao: str(x && x.decisao), resultado: str(x && x.resultado), valor: str(x && x.valor) })).filter(x => x.titulo),
      forcas: arr(r.forcas).map(str).filter(Boolean).slice(0, 3), padroes: arr(r.padroes).map(str).filter(Boolean).slice(0, 3)
    })
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
  /* trilha de raciocínio: etapas aparecem enquanto a IA trabalha e depois recolhem */
  const TRAIL = {
    clarify: () => ["Lendo a situação", "Cruzando com o seu cérebro", "Identificando quem decide e quem é afetado", "Fazendo a triagem", "Preparando as perguntas"],
    decide: p => ["Revendo suas respostas", "Montando os caminhos possíveis", "Testando as premissas", p && p.profundidade === "curta" ? "" : "Rodando o pre-mortem", "Checando a ética", "Medindo a qualidade da decisão"].filter(Boolean),
    actions: () => ["Quebrando a escolha em passos", "Definindo responsáveis e prazos"],
    review: () => ["Comparando o previsto com o que aconteceu", "Calibrando a confiança", "Extraindo o aprendizado"]
  };
  const TRAIL_TITLE = { clarify: "Analisei a situação", decide: "Montei os caminhos", actions: "Organizei os próximos passos", review: "Analisei o resultado" };
  function trailDone(kind, r) {
    if (kind === "clarify") {
      const tags = [r.profundidade === "curta" ? "Fluxo curto" : "Fluxo completo", r.tipo && "situação " + r.tipo, r.reversivel ? "reversível" : "difícil de reverter", r.urgencia && "urgência " + r.urgencia].filter(Boolean);
      return [
        { t: "Li a situação", s: r.entendimento },
        { t: "Cruzei com o seu cérebro", s: r.conexoes.length ? r.conexoes.length + (r.conexoes.length === 1 ? " conexão encontrada" : " conexões encontradas") : "Nada ligado a isso no seu histórico", links: r.conexoes },
        r.decisor && r.decisor.quem ? { t: "Quem decide: " + r.decisor.quem, s: [r.decisor.papel && "Seu papel: " + r.decisor.papel, r.decisor.nota].filter(Boolean).join(". ") } : null,
        r.afetados.length ? { t: "Quem é afetado", s: r.afetados.join(", ") } : null,
        { t: "Triagem", s: tags.join(" · ") },
        r.pessoas.length ? { t: "Pessoas para o My Mind", s: r.pessoas.map(x => x.nome + (x.papel ? " (" + x.papel + ")" : "")).join(", ") } : null,
        r.decisao ? { t: "A decisão por trás disso", s: r.decisao } : null,
        { t: r.perguntas.length ? r.perguntas.length + (r.perguntas.length === 1 ? " pergunta preparada" : " perguntas preparadas") : "Perguntas preparadas" }
      ].filter(Boolean);
    }
    if (kind === "decide") return [
      { t: r.alternativas.length + " caminhos montados", s: r.alternativas.map(a => a.titulo).join(" · ") },
      ...r.metodos.map(m => ({ t: m.nome, s: m.aplicacao })),
      r.premortem ? { t: "Pre-mortem", s: r.premortem } : null,
      { t: "Ética", s: r.alerta_etico ? "Ponto de atenção encontrado" : "Nada fora dos limites" },
      { t: "Qualidade da decisão medida" }
    ].filter(Boolean);
    if (kind === "actions") return [{ t: r.acoes.length + (r.acoes.length === 1 ? " passo definido" : " passos definidos"), s: r.acoes.map(a => a.acao).join(" · ") }];
    if (kind === "review") return [{ t: "Comparei o previsto com o que aconteceu" }, { t: "Calibrei a confiança" }, { t: "Extraí o aprendizado" }];
    return [];
  }
  async function think(c, kind, p) {
    const labels = TRAIL[kind] ? TRAIL[kind](p) : null;
    for (;;) {
      let tr = null, timer = null;
      const tick = () => { c.tick = (c.tick || 0) + 1; if (alive(c)) render(); };
      if (labels) {
        tr = { kind, steps: labels, i: 0, done: false, open: false };
        c.msgs.push({ from: "ai", trail: tr }); tick();
        timer = setInterval(() => { if (tr.i < tr.steps.length - 1) { tr.i++; tick(); } }, 1300);
      } else { c.typing = true; if (alive(c)) render(); }
      try {
        const t0 = Date.now();
        const res = await callAI(kind, p, c);
        if (tr) {
          clearInterval(timer);
          await sleep(Math.max(0, 900 - (Date.now() - t0)));
          while (tr.i < tr.steps.length - 1 && alive(c)) { tr.i++; tick(); await sleep(280); }
          await sleep(350);
          tr.done = true; tr.final = trailDone(kind, res); tick();
          await sleep(250);
        }
        c.typing = false; return res;
      }
      catch (e) {
        c.typing = false;
        if (tr) { clearInterval(timer); c.msgs = c.msgs.filter(m => m.trail !== tr); }
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
    { k: "talk", L: 0, type: "talk" },
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
    const o = S.ob;
    if (obStep().type === "talk") talkStop();
    o.i = Math.max(0, Math.min(OB.length - 1, o.i + d));
    while (OB[o.i].bind && o.talkFilled && o.talkFilled.has(OB[o.i].bind) && o.i > 0 && o.i < OB.length - 1) o.i += d > 0 ? 1 : -1;
    o.other = false; o.otherText = ""; o.enter = true; o.lock = false;
    const st = obStep();
    if (st.type === "talk") talkOpen();
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
  /* ---------- conversa de calibração ("Quem sou") ---------- */
  const REG_L = { trajetoria: 0, estilo: 0, valor: 0, empresa: 1, momento: 1, autonomia: 1, funcao: 2, cobranca: 2, objetivo: 2, time: 3, pessoa: 3, dor: "dor" };
  const REG_LBL = { trajetoria: "Trajetória", estilo: "Jeito de decidir", valor: "Valor", empresa: "Empresa", momento: "Momento", autonomia: "Autonomia", funcao: "Função", cobranca: "Cobrado por", objetivo: "Objetivo", time: "Time", pessoa: "Pessoa", dor: "Dor" };
  const TALK_MAP = { estilo: "quemSou.estilo", funcao: "oQueFaco.funcao", cobranca: "oQueFaco.cobranca", momento: "ondeEstou.momento", autonomia: "ondeEstou.autonomia", time: "aoRedor.time" };
  const muteKey = "icando-mute";
  /* voz do app (síntese do navegador, em português) */
  let ttsVoice = null;
  function pickVoice() {
    if (typeof speechSynthesis === "undefined") return null;
    const vs = speechSynthesis.getVoices().filter(v => /^pt[-_]BR/i.test(v.lang));
    return vs.find(v => /natural|neural/i.test(v.name)) || vs.find(v => /google/i.test(v.name)) || vs.find(v => /luciana|francisca|thalita|maria/i.test(v.name)) || vs[0] || null;
  }
  if (typeof speechSynthesis !== "undefined") { ttsVoice = pickVoice(); speechSynthesis.onvoiceschanged = () => { ttsVoice = pickVoice(); }; }
  function speak(text, done) {
    const end = () => { if (S.speaking) { S.speaking = false; if (S.view === "onboard") render(); } if (done) done(); };
    if (typeof speechSynthesis === "undefined" || lsGet(muteKey) || !text) { end(); return; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR"; if (ttsVoice) u.voice = ttsVoice; u.rate = 1.03; u.pitch = 1;
      let fired = false; const once = () => { if (!fired) { fired = true; end(); } };
      u.onend = once; u.onerror = once;
      S.speaking = true; speechSynthesis.speak(u);
      setTimeout(() => { if (!fired && !speechSynthesis.speaking) once(); }, 1500 + text.length * 90);
    } catch { end(); }
  }
  function shutUp() { try { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); } catch {} S.speaking = false; }
  function talkOpen() {
    const o = S.ob;
    if (!o.talk) o.talk = { msgs: [], regs: [], input: "", busy: false, done: false, turn: 0, voice: false, err: "" };
    if (!o.talkFilled) o.talkFilled = new Set();
    const t = o.talk;
    if (!t.msgs.length) {
      const nome = str(o.p.nome);
      t.msgs.push({ from: "ai", text: `Oi${nome ? ", " + nome : ""}! Que bom ter você aqui. Antes de tudo, quero te conhecer: me conta um pouco sobre você, o que você faz e como costuma tomar decisões.` });
    }
    const last = t.msgs[t.msgs.length - 1];
    if (last.from === "ai" && !t.done) speak(last.text);   /* no mesmo toque: o iPhone só libera a voz assim */
  }
  function talkStop() { shutUp(); if (tv) talkFinishVoice(false); }
  function talkApply(res) {
    const o = S.ob, t = o.talk, p = o.p;
    Object.entries(TALK_MAP).forEach(([k, path]) => {
      let v = res.perfil[k]; if (!v) return;
      if (k === "time") { const m = OPT.time.find(x => norm(x) === norm(v)); if (!m) return; v = m; }
      setPathIn(p, path, v); o.talkFilled.add(path);
    });
    res.registros.forEach(r => {
      if (t.regs.some(x => x.tipo === r.tipo && norm(x.texto) === norm(r.texto))) return;
      t.regs.push(r);
      if (r.tipo === "dor" && !p.dores.some(d => norm(d.texto) === norm(r.texto))) p.dores.push({ id: uid(), texto: r.texto, em: new Date().toISOString(), origem: "primeiro acesso" });
    });
    res.pessoas.forEach(x => { if (!p.aoRedor.pessoas.some(y => norm(y.nome) === norm(x.nome))) p.aoRedor.pessoas.push({ id: uid(), nome: x.nome, papel: x.papel, nota: "" }); });
    if (res.resumo) p.quemSou.resumo = res.resumo;
    p.quemSou.registros = t.regs.filter(r => r.tipo !== "dor");
    p.quemSou.conversa = t.msgs.map(m => ({ de: m.from === "me" ? "usuario" : "icando", texto: m.text }));
    p.quemSou.calibradoEm = new Date().toISOString();
    S.profile = clone(p); store.saveProfile();
  }
  async function talkSend(text) {
    const o = S.ob; if (!o || !o.talk) return;
    const t = o.talk; text = str(text).trim();
    if (!text || t.busy || t.done) return;
    shutUp();
    t.msgs.push({ from: "me", text }); t.input = ""; t.busy = true; t.err = ""; t.turn++; render();
    let res;
    try {
      res = await callAI("calibrate", { nome: o.p.nome, conversa: t.msgs.map(m => ({ from: m.from, text: m.text })), registros: t.regs, troca: t.turn, profile: o.p }, t);
    } catch (e) {
      t.busy = false; t.turn--;
      if (e && e.code === "cancelled") return;
      t.err = errMsg(e); render(); return;
    }
    if (S.ob !== o) return;
    t.busy = false;
    talkApply(res);
    t.done = res.encerrar || t.turn >= 5;
    const fala = res.fala || (t.done ? "Obrigado. Já tenho um bom retrato de você." : "Me conta mais.");
    t.msgs.push({ from: "ai", text: fala });
    render();
    if (obStep().type === "talk") speak(fala, () => { if (!t.done && t.voice && S.ob === o && obStep().type === "talk" && !tv) talkVoice(); });
  }
  /* voz do usuário na conversa: toca no anel, fala, e ao silenciar a resposta é enviada */
  let tv = null;
  function talkVoice() {
    const o = S.ob; if (!o || !o.talk || o.talk.done || o.talk.busy) return;
    if (!SR) { const el = document.getElementById("talk-input"); if (el) el.focus(); return; }
    if (tv) { talkFinishVoice(true); return; }
    shutUp(); stopMic();
    const t = o.talk, base = str(t.input);
    const r2 = new SR(); r2.lang = "pt-BR"; r2.interimResults = true; r2.continuous = true;
    tv = { rec: r2, timer: null, last: "", done: false };
    const arm = () => { clearTimeout(tv.timer); tv.timer = setTimeout(() => talkFinishVoice(true), 2200); };
    r2.onresult = e => {
      if (!tv || tv.done) return;
      const text = ((base ? base + " " : "") + joinResults(e.results)).replace(/\s+/g, " ").trim();
      if (text === tv.last) return;
      tv.last = text; t.input = text;
      const live = document.getElementById("orb-live"); if (live) live.textContent = text.length > 160 ? "…" + text.slice(-160) : text;
      const ta = document.getElementById("talk-input"); if (ta) { ta.value = text; autoGrow(ta); }
      arm();
    };
    r2.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { t.err = "Permita o uso do microfone nas configurações do navegador, ou responda digitando."; } };
    r2.onend = () => { if (tv && !tv.done) talkFinishVoice(true); };
    try { r2.start(); S.listening = "orb"; t.voice = true; render(); } catch { tv = null; }
  }
  function talkFinishVoice(send) {
    if (!tv || tv.done) return;
    tv.done = true; clearTimeout(tv.timer);
    const r = tv.rec; tv = null; S.listening = null;
    try { r.onresult = null; r.onend = null; r.abort(); } catch {}
    const o = S.ob;
    if (send && o && o.talk && str(o.talk.input).trim().length >= 2) talkSend(o.talk.input); else render();
  }
  function talkHTML() {
    const o = S.ob, t = o.talk, on = S.listening === "orb";
    const muted = !!lsGet(muteKey);
    const lastAi = [...t.msgs].reverse().find(m => m.from === "ai");
    let h = `<div class="talk-top"><span class="layer-badge L0"><span class="lic sm">${LIC[0]}</span>Quem sou<span class="lcount">conversa</span></span><button class="icon-btn sm" data-a="talkMute" aria-label="${muted ? "Ligar a voz" : "Desligar a voz"}" aria-pressed="${muted}">${muted ? IC.mute : IC.speaker}</button></div>`;
    h += `<div class="talk-orb${S.speaking ? " speaking" : ""}">${liveOrb(on ? "listen" : S.speaking ? "speak" : t.done ? "done" : "talk")}</div>`;
    h += `<p class="talk-q" aria-live="polite">${t.busy ? '<span class="tr-shim">Pensando no que você disse…</span>' : esc(lastAi ? lastAi.text : "")}</p>`;
    h += `<p class="orb-live talk-live" id="orb-live">${on ? esc(t.input) || "Pode falar, estou ouvindo." : t.done ? "" : SR ? "Toque no anel para responder falando, ou digite abaixo." : "Responda digitando abaixo."}</p>`;
    if (t.err) h += `<p class="talk-err">${esc(t.err)}</p>`;
    if (t.regs.length) {
      h += `<div class="talk-regs"><p class="lbl">Anotei sobre você</p><div class="tregs">${t.regs.map((r, i) => { const L = REG_L[r.tipo]; return `<span class="treg ${L === "dor" ? "dor" : "L" + L}${i >= t.regs.length - 3 ? " new" : ""}"><b>${esc(REG_LBL[r.tipo] || r.tipo)}</b>${esc(r.texto)}</span>`; }).join("")}</div></div>`;
    }
    const mine = t.msgs.filter(m => m.from === "me");
    if (mine.length) h += `<details class="talk-hist"><summary>Ver a conversa (${t.msgs.length} mensagens)</summary>${t.msgs.map(m => `<p class="th ${m.from}"><b>${m.from === "me" ? "Você" : "I Can Do"}</b>${esc(m.text)}</p>`).join("")}</details>`;
    return h;
  }
  function talkFoot() {
    const t = S.ob.talk;
    if (t.done) return '<button class="btn" data-a="obNext">Continuar</button>';
    return `<div class="composer talk-comp"><textarea id="talk-input" rows="1" data-bind="ob.talk.input" placeholder="${S.listening === "orb" ? "Ouvindo…" : "Ou escreva aqui…"}" aria-label="Sua resposta" ${t.busy ? "disabled" : ""}>${esc(t.input)}</textarea><button class="send" data-a="talkSendBtn" aria-label="Enviar" ${t.busy ? "disabled" : ""}>${IC.send}</button></div><button class="linkbtn talk-skip" data-a="talkSkip">${t.msgs.some(m => m.from === "me") ? "Seguir com o que já contei" : "Prefiro responder às perguntas"}</button>`;
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
      h += `<div class="ob-hero">${orb("lg")}<h1>Antes de decidir, quero te conhecer</h1><p class="why">Começamos com uma conversa rápida, por voz ou texto, e depois 4 partes de contexto. Assim cada análise é sobre você, e não genérica.</p></div><div class="layers">`;
      LAYERS.forEach((l, i) => { h += `<div class="lrow L${i}"><span class="lic">${LIC[i]}</span><span class="lt"><b>${l.n}</b><span>${l.d}</span></span><span class="ln">${i + 1}</span></div>`; });
      h += "</div>";
      foot = '<button class="btn" data-a="obNext">Começar · 3 min</button>';
    } else if (st.type === "talk") {
      h += talkHTML();
      foot = talkFoot();
    } else if (st.k === "done") {
      const p = o.p;
      const rows = [
        [p.nome, p.quemSou.estilo, p.quemSou.resumo],
        [p.ondeEstou.momento, p.ondeEstou.autonomia],
        [p.oQueFaco.funcao, p.oQueFaco.cobranca && "Cobrado por: " + p.oQueFaco.cobranca],
        [p.aoRedor.time && "Lidera: " + p.aoRedor.time, p.aoRedor.pessoas.length ? p.aoRedor.pessoas.map(x => x.nome).join(", ") : ""]
      ];
      h += `<div class="ob-hero">${orb("lg")}<h1>Tudo pronto${p.nome ? ", " + esc(p.nome) : ""}.</h1><p class="why">Este é o seu contexto. Ele entra em cada análise, e você ajusta no perfil quando quiser.</p></div><div class="sum">`;
      LAYERS.forEach((l, i) => {
        const vals = rows[i].filter(Boolean);
        h += `<div class="scard L${i}"><span class="sh"><span class="lic sm">${LIC[i]}</span>${l.n}</span>${vals.length ? vals.map(v => `<span class="sv">${esc(v)}</span>`).join("") : '<span class="sv muted">Não informado</span>'}</div>`;
      });
      if (p.dores.length) h += `<div class="scard dores"><span class="sh">Dores que você trouxe</span>${p.dores.map(d => `<span class="sv">${esc(d.texto)}</span>`).join("")}</div>`;
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

  /* busca no cérebro: decisões que podem se conectar à situação */
  function brainCandidates(situacao) {
    const STOP = new Set("para pelo pela como mais mas que com sem uma umas uns dos das nos nas isso esse essa este esta muito sobre entre quando onde porque ainda agora tambem voce meu minha nosso nossa eles elas dele dela time".split(" "));
    const toks = t => new Set(norm(t).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));
    const q = toks(situacao);
    const pessoas = fullProfile(S.profile || {}).aoRedor.pessoas.map(x => norm(x.nome)).filter(Boolean);
    const qPeople = pessoas.filter(n => new RegExp("\\b" + n + "\\b").test(norm(situacao)));
    const scored = S.decisions.map(d => {
      const txt = [d.titulo, d.decisao, d.situacao, d.objetivo, arr(d.acoes).map(a => a.acao + " " + a.responsavel).join(" ")].join(" ");
      const w = toks(txt); let sc = 0;
      q.forEach(x => { if (w.has(x)) sc += 1; });
      qPeople.forEach(n => { if (new RegExp("\\b" + n + "\\b").test(norm(txt))) sc += 3; });
      const open = !d.revisao || arr(d.acoes).some(a => !a.feito);
      if (open) sc += 1;
      const age = (Date.now() - new Date(d.criadaEm).getTime()) / 864e5; sc += Math.max(0, 1 - age / 120);
      return { d, sc, open };
    }).sort((a, b) => b.sc - a.sc);
    return scored.filter(x => x.sc >= 1.5 || x.open).slice(0, 15).map(({ d, open }) => ({
      id: d.id, titulo: decTitle(d), decisao: d.decisao || "", situacao: str(d.situacao).slice(0, 220), data: fmt(d.criadaEm),
      status: d.revisao ? "revisada" : open ? "em andamento" : "aguardando revisão",
      pendentes: arr(d.acoes).filter(a => !a.feito).map(a => a.acao + " (" + a.responsavel + ")"),
      aprendizado: d.revisao && d.revisao.ia ? d.revisao.ia.aprendizado : ""
    }));
  }
  const REL = { "em andamento": "Em andamento", "impactada": "Pode ser impactada", "conflito": "Possível conflito", "aprendizado": "Aprendizado" };
  function brainCard(u) {
    const others = u.decisor && u.decisor.quem && norm(u.decisor.quem) !== "voce";
    let h = `<div class="card brain"><div class="br-h"><span class="br-ic">${BRAIN}</span><span><b>Cruzei com o seu cérebro</b><span>${u.conexoes.length ? u.conexoes.length + (u.conexoes.length === 1 ? " conexão encontrada" : " conexões encontradas") : "Nenhuma decisão ligada a isso no seu histórico"}</span></span></div>`;
    if (u.decisor && u.decisor.quem) h += `<div class="br-who${others ? " other" : ""}"><span class="lbl">Quem decide</span><b>${hl(u.decisor.quem)}</b>${u.decisor.papel ? `<span class="pill">Seu papel: ${hl(u.decisor.papel)}</span>` : ""}${u.decisor.nota ? `<p>${hl(u.decisor.nota)}</p>` : ""}</div>`;
    u.conexoes.forEach(cx => {
      const d = findDecision(cx.id); if (!d) return;
      h += `<button class="br-link rel-${esc(norm(cx.relacao).replace(/\s+/g, "-"))}" data-a="go" data-v="detail" data-p="${esc(d.id)}"><span class="br-rel">${hl(REL[cx.relacao] || cx.relacao)}</span><b>${hl(decTitle(d))}</b><span class="br-m">${hl(cx.motivo)}</span></button>`;
    });
    if (u.afetados.length) h += `<div class="br-aff"><span class="lbl">Quem é afetado</span><div class="pchips">${u.afetados.map(x => `<span class="chipp"><b>${hl(x)}</b></span>`).join("")}</div></div>`;
    return h + "</div>";
  }

  /* pessoas citadas na conversa → círculo (My Mind) */
  function peopleDiff(list) {
    const cur = fullProfile(S.profile || {}).aoRedor.pessoas;
    return arr(list).filter(x => {
      const ex = cur.find(y => norm(y.nome) === norm(x.nome));
      return !ex || (x.papel && !ex.papel);
    });
  }
  function addPeople(list) {
    S.profile = fullProfile(S.profile || {});
    const ps = S.profile.aoRedor.pessoas, ids = [];
    list.forEach(x => {
      const ex = ps.find(y => norm(y.nome) === norm(x.nome));
      if (ex) { if (!ex.papel && x.papel) ex.papel = x.papel; if (!ex.nota && x.nota) ex.nota = x.nota; }
      else { const id = uid(); ps.push({ id, nome: x.nome, papel: x.papel, nota: x.nota }); ids.push(id); }
    });
    store.saveProfile();
    return ids;
  }
  function peopleCard(pp, idx) {
    const chips = `<div class="pchips">${pp.list.map(x => `<span class="chipp"><b>${esc(x.nome)}</b>${x.papel ? " · " + esc(x.papel) : ""}</span>`).join("")}</div>`;
    if (pp.state === "ask") return `<div class="pplc"><p class="pplc-t">${BRAIN}<span>${pp.list.length === 1 ? "Uma pessoa nova apareceu na conversa" : "Pessoas novas apareceram na conversa"}</span></p>${chips}<div class="pplc-a"><button class="btn sm" data-a="pplAdd" data-v="${idx}">Adicionar ao My Mind</button><button class="linkbtn" data-a="pplSkip" data-v="${idx}">Agora não</button></div></div>`;
    if (pp.state === "added") return `<div class="pplc done"><p class="pplc-t">${BRAIN}<span>Adicionei ao seu círculo</span>${pp.ids && pp.ids.length ? `<button class="linkbtn" data-a="pplUndo" data-v="${idx}">Desfazer</button>` : ""}</p>${chips}</div>`;
    return "";
  }

  async function decisionFlow(situacao) {
    const c = newChat("decision");
    const nome = S.profile && S.profile.nome;
    c.msgs.push({ from: "ai", text: (nome ? nome + ", o" : "O") + " que está acontecendo? Me conta a situação, com o contexto que você tiver." });
    c.msgs.push({ from: "me", text: situacao });
    const cerebro = brainCandidates(situacao);
    const clar = await think(c, "clarify", { situacao, cerebro }); if (!clar || !alive(c)) return;
    c.clar = clar;
    const novas = peopleDiff(clar.pessoas);
    if (novas.length) {
      const pedido = clar.so_cadastro || novas.every(x => x.pedido);
      const m = { from: "ai", people: { list: novas, state: pedido ? "added" : "ask" } };
      if (pedido) m.people.ids = addPeople(novas);
      push(c, m);
    }
    if (clar.so_cadastro || !clar.perguntas.length) {
      await sleep(300); if (!alive(c)) return;
      push(c, { from: "ai", text: (novas.length ? clar.confirmacao || "Pronto, atualizei o seu círculo." : "Essas pessoas já estão no seu círculo.") + " Quando quiser, me conte uma situação." });
      const fim = await wait(c, { chips: ["Ver My Mind", "Voltar ao início"], silent: true }); if (!alive(c)) return;
      go(fim === "Ver My Mind" ? "mind" : "home"); return;
    }
    if (clar.profundidade === "curta") clar.perguntas = clar.perguntas.slice(0, 2);
    const respostas = [];
    for (let i = 0; i < clar.perguntas.length; i++) {
      const q = clar.perguntas[i];
      await sleep(300); if (!alive(c)) return;
      push(c, { from: "ai", text: q.pergunta, why: q.porque, metodo: q.metodo, layer: `Pergunta ${i + 1} de ${clar.perguntas.length}` });
      const a = await wait(c, { chips: q.opcoes, text: true, placeholder: "Ou responda com suas palavras", skip: true }); if (!alive(c)) return;
      respostas.push({ pergunta: q.pergunta, resposta: a });
    }
    const decisor = clar.decisor ? `${clar.decisor.quem} (papel do usuário: ${clar.decisor.papel}). ${clar.decisor.nota}` : "";
    const conexoes = clar.conexoes.map(cx => { const o = findDecision(cx.id) || {}; return { relacao: cx.relacao, motivo: cx.motivo, titulo: decTitle(o), aprendizado: o.revisao && o.revisao.ia ? o.revisao.ia.aprendizado : "" }; });
    const dec = await think(c, "decide", { situacao, entendimento: clar.entendimento, respostas, decisor, conexoes, afetados: clar.afetados, profundidade: clar.profundidade }); if (!dec || !alive(c)) return;
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
    if (d.dq) { d.dq.compromisso = dqCommit(d); store.saveDecision(d); push(c, { from: "ai", dq: d.id }); await sleep(300); if (!alive(c)) return; }
    push(c, { from: "ai", text: `Em ${fmt(d.revisaoEm)}, daqui a ${daysTo(d.revisaoEm)} ${daysTo(d.revisaoEm) === 1 ? "dia" : "dias"}, eu volto para revisarmos juntos o que aconteceu. A contagem fica no cartão da decisão.` });
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
      situacao: c.msgs.find(m => m.from === "me").text, decisao: clar.decisao, decisor: clar.decisor, conexoes: clar.conexoes, afetados: clar.afetados, entendimento: clar.entendimento, tipo: clar.tipo, reversivel: clar.reversivel, urgencia: clar.urgencia,
      respostas: c.respostas, objetivo: dec.objetivo, fatos: dec.fatos, hipoteses: dec.hipoteses, alternativas: dec.alternativas,
      recomendacao: dec.recomendacao, metodos: dec.metodos, alerta_etico: dec.alerta_etico, contexto: dec.contexto, premortem: dec.premortem, escolhaId: c.sel, confianca: c.reg.confianca,
      sucesso: str(c.reg.sucesso) || dec.sinal_sucesso, revisaoEm: addDays(c.reg.revisao), acoes: [], ajuda: null, revisao: null,
      profundidade: clar.profundidade, dq: Object.assign({}, dec.dq, { compromisso: 0 }), dqDica: dec.dq_dica
    };
    S.decisions.unshift(d); store.saveDecision(d);
    c.saved = d; c.locked = true; S.sheet = false;
    answer(alt ? `Vou seguir com: ${alt.titulo} (${c.reg.confianca}% de confiança)` : "Decisão registrada");
  }

  function toggleAction(did, i) {
    const d = findDecision(did); if (!d || !d.acoes || !d.acoes[i]) return;
    d.acoes[i].feito = !d.acoes[i].feito; d.acoes[i].feitoEm = d.acoes[i].feito ? new Date().toISOString() : null; store.saveDecision(d); render();
  }

  /* ---------- voz ---------- */
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  let rec = null;
  function getPath(path) { return path.split(".").reduce((o, k) => (o ? o[k] : undefined), S); }
  function setPath(path, val) { const k = path.split("."); let o = S; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = val; }
  /* monta a transcrição a partir de todos os resultados, sem duplicar.
     No Chrome do Android cada resultado pode repetir a frase acumulada; no desktop vêm trechos separados. */
  function joinResults(results) {
    const nz = t => norm(t).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    let text = "";
    for (let i = 0; i < results.length; i++) {
      const t = str(results[i][0] && results[i][0].transcript); if (!t) continue;
      const a = nz(text), b = nz(t);
      if (!a) text = t;
      else if (b.startsWith(a)) text = t;          /* resultado cumulativo: substitui */
      else if (a.endsWith(b) || a.includes(b)) { /* repetido: ignora */ }
      else text = text + " " + t;
    }
    return text.replace(/\s+/g, " ").trim();
  }
  function stopMic() { if (rec) { try { rec.stop(); } catch {} } }
  function toggleMic(targetId, bind) {
    if (rec) { stopMic(); return; }
    S.micMsg = "";
    const base = str(getPath(bind));
    rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = true;
    rec.onresult = e => {
      const heard = joinResults(e.results);
      const v = ((base ? base + " " : "") + heard).replace(/\s+/g, " ");
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
    if (hv && view !== "home") finishVoice(false);
    if (S.chat && S.chat.ctl && view !== "chat") S.chat.ctl.abort();
    stopMic();
    S.view = view; S.param = param || null; S.sheet = false; S.resetArm = false;
    S.video = false; S.copyMsg = "";
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
    return `<button class="act${a.feito ? " done" : ""}" data-a="act" data-v="${esc(d.id)}|${i}" aria-pressed="${!!a.feito}"><span class="box">${a.feito ? IC.check : ""}</span><span class="ab"><span class="at">${hl(a.acao)}</span><span class="am">${norm(a.responsavel) === "voce" ? esc(a.responsavel) : `<b class="nm">${esc(a.responsavel)}</b>`} · <span class="${late ? "late" : ""}">até ${fmt(a.prazo)}</span>${showDec ? " · " + esc(decTitle(d)) : ""}</span></span></button>`;
  }

  /* botão central: galáxia viva (canvas) com anel "toque para conversar" */
  function liveOrb(mode) {
    const on = S.listening === "orb";
    const ring = on ? "OUVINDO · FALE À VONTADE · OUVINDO · FALE À VONTADE · "
      : mode === "speak" ? "I CAN DO · FALANDO · I CAN DO · FALANDO · "
      : mode === "talk" ? "TOQUE PARA RESPONDER · TOQUE PARA RESPONDER · "
      : mode === "done" ? "PRAZER EM TE CONHECER · PRAZER EM TE CONHECER · "
      : "TOQUE PARA CONVERSAR · TOQUE PARA CONVERSAR · ";
    return `<div class="orb-wrap${on ? " listening" : ""}">
      <svg class="orb-ring" viewBox="0 0 300 300" aria-hidden="true"><defs><path id="ring-path" d="M150,150 m-114,0 a114,114 0 1,1 228,0 a114,114 0 1,1 -228,0"/></defs><text><textPath href="#ring-path" textLength="714">${ring}</textPath></text></svg>
      <button class="live-orb" data-a="orbTalk" aria-label="${on ? "Parar e enviar" : "Toque para conversar"}"><canvas id="orb-cv"></canvas></button>
    </div>`;
  }
  let orbStop = null, orbT = 0;
  /* anel de luz: fios que se deformam como luz em longa exposição, névoa subindo e poeira brilhante */
  const ORB = (() => {
    const r = (s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; })(11);
    const waves = Array.from({ length: 4 }, (_, k) => ({ k: k + 2, a: 0.012 + r() * 0.02, w: (r() - 0.5) * 1.4, ph: r() * 6.28 }));
    const strands = Array.from({ length: 18 }, (_, i) => ({ off: (r() - 0.5) * 0.08, sh: r() * 6.28, lag: i * 0.16, tilt: (r() - 0.5) * 0.9, sq: 0.84 + r() * 0.2, dx: (r() - 0.3) * 0.2, dy: (r() - 0.2) * 0.18, bright: i < 2 }));
    const dust = Array.from({ length: 160 }, () => ({ a: r() * 6.28, d: 0.3 + r() * 0.2, s: 0.4 + r() * 1.1, sp: (r() - 0.5) * 0.4, tw: r() * 6.28 }));
    const smoke = Array.from({ length: 70 }, () => ({ x: (r() - 0.5) * 0.5, y: r(), s: 8 + r() * 26, sp: 0.04 + r() * 0.06, al: 0.05 + r() * 0.07 }));
    return { waves, strands, dust, smoke };
  })();
  const ORB_PAL = {
    dark: ["90,125,255", "150,115,255", "115,190,255", "125,225,190", "185,160,255", "80,165,255"],
    light: ["37,82,220", "112,78,214", "45,140,225", "22,158,128", "88,96,232", "60,170,210"]
  };
  function startOrb() {
    if (orbStop) orbStop();
    const cv = document.getElementById("orb-cv"); if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, raf = 0, last = performance.now(), boost = S.listening === "orb" ? 1 : 0;
    function size() { const b = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); W = b.width; cv.width = W * dpr; cv.height = W * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    const ringR = (th, t, lag, energy) => {
      let v = 0;
      ORB.waves.forEach(w => { v += w.a * Math.sin(w.k * th + w.ph + w.w * (t - lag) * 2.2); });
      return 1 + v * (1 + energy * 1.6);
    };
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const target = S.listening === "orb" ? 1 : S.speaking ? 0.6 : 0; boost += (target - boost) * Math.min(1, dt * 2.5);
      if (!reduce) orbT += dt * (1 + boost * 1.4);
      const t = orbT, c = W / 2, R = W * 0.3;
      const energy = boost * (0.55 + 0.45 * Math.abs(Math.sin(t * 3.1) * Math.sin(t * 1.7 + 1)));
      const dark = matchMedia("(prefers-color-scheme: dark)").matches;
      /* fundo transparente: só a animação, sobre a cor da tela */
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, W);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      /* névoa subindo */
      ORB.smoke.forEach(p => {
        const y = ((p.y - t * p.sp) % 1 + 1) % 1;
        const py = c - R * 0.2 - y * W * 0.5, px = c + p.x * W * (0.5 + y * 0.5);
        const al = p.al * (dark ? 1.8 : 0.9) * Math.sin(y * Math.PI) * (0.7 + boost * 0.6);
        const rad = p.s * (W / 260) * (1 + y);
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, dark ? `rgba(70,60,255,${al})` : `rgba(47,90,230,${al})`); g.addColorStop(1, "rgba(47,90,230,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.283); ctx.fill();
      });
      /* halo suave do anel */
      const halo = ctx.createRadialGradient(c, c + R * 0.1, R * 0.7, c, c + R * 0.1, R * 1.6);
      halo.addColorStop(0, "rgba(47,90,230,0)");
      halo.addColorStop(0.4, dark ? `rgba(70,60,255,${0.3 + boost * 0.2})` : `rgba(47,90,230,${0.1 + boost * 0.08})`);
      halo.addColorStop(1, "rgba(47,90,230,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(c, c, R * 1.7, 0, 6.283); ctx.fill();
      /* fios de luz */
      const N = 150;
      const path = (st, i) => {
        const tl = t - st.lag * (0.6 + 0.4 * Math.sin(t * 0.7 + i));
        const rot = tl * 0.42, tilt = st.tilt * Math.sin(tl * 0.5 + st.sh), cx = c + st.dx * R * Math.sin(tl * 0.9 + st.sh), cy = c + st.dy * R * Math.cos(tl * 0.8 + st.sh);
        const ct = Math.cos(tilt), sn = Math.sin(tilt);
        ctx.beginPath();
        for (let j = 0; j <= N; j++) {
          const th = (j / N) * Math.PI * 2;
          const rr = R * (ringR(th + rot, tl, 0, energy) + st.off * Math.sin(th * 2 + st.sh + tl * 0.8));
          const ex = Math.cos(th + rot) * rr, ey = Math.sin(th + rot) * rr * st.sq;
          const x = cx + ex * ct - ey * sn, y = cy + ex * sn + ey * ct;
          if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
      };
      /* fios coloridos: as cores giram em volta do anel (azul, roxo, azul-claro, verde-claro, lavanda) */
      const pal = dark ? ORB_PAL.dark : ORB_PAL.light;
      const spin = t * 0.5;
      const cg = (a0, al) => {
        let g;
        if (ctx.createConicGradient) g = ctx.createConicGradient(a0, c, c);
        else g = ctx.createLinearGradient(c + Math.cos(a0) * R, c + Math.sin(a0) * R, c - Math.cos(a0) * R, c - Math.sin(a0) * R);
        pal.forEach((col, k) => g.addColorStop(k / pal.length, `rgba(${col},${al})`));
        g.addColorStop(1, `rgba(${pal[0]},${al})`);
        return g;
      };
      ORB.strands.forEach((st, i) => {
        if (st.bright) return;
        path(st, i);
        const fade = 1 - i / ORB.strands.length;
        ctx.strokeStyle = cg(spin + i * 0.37, Math.min(1, (dark ? 0.07 + 0.16 * fade : 0.14 + 0.34 * fade) * (1 + boost * 0.5)));
        ctx.lineWidth = W / 320 + fade * (W / 220); ctx.stroke();
      });
      ORB.strands.forEach((st, i) => {
        if (!st.bright) return;
        path(st, i);
        const glow = pal[Math.floor(((spin / 6.283) % 1 + 1) % 1 * pal.length)];
        if (dark) {
          ctx.save(); ctx.shadowColor = `rgba(${glow},0.75)`; ctx.shadowBlur = W / 16;
          ctx.strokeStyle = cg(spin + i * 1.3, 0.26 + boost * 0.12); ctx.lineWidth = W / 44; ctx.stroke(); ctx.restore();
          ctx.save(); ctx.shadowColor = `rgba(${glow},0.8)`; ctx.shadowBlur = W / 50;
          ctx.strokeStyle = cg(spin + i * 1.3 + 0.6, 0.7); ctx.lineWidth = W / 120; ctx.stroke(); ctx.restore();
        } else {
          ctx.save(); ctx.shadowColor = `rgba(${glow},${0.4 + boost * 0.2})`; ctx.shadowBlur = W / 22;
          ctx.strokeStyle = cg(spin + i * 1.3, 0.22 + boost * 0.1); ctx.lineWidth = W / 50; ctx.stroke(); ctx.restore();
          ctx.save(); ctx.shadowColor = `rgba(${glow},0.45)`; ctx.shadowBlur = W / 60;
          ctx.strokeStyle = cg(spin + i * 1.3 + 0.6, 0.95); ctx.lineWidth = W / 120; ctx.stroke(); ctx.restore();
        }
      });
      /* poeira em volta do anel */
      ORB.dust.forEach((p, k) => {
        const a = p.a + t * p.sp, d = (p.d + 0.02 * Math.sin(t + p.tw)) * W * (1 + energy * 0.08);
        const al = (0.25 + 0.5 * Math.abs(Math.sin(t * 1.8 + p.tw))) * (0.7 + boost * 0.5);
        ctx.fillStyle = `rgba(${pal[k % pal.length]},${dark ? al : al * 0.6})`;
        ctx.fillRect(c + Math.cos(a) * d, c + Math.sin(a) * d, p.s, p.s);
      });
      /* dissolve tudo nas bordas, sem cortes retos */
      ctx.globalCompositeOperation = "destination-in";
      const mask = ctx.createRadialGradient(c, c, W * 0.34, c, c, W * 0.5);
      mask.addColorStop(0, "rgba(0,0,0,1)"); mask.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = mask; ctx.fillRect(0, 0, W, W);
      ctx.globalCompositeOperation = "source-over";
      if (!reduce || S.listening === "orb" || S.speaking) raf = requestAnimationFrame(frame);
    }
    size(); raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(size); ro.observe(cv);
    orbStop = () => { cancelAnimationFrame(raf); ro.disconnect(); orbStop = null; };
  }
  /* voz pela galáxia: ouve, e ao fim da fala abre o chat sozinho */
  let hv = null;
  function homeVoice() {
    if (!SR) { const t = document.getElementById("home-input"); if (t) t.focus(); return; }
    if (hv) { finishVoice(S.draft.trim().length >= 8); return; }
    stopMic(); S.micMsg = "";
    const base = str(S.draft);
    const r2 = new SR(); r2.lang = "pt-BR"; r2.interimResults = true; r2.continuous = true;
    hv = { rec: r2, timer: null, last: "", done: false };
    const arm = () => { clearTimeout(hv.timer); hv.timer = setTimeout(() => finishVoice(S.draft.trim().length >= 8), 1800); };
    r2.onresult = e => {
      if (!hv || hv.done) return;
      const text = ((base ? base + " " : "") + joinResults(e.results)).replace(/\s+/g, " ").trim();
      if (text === hv.last) return;              /* Android reenvia a mesma frase no silêncio: não zera o contador */
      hv.last = text; S.draft = text;
      const live = document.getElementById("orb-live"); if (live) live.textContent = text.length > 140 ? "…" + text.slice(-140) : text;
      const ta = document.getElementById("home-input"); if (ta) { ta.value = text; autoGrow(ta); }
      syncSend(); arm();
    };
    r2.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") S.micMsg = "Permita o uso do microfone nas configurações do navegador."; };
    r2.onend = () => { if (hv && !hv.done) finishVoice(S.draft.trim().length >= 8); };
    try { r2.start(); S.listening = "orb"; render(); } catch { hv = null; }
  }
  /* encerra a escuta sem depender do navegador confirmar; envia se houver fala suficiente */
  function finishVoice(send) {
    if (!hv || hv.done) return;
    hv.done = true; clearTimeout(hv.timer);
    const r = hv.rec; hv = null; S.listening = null;
    try { r.onresult = null; r.onend = null; r.abort(); } catch {}
    if (send && S.view === "home") A.start(); else render();
  }

  function recentCards() {
    const ds = allDecisions().slice(0, 6);
    return `<div class="recents">${ds.map(d => `<button class="rcard-d" data-a="go" data-v="detail" data-p="${esc(d.id)}"><span class="rd-top">${statusPill(d)}${d.exemplo ? '<span class="ex">Exemplo</span>' : ""}</span><span class="rd-t">${hl(decTitle(d))}</span><span class="rd-s">${hl(str(d.situacao).slice(0, 90))}${str(d.situacao).length > 90 ? "…" : ""}</span><span class="rd-d">${fmt(d.criadaEm)}</span></button>`).join("")}</div>`;
  }
  function vHome() {
    const due = allDecisions().filter(isDue);
    const nome = S.profile && S.profile.nome;
    const pend = pendingActions().slice(0, 3);
    let h = hdr(`<button class="icon-btn" data-a="go" data-v="profile" aria-label="Seu perfil">${IC.user}</button>`, '<span class="proto">Versão de teste</span>',
      `<button class="icon-btn" data-a="go" data-v="history" aria-label="Suas decisões">${IC.hist}${due.length ? '<span class="dot"></span>' : ""}</button>`);
    h += `<main class="scroll"><div class="pad g">${banner()}`;
    const on = S.listening === "orb";
    h += `<section class="hero home-hero"><p class="hh-hi">${on ? "Estou ouvindo…" : (nome ? "Oi, " + esc(nome) + "." : "Oi.")}</p><h1>${on ? "Conte com calma. Quando terminar, eu continuo." : "O que está acontecendo?"}</h1>${liveOrb()}<p class="orb-live" id="orb-live" aria-live="polite">${on ? esc(S.draft) : "Fale com sua voz ou digite abaixo."}</p></section>`;
    if (due.length) {
      h += '<section class="blk"><h2 class="sec-t">Hora de revisar</h2>';
      due.slice(0, 2).forEach(d => { h += `<button class="due" data-a="review" data-v="${esc(d.id)}"><span class="tx"><span class="tt">${esc(decTitle(d))}</span><span class="st">${daysTo(d.revisaoEm) === 0 ? "A revisão é hoje" : countdown(d.revisaoEm)} · prevista para ${fmt(d.revisaoEm)}${d.exemplo ? " · exemplo" : ""}</span></span><span class="go">Revisar</span></button>`; });
      h += "</section>";
    }
    if (pend.length) h += '<section class="blk"><h2 class="sec-t">Seus próximos passos</h2><div class="acts">' + pend.map(x => actRow(x.d, x.a, x.i, true)).join("") + "</div></section>";
    h += `<section class="blk"><div class="sec-row"><h2 class="sec-t">Decisões recentes</h2>${S.decisions.length > 6 ? '<button class="linkbtn" data-a="go" data-v="history">Ver todas</button>' : ""}</div>${recentCards()}</section>`;
    h += "</div></main>";
    h += `<div class="composer-wrap g"><div class="composer"><textarea id="home-input" rows="1" data-bind="draft" placeholder="${S.listening === "home-input" ? "Ouvindo… fale à vontade" : "Conte o que está acontecendo…"}" aria-label="Conte a situação">${esc(S.draft)}</textarea>${micBtn("home-input", "draft", true)}<button class="send" id="home-send" data-a="start" aria-label="Começar" ${S.draft.trim().length < 8 ? "disabled" : ""}>${IC.send}</button></div></div>`;
    return h;
  }

  function msgHTML(m, c) {
    if (m.from === "me") return `<div class="row me"><div class="bubble me">${hl(m.text)}</div></div>`;
    if (m.understand) {
      const u = m.understand;
      const tags = [u.profundidade === "curta" ? "Fluxo curto" : "Fluxo completo", u.tipo && "Situação " + u.tipo, u.reversivel ? "Reversível" : "Difícil de reverter", u.urgencia && "Urgência: " + u.urgencia].filter(Boolean);
      return `<div class="row ai">${orb("sm")}<div class="bubble ai"><span class="lab">Entendi assim</span>${hl(u.entendimento)}${u.decisao ? `<span class="dec-q"><span class="dq-k">A decisão por trás disso</span>${hl(u.decisao)}</span>` : ""}<span class="tags">${tags.map(t => `<span class="tag">${hl(t)}</span>`).join("")}</span></div></div>`;
    }
    if (m.trail) return trailHTML(m.trail, c);
    if (m.people) return peopleCard(m.people, c.msgs.indexOf(m));
    if (m.decision) return decisionCard(c);
    if (m.brain) return brainCard(m.brain);
    if (m.dq) { const d = findDecision(m.dq); return d ? `<div class="card">${dqBlock(d.dq, d.dqDica)}</div>` : ""; }
    if (m.actions) {
      const d = findDecision(m.actions); if (!d) return "";
      return `<div class="card"><p class="lbl">Próximos passos</p><div class="acts">${arr(d.acoes).map((a, i) => actRow(d, a, i, false)).join("")}</div><p class="hint">Marque cada passo quando concluir. Eles aparecem na tela inicial.</p></div>`;
    }
    if (m.learn) {
      const l = m.learn;
      return `<div class="card"><p class="lbl">O que essa decisão ensina</p><div class="blk"><p>${hl(l.leitura)}</p></div><div class="note"><b>Aprendizado</b>${hl(l.aprendizado)}</div><div class="note warn"><b>Calibração</b>${hl(l.calibracao)}</div></div>`;
    }
    return `<div class="row ai">${orb("sm")}<div class="bubble ai${m.err ? " err" : ""}">${m.layer ? `<span class="lab">${hl(m.layer)}</span>` : ""}${hl(m.text)}${m.why ? `<span class="why">${hl(m.why)}</span>` : ""}${m.metodo ? `<span class="mtag">${SPINE}Método: ${hl(m.metodo)}</span>` : ""}</div></div>`;
  }

  function trailHTML(tr, c) {
    const idx = c.msgs.findIndex(m => m.trail === tr);
    if (!tr.done) {
      return `<div class="trail live" aria-live="polite">${tr.steps.slice(0, tr.i + 1).map((s, k) => k < tr.i
        ? `<div class="tr-s ok"><span class="tr-i">${IC.check || "✓"}</span><span>${hl(s)}</span></div>`
        : `<div class="tr-s now"><span class="tr-i"><span class="tr-spin"></span></span><span class="tr-shim">${hl(s)}…</span></div>`).join("")}</div>`;
    }
    let h = `<div class="trail${tr.open ? " open" : ""}"><button class="tr-head" data-a="trail" data-v="${idx}" aria-expanded="${tr.open}"><span class="tr-i">${IC.check || "✓"}</span><span>${hl(TRAIL_TITLE[tr.kind] || "Análise feita")}</span><span class="tr-n">${tr.final.length} etapas</span><span class="tr-car">›</span></button>`;
    if (tr.open) {
      h += '<div class="tr-body">' + tr.final.map(s => {
        let x = `<div class="tr-d"><b>${hl(s.t)}</b>${s.s ? `<span>${hl(s.s)}</span>` : ""}`;
        arr(s.links).forEach(cx => { const d = findDecision(cx.id); if (d) x += `<button class="tr-link" data-a="go" data-v="detail" data-p="${esc(d.id)}"><span class="br-rel">${hl(REL[cx.relacao] || cx.relacao)}</span><b>${hl(decTitle(d))}</b><span>${hl(cx.motivo)}</span></button>`; });
        return x + "</div>";
      }).join("") + "</div>";
    }
    return h + "</div>";
  }

  function decisionCard(c) {
    const d = c.dec; if (!d) return "";
    let h = '<div class="card">';
    if (d.alerta_etico) h += `<div class="note ethic"><b>Atenção ética</b>${hl(d.alerta_etico)}</div>`;
    if (d.objetivo) h += `<div class="blk"><p class="lbl">Seu objetivo</p><p>${hl(d.objetivo)}</p></div>`;
    h += '<div class="blk"><p class="lbl">Caminhos possíveis</p><div class="alts">';
    d.alternativas.forEach(a => {
      const on = c.sel === a.id;
      h += `<button class="alt" data-a="alt" data-v="${esc(a.id)}" aria-pressed="${on}"${c.locked ? " disabled" : ""}><span class="top"><span class="radio"></span><span class="t">${hl(a.titulo)}</span>${a.id === d.recomendacao.id ? '<span class="rec">Recomendado</span>' : ""}</span>`;
      if (a.descricao) h += `<span class="d">${hl(a.descricao)}</span>`;
      if (on && (a.beneficios.length || a.riscos.length)) h += `<span class="pc"><span class="pro"><span class="h">A favor</span>${a.beneficios.map(x => `<span class="li">${hl(x)}</span>`).join("")}</span><span class="con"><span class="h">Riscos</span>${a.riscos.map(x => `<span class="li">${hl(x)}</span>`).join("")}</span></span>`;
      h += "</button>";
    });
    h += "</div></div>";
    if (d.metodos && d.metodos.length) h += `<div class="blk"><p class="lbl">Por trás da análise</p><div class="metodos">${d.metodos.map(m => `<div class="metodo"><span class="mn">${SPINE}${hl(m.nome)}</span><span class="ma">${hl(m.aplicacao)}</span></div>`).join("")}</div></div>`;
    if (d.recomendacao.porque) h += `<div class="note"><b>Por que recomendo${d.recomendacao.metodo ? ` · ${hl(d.recomendacao.metodo)}` : ""}</b>${hl(d.recomendacao.porque)}${d.recomendacao.mudaria ? `<span class="hint">O que mudaria a recomendação: ${hl(d.recomendacao.mudaria)}</span>` : ""}<span class="hint">A decisão é sua: você pode seguir outro caminho.</span></div>`;
    if (d.contexto) h += `<div class="note ctx"><b>Considerei seu contexto</b>${hl(d.contexto)}</div>`;
    if (d.premortem) h += `<div class="note warn"><b>Se der errado, o motivo mais provável</b>${hl(d.premortem)}</div>`;
    if (d.fatos.length || d.hipoteses.length) h += `<div class="fh"><div class="blk"><p class="lbl">Fatos</p><ul>${d.fatos.map(x => `<li>${hl(x)}</li>`).join("")}</ul></div><div class="blk"><p class="lbl">Hipóteses</p><ul>${d.hipoteses.map(x => `<li>${hl(x)}</li>`).join("")}</ul></div></div>`;
    if (c.locked) { const a = d.alternativas.find(x => x.id === c.sel); h += `<div class="chosen">${IC.check}Escolhido: ${hl(a ? a.titulo : "")}</div>`; }
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

  const statusPill = d => {
    if (d.revisao) return '<span class="pill ok">Revisada</span>';
    const n = daysTo(d.revisaoEm);
    if (n <= 0) return `<span class="pill warn" title="Revisão prevista para ${fmt(d.revisaoEm)}">${n === 0 ? "Revisão hoje" : countdown(d.revisaoEm)}</span>`;
    return `<span class="pill cd${n <= 3 ? " soon" : ""}" title="Revisão em ${fmt(d.revisaoEm)}">${IC.clock}${countdown(d.revisaoEm)}</span>`;
  };

  function vHistory() {
    let h = hdr(backBtn("go", "home"), "<span>Suas decisões</span>");
    h += `<main class="scroll"><div class="pad g">${banner()}`;
    if (!S.decisions.length) h += '<p class="hint">Você ainda não registrou decisões. Abaixo, um exemplo para você ver como funciona a revisão.</p>';
    h += '<div class="list">';
    allDecisions().forEach(d => {
      const n = arr(d.acoes).length, f = arr(d.acoes).filter(a => a.feito).length;
      h += `<button class="item" data-a="go" data-v="detail" data-p="${esc(d.id)}"><span class="tt">${hl(decTitle(d))}</span><span class="mt">${statusPill(d)}<span>${fmt(d.criadaEm)}</span><span>· ${d.confianca}% de confiança</span>${n ? `<span>· ${f}/${n} passos</span>` : ""}${d.exemplo ? '<span class="ex">Exemplo</span>' : ""}</span></button>`;
    });
    h += "</div></div></main>";
    return h + '<div class="composer-wrap g"><button class="btn" data-a="newDecision">Nova decisão</button></div>';
  }

  function vDetail() {
    const d = findDecision(S.param); if (!d) { S.view = "history"; return vHistory(); }
    let h = hdr(backBtn("go", "history"), "<span>Registro</span>");
    h += `<main class="scroll"><div class="pad g">${banner()}`;
    h += `<div class="blk"><h1 class="h2">${hl(decTitle(d))}</h1><span class="mt">${statusPill(d)}<span>Registrada em ${fmt(d.criadaEm)}</span>${d.exemplo ? '<span class="ex">Exemplo</span>' : ""}</span></div>`;
    h += '<div class="card kv">';
    h += `<div class="blk"><p class="lbl">Contexto</p><p>${hl(d.situacao)}</p></div>`;
    if (d.objetivo) h += `<div class="blk"><p class="lbl">Objetivo</p><p>${hl(d.objetivo)}</p></div>`;
    h += `<div class="blk"><p class="lbl">Caminhos considerados</p><ul class="alist">${arr(d.alternativas).map(a => `<li><span class="${a.id === d.escolhaId ? "ck" : "no"}">${a.id === d.escolhaId ? "✓" : "·"}</span><span>${hl(a.titulo)}${a.id === (d.recomendacao || {}).id ? ' <span class="pill">recomendado</span>' : ""}</span></li>`).join("")}</ul></div>`;
    if (d.recomendacao && d.recomendacao.porque) h += `<div class="blk"><p class="lbl">Justificativa</p><p>${hl(d.escolhaId === d.recomendacao.id ? d.recomendacao.porque : "Você escolheu um caminho diferente do recomendado. A recomendação era: " + d.recomendacao.porque)}</p></div>`;
    if (d.dq) h += dqBlock(d.dq, d.dqDica);
    if (d.decisor && d.decisor.quem) h += `<div class="blk"><p class="lbl">Quem decide</p><p>${hl(d.decisor.quem)}${d.decisor.papel ? " · seu papel: " + esc(d.decisor.papel) : ""}</p></div>`;
    if (arr(d.conexoes).length) h += `<div class="blk"><p class="lbl">Conectada a</p>${d.conexoes.map(cx => { const o = findDecision(cx.id); return o ? `<button class="br-link" data-a="go" data-v="detail" data-p="${esc(o.id)}"><span class="br-rel">${hl(REL[cx.relacao] || cx.relacao)}</span><b>${hl(decTitle(o))}</b><span class="br-m">${hl(cx.motivo)}</span></button>` : ""; }).join("")}</div>`;
    if (arr(d.metodos).length) h += `<div class="blk"><p class="lbl">Métodos usados</p><div class="metodos">${d.metodos.map(m => `<div class="metodo"><span class="mn">${SPINE}${hl(m.nome)}</span><span class="ma">${hl(m.aplicacao)}</span></div>`).join("")}</div></div>`;
    h += `<div class="blk"><p class="lbl">Confiança</p><p>${d.confianca}%</p></div>`;
    h += `<div class="blk"><p class="lbl">Resultado esperado</p><p>${hl(d.sucesso)}</p></div>`;
    h += d.revisao ? `<div class="blk"><p class="lbl">Revisão</p><p>Feita em ${fmt(d.revisao.em)}</p></div></div>`
      : `<div class="blk"><p class="lbl">Revisão</p><div class="revc${daysTo(d.revisaoEm) <= 0 ? " due" : ""}"><span class="revc-n">${Math.abs(daysTo(d.revisaoEm)) || "Hoje"}</span><span class="revc-t"><b>${daysTo(d.revisaoEm) > 0 ? (daysTo(d.revisaoEm) === 1 ? "dia para a revisão" : "dias para a revisão") : daysTo(d.revisaoEm) === 0 ? "a revisão é hoje" : (daysTo(d.revisaoEm) === -1 ? "dia de atraso" : "dias de atraso")}</b><span>Prevista para ${fmt(d.revisaoEm)}</span></span></div><div class="revbar" role="progressbar" aria-label="Tempo até a revisão" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(revProgress(d) * 100)}"><i style="width:${Math.round(revProgress(d) * 100)}%"></i></div></div></div>`;
    if (arr(d.acoes).length) h += `<div class="card"><p class="lbl">Próximos passos</p><div class="acts">${d.acoes.map((a, i) => actRow(d, a, i, false)).join("")}</div></div>`;
    if (d.revisao) {
      const r = d.revisao;
      h += `<div class="card kv"><p class="lbl">Resultado real e aprendizado</p><div class="blk"><p class="lbl">O que aconteceu</p><p>${hl(r.aconteceu)}</p></div><div class="blk"><p class="lbl">Objetivo atingido</p><p>${hl(r.atingido)}</p></div><div class="blk"><p class="lbl">Decisão bem tomada</p><p>${hl(r.processo)}</p></div>`;
      if (r.ia) h += `<div class="note"><b>Aprendizado</b>${hl(r.ia.aprendizado)}</div><div class="note warn"><b>Calibração</b>${hl(r.ia.calibracao)}</div>`;
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
    h += `<button class="intro-card" data-a="playIntro"><span class="ic-thumb"><img src="/intro-poster.jpg" alt=""><span class="ic-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></span><span class="ic-t"><b>Como funciona o I Can Do</b><span>Vídeo de 30 segundos</span></span></button>`;
    h += `<div class="reps"><button class="rep-card pessoal" data-a="go" data-v="report" data-p="pessoal"><span class="rp-ic">${REPORT_ICONS.pessoal}</span><b>Relatório pessoal</b><span>Como você decide</span></button><button class="rep-card valor" data-a="go" data-v="report" data-p="valor"><span class="rp-ic">${REPORT_ICONS.valor}</span><b>Relatório de valor</b><span>O que suas decisões entregaram</span></button></div>`;
    h += '<p class="hint">Este é o contexto que entra em cada análise. Toque em Editar para atualizar uma camada.</p>';
    LAYERS.forEach((l, L) => {
      const editing = S.pfEdit === L;
      h += `<section class="ctx-card L${L}${editing ? " editing" : ""}"><header class="cc-h"><span class="lic">${LIC[L]}</span><span class="cc-t"><b>${l.n}</b><span>${l.d}</span></span>${editing ? "" : `<button class="cc-edit" data-a="pfEdit" data-v="${L}">Editar</button>`}</header>`;
      if (!editing) {
        h += '<dl class="cc-v">';
        PF_FIELDS[L].forEach(([path, label]) => { const v = str(getPathIn(p, path)); h += `<dt>${label}</dt><dd${v ? "" : ' class="empty"'}>${v ? esc(v) : "Não informado"}</dd>`; });
        if (L === 0) {
          if (p.quemSou.resumo) h += `<dt>Como você se descreveu</dt><dd>${esc(p.quemSou.resumo)}</dd>`;
          if (p.dores.length) h += `<dt>Dores que você trouxe</dt><dd class="dores-dd">${p.dores.map(d => `<span class="dor-chip">${esc(d.texto)}</span>`).join("")}</dd>`;
        }
        if (L === 3) h += `<dt>Pessoas-chave</dt><dd${p.aoRedor.pessoas.length ? "" : ' class="empty"'}>${p.aoRedor.pessoas.length ? p.aoRedor.pessoas.map(x => `<span class="pp"><b>${esc(x.nome)}</b>${x.papel ? " · " + esc(x.papel) : ""}${x.nota ? `<span class="am">${esc(x.nota)}</span>` : ""}</span>`).join("") : "Nenhuma cadastrada"}</dd>`;
        h += "</dl>";
        if (L === 0) h += '<button class="linkbtn talk-again" data-a="recalibrate">Conversar de novo sobre quem sou</button>';
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
      <button class="btn sec" data-a="redoOnb">Refazer apresentação</button>
      ${S.resetArm ? '<button class="btn danger" data-a="resetDo">Confirmar: apagar tudo</button><button class="btn sec" data-a="resetCancel">Cancelar</button>' : '<button class="btn sec" data-a="resetArm">Apagar meus dados</button>'}
      ${S.session ? '<button class="btn sec" data-a="logout">Sair</button>' : ""}</div>`;
    h += "</div></main>";
    if (S.video) h += `<div class="vmodal" role="dialog" aria-label="Vídeo: como funciona o I Can Do"><video id="intro-v" src="/intro.mp4" poster="/intro-poster.jpg" controls autoplay playsinline muted></video><button class="vclose" data-a="closeIntro" aria-label="Fechar vídeo">${IC.x}</button></div>`;
    return h;
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
    sorted.forEach(d => arr(d.conexoes).forEach(cx => { if (nodes.some(n => n.id === "d" + cx.id)) edges.push(["d" + d.id, "d" + cx.id, 0.9]); }));
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

  /* ---------- relatórios ---------- */
  const REPORT_ICONS = {
    pessoal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    valor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>'
  };
  const SAMPLE = (() => {
    const d = n => new Date(Date.now() - n * 864e5).toISOString(), f = n => addDays(n);
    const mk = (id, age, titulo, situacao, o) => Object.assign({ id, exemplo: true, criadaEm: d(age), titulo, situacao, objetivo: "", alternativas: [{ id: "a", titulo }, { id: "b", titulo: "Outro caminho" }, { id: "c", titulo: "Terceiro caminho" }], recomendacao: { id: "a" }, escolhaId: "a", confianca: 70, sucesso: "", revisaoEm: f(14 - age), acoes: [], revisao: null, dq: { enquadramento: 2, alternativas: 2, informacao: age > 40 ? 1 : 2, valores: 1, raciocinio: 2, compromisso: 2 } }, o);
    return [
      mk("s1", 6, "Redistribuir o projeto Kappa", "O Caio vinha atrasando entregas; a Bruna assumiu parte do escopo.", { objetivo: "Recuperar o prazo da Kappa sem perder o Caio.", confianca: 75, acoes: [{ acao: "Alinhar o novo escopo com o Caio", responsavel: "Você", prazo: f(-4), feito: true, feitoEm: d(5) }, { acao: "Assumir as entregas críticas", responsavel: "Bruna", prazo: f(-2), feito: true, feitoEm: d(3) }] }),
      mk("s2", 18, "Renegociar o prazo com o cliente Nova", "Cliente pediu mais escopo no mesmo prazo.", { objetivo: "Manter o cliente sem estourar a equipe.", confianca: 65, revisao: { aconteceu: "Cliente aceitou a nova data e renovou o contrato por mais 6 meses.", atingido: "Sim", processo: "Sim", ia: { aprendizado: "Levar opções prontas para a negociação acelera o acordo." }, em: d(4) }, acoes: [{ acao: "Levar duas opções de cronograma", responsavel: "Você", prazo: f(-16), feito: true, feitoEm: d(17) }, { acao: "Preparar o plano revisado", responsavel: "Letícia", prazo: f(-14), feito: true, feitoEm: d(15) }] }),
      mk("s3", 30, "Contratar um designer pleno", "Time sobrecarregado com três contas novas.", { objetivo: "Reduzir horas extras do time de criação.", confianca: 80, revisao: { aconteceu: "Contratação feita; horas extras caíram pela metade.", atingido: "Sim", processo: "Sim", ia: { aprendizado: "Decidir com dados de carga evita contratar tarde demais." }, em: d(8) }, acoes: [{ acao: "Abrir a vaga", responsavel: "Bruna", prazo: f(-27), feito: true, feitoEm: d(28) }] }),
      mk("s4", 45, "Mudar o rito de planejamento", "Planejamento semanal estava longo e pouco útil.", { objetivo: "Ganhar tempo do time sem perder alinhamento.", confianca: 60, revisao: { aconteceu: "Reunião caiu de 2h para 45min, mas dois projetos perderam alinhamento.", atingido: "Em parte", processo: "Sim", ia: { aprendizado: "Testar mudanças de rito com um time piloto antes." }, em: d(20) }, acoes: [{ acao: "Testar o novo formato por 3 semanas", responsavel: "Letícia", prazo: f(-24), feito: true, feitoEm: d(30) }] }),
      mk("s5", 70, "Promover a Letícia a coordenadora", "Letícia já liderava duas contas informalmente.", { objetivo: "Reconhecer e reter uma liderança em formação.", confianca: 85, revisao: { aconteceu: "Promoção bem recebida pelo time.", atingido: "Sim", processo: "Sim", ia: { aprendizado: "Formalizar quem já lidera fortalece o time." }, em: d(40) }, acoes: [{ acao: "Definir as responsabilidades novas", responsavel: "Você", prazo: f(-65), feito: true, feitoEm: d(66) }] })
    ];
  })();
  const PERIODS = [[30, "30 dias"], [90, "90 dias"], [3650, "Tudo"]];
  function repData(days) {
    const real = S.decisions.length > 0, src = real ? S.decisions : SAMPLE;
    const cut = Date.now() - days * 864e5;
    return { example: !real, ds: src.filter(d => new Date(d.criadaEm).getTime() >= cut) };
  }
  function metrics(ds) {
    const p = fullProfile(S.profile || {});
    const rev = ds.filter(d => d.revisao);
    const score = x => (x === "Sim" ? 1 : x === "Em parte" ? 0.5 : 0);
    const acerto = rev.length ? Math.round(rev.reduce((a, d) => a + score(d.revisao.atingido), 0) / rev.length * 100) : null;
    const confRev = rev.length ? Math.round(rev.reduce((a, d) => a + (+d.confianca || 0), 0) / rev.length) : null;
    const acts = ds.flatMap(d => arr(d.acoes));
    const done = acts.filter(a => a.feito);
    const onTime = done.filter(a => !a.feitoEm || a.feitoEm.slice(0, 10) <= a.prazo).length;
    const team = acts.filter(a => norm(a.responsavel) !== "voce" && norm(a.responsavel) !== "eu");
    const people = new Set();
    const known = (p.aoRedor.pessoas.length ? p.aoRedor.pessoas.map(x => x.nome) : ["Caio", "Bruna", "Letícia"]);
    ds.forEach(d => { const t = norm([d.situacao, arr(d.acoes).map(a => a.responsavel).join(" ")].join(" ")); known.forEach(n => { if (n && new RegExp("\\b" + norm(n) + "\\b").test(t)) people.add(n); }); });
    return {
      n: ds.length, rev: rev.length, revRate: ds.length ? Math.round(rev.length / ds.length * 100) : 0,
      acerto, confRev, calib: acerto == null ? null : 100 - Math.abs(confRev - acerto),
      bem: rev.length ? Math.round(rev.filter(d => d.revisao.processo === "Sim").length / rev.length * 100) : null,
      objetivo: ds.length ? Math.round(ds.filter(d => str(d.objetivo)).length / ds.length * 100) : 0,
      caminhos: ds.length ? Math.round(ds.filter(d => arr(d.alternativas).length >= 3).length / ds.length * 100) : 0,
      seguiu: ds.length ? Math.round(ds.filter(d => d.recomendacao && d.escolhaId === d.recomendacao.id).length / ds.length * 100) : 0,
      acts: acts.length, done: done.length, onTime: done.length ? Math.round(onTime / done.length * 100) : null,
      deleg: acts.length ? Math.round(team.length / acts.length * 100) : null, people: [...people],
      aprendizados: rev.map(d => d.revisao.ia && d.revisao.ia.aprendizado).filter(Boolean),
      dqAvg: (() => { const w = ds.filter(d => d.dq); if (!w.length) return null; const o = {}; DQ_KEYS.forEach(k => { o[k] = w.reduce((a, d) => a + (+d.dq[k] || 0), 0) / w.length; }); return o; })()
    };
  }
  function metricsText(m) {
    return [`Decisões: ${m.n}. Revisadas: ${m.rev} (${m.revRate}%).`,
      m.acerto != null ? `Acerto nas revisadas: ${m.acerto}%. Confiança média declarada nessas: ${m.confRev}%. Calibração: ${m.calib}/100.` : "Nenhuma revisão ainda.",
      `Com objetivo definido: ${m.objetivo}%. Com 3 ou mais caminhos: ${m.caminhos}%. Seguiu a recomendação: ${m.seguiu}%.`,
      `Próximos passos: ${m.done} de ${m.acts} concluídos${m.onTime != null ? `, ${m.onTime}% no prazo` : ""}. Passos com o time (não com o líder): ${m.deleg != null ? m.deleg + "%" : "sem passos"}.`,
      `Pessoas envolvidas: ${m.people.join(", ") || "nenhuma identificada"}.`,
      m.dqAvg ? `Decision Quality médio: ${dqScore(m.dqAvg)}/100 (${DQ_KEYS.map(k => DQ_LABEL[k] + " " + m.dqAvg[k].toFixed(1)).join(", ")}; escala 0 a 2).` : "Sem nota de Decision Quality no período."].join("\n");
  }
  const repKey = () => S.param + "|" + S.repPeriod + "|" + S.decisions.length + "|" + S.decisions.filter(d => d.revisao).length;
  async function genReport() {
    const key = repKey(), { ds, example } = repData(S.repPeriod), m = metrics(ds);
    S.reports[key] = { loading: true }; render();
    const payload = {
      modo: S.param, periodo: PERIODS.find(p => p[0] === S.repPeriod)[1] + (example ? " (dados de exemplo)" : ""), metricas: metricsText(m),
      decisoes: ds.map(d => ({ titulo: decTitle(d), data: fmt(d.criadaEm), situacao: d.situacao, objetivo: d.objetivo, escolha: (arr(d.alternativas).find(a => a.id === d.escolhaId) || {}).titulo, confianca: d.confianca, acoes: arr(d.acoes), revisao: d.revisao && { aconteceu: d.revisao.aconteceu, atingido: d.revisao.atingido, processo: d.revisao.processo, aprendizado: d.revisao.ia && d.revisao.ia.aprendizado } }))
    };
    try { S.reports[key] = { ai: await callAI("report", payload, {}) }; }
    catch (e) { S.reports[key] = { err: errMsg(e) }; }
    if (S.view === "report") render();
  }
  function tiles(list) { return `<div class="tiles">${list.map(([v, l, hint]) => `<div class="tile"><b>${v}</b><span>${l}</span>${hint ? `<em>${hint}</em>` : ""}</div>`).join("")}</div>`; }
  function meter(label, v, cls) { return `<div class="meter ${cls || ""}"><span class="ml">${label}</span><span class="mv">${v == null ? "—" : v + "%"}</span><span class="mb"><i style="width:${v || 0}%"></i></span></div>`; }
  function vReport() {
    const type = S.param === "valor" ? "valor" : "pessoal";
    const { ds, example } = repData(S.repPeriod), m = metrics(ds), R = S.reports[repKey()] || {}, ai = R.ai;
    let h = hdr(backBtn("go", "profile"), `<span>${type === "valor" ? "Relatório de valor" : "Relatório pessoal"}</span>`);
    h += `<main class="scroll"><div class="pad g">${banner()}`;
    h += `<div class="seg-ctl" role="group" aria-label="Período">${PERIODS.map(([d, l]) => `<button data-a="repPeriod" data-v="${d}" aria-pressed="${S.repPeriod === d}">${l}</button>`).join("")}</div>`;
    if (example) h += '<p class="banner info">Você ainda não tem decisões registradas. Este relatório usa dados de exemplo para mostrar como ele vai ficar.</p>';
    if (!ds.length) return h + '<div class="empty">Nenhuma decisão neste período. Escolha um período maior.</div></div></main>';
    h += `<section class="rep-hero ${type}"><span class="rh-ic">${REPORT_ICONS[type]}</span><p class="rh-k">${type === "valor" ? "O que suas decisões entregaram" : "Como você está decidindo"}</p>`;
    if (ai) h += `<h1 class="rh-t">${esc(ai.manchete)}</h1>`;
    else if (R.loading) h += '<h1 class="rh-t muted">Analisando suas decisões…</h1>';
    else h += `<h1 class="rh-t">${m.n} ${m.n === 1 ? "decisão tomada" : "decisões tomadas"}${m.rev ? `, ${m.rev} revisada${m.rev === 1 ? "" : "s"}` : ""}.</h1>`;
    if (!ai) h += R.err ? `<p class="rh-err">${esc(R.err)}</p><button class="btn" data-a="repGen">Tentar de novo</button>` : `<button class="btn" data-a="repGen" ${R.loading ? "disabled" : ""}>${R.loading ? "Analisando…" : "Gerar análise com IA"}</button>`;
    h += "</section>";
    if (type === "valor") {
      h += tiles([[m.n, "decisões tomadas"], [m.acerto == null ? "—" : m.acerto + "%", "objetivos atingidos", m.rev ? `em ${m.rev} revisadas` : "sem revisões"], [m.done + "/" + m.acts, "passos entregues"], [m.deleg == null ? "—" : m.deleg + "%", "passos com o time"]]);
      if (ai) {
        if (ai.valor_financeiro) h += `<div class="note money"><b>Valores citados por você</b>${esc(ai.valor_financeiro)}</div>`;
        h += `<section class="rcard L2"><p class="rc-h">Resultado para o negócio</p>${arr(ai.areas).map(a => `<div class="area"><span class="at-tag">${esc(a.area)}</span><p>${esc(a.resumo)}</p>${arr(a.titulos).length ? `<span class="am">${arr(a.titulos).map(esc).join(" · ")}</span>` : ""}</div>`).join("")}</section>`;
        if (arr(ai.destaques).length) h += `<section class="rcard L0"><p class="rc-h">Decisões em destaque</p>${ai.destaques.map(x => `<div class="case"><b>${esc(x.titulo)}</b><dl><dt>Contexto</dt><dd>${esc(x.contexto)}</dd><dt>Decisão</dt><dd>${esc(x.decisao)}</dd><dt>Resultado</dt><dd>${esc(x.resultado)}</dd><dt>Valor</dt><dd>${esc(x.valor)}</dd></dl></div>`).join("")}</section>`;
      }
      h += `<section class="rcard L1"><p class="rc-h">Operação sem centralizar</p>${meter("Próximos passos com o time", m.deleg, "teal")}<p class="rc-p">${ai && ai.time ? esc(ai.time) : m.deleg == null ? "Ainda não há próximos passos registrados." : `${m.deleg}% dos passos ficaram com outras pessoas, não com você.`}</p></section>`;
      h += `<section class="rcard L3"><p class="rc-h">Desenvolvimento do time</p>${m.people.length ? `<div class="pchips">${m.people.map(n => `<span class="chipp"><b>${esc(n)}</b></span>`).join("")}</div><p class="rc-p">${m.people.length} ${m.people.length === 1 ? "pessoa participou" : "pessoas participaram"} das suas decisões no período.</p>` : '<p class="rc-p">Nenhuma pessoa cadastrada apareceu nas decisões do período.</p>'}</section>`;
      h += `<section class="rcard L2"><p class="rc-h">Confiança do time</p>${meter("Passos concluídos no prazo", m.onTime, "blue")}${meter("Decisões revisadas", m.revRate, "violet")}<p class="rc-p">Cumprir o que se decide e voltar para revisar é o que constrói autoridade.</p></section>`;
      if (ai && ai.proximo_foco) h += `<div class="note"><b>Próximo foco</b>${esc(ai.proximo_foco)}</div>`;
    } else {
      h += tiles([[m.n, "decisões"], [m.revRate + "%", "revisadas"], [m.acerto == null ? "—" : m.acerto + "%", "acerto"], [m.calib == null ? "—" : m.calib, "calibração", "de 0 a 100"]]);
      h += `<section class="rcard L2"><p class="rc-h">Calibração</p>${meter("Sua confiança média", m.confRev, "blue")}${meter("Objetivos atingidos", m.acerto, "gold")}<p class="rc-p">${m.acerto == null ? "Revise suas decisões para ver se sua confiança bate com os resultados." : Math.abs(m.confRev - m.acerto) <= 10 ? "Sua confiança está próxima dos resultados. Isso é raro e valioso." : m.confRev > m.acerto ? "Você tende a confiar um pouco mais do que os resultados mostram." : "Seus resultados superam sua confiança. Você pode confiar mais no seu julgamento."}</p></section>`;
      if (m.dqAvg) { const weak = DQ_KEYS.slice().sort((a, b) => m.dqAvg[a] - m.dqAvg[b])[0]; h += `<section class="rcard L2">${dqBlock(m.dqAvg, "Seu elemento mais fraco no período: " + DQ_LABEL[weak] + ".", "Média do período")}</section>`; }
      h += `<section class="rcard L1"><p class="rc-h">Qualidade do processo</p>${meter("Com objetivo definido", m.objetivo, "teal")}${meter("Com 3 ou mais caminhos", m.caminhos, "teal")}${meter("Bem tomadas, na sua avaliação", m.bem, "teal")}</section>`;
      if (ai) h += `<section class="rcard L0"><p class="rc-h">Forças e padrões</p><ul class="rlist">${arr(ai.forcas).map(x => `<li class="pos">${esc(x)}</li>`).join("")}${arr(ai.padroes).map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>`;
      if (m.aprendizados.length) h += `<section class="rcard L3"><p class="rc-h">Aprendizados registrados</p><ul class="rlist">${m.aprendizados.map(x => `<li class="gold">${esc(x)}</li>`).join("")}</ul></section>`;
      if (ai && ai.foco) h += `<div class="note"><b>Para praticar</b>${esc(ai.foco)}</div>`;
    }
    h += '<button class="btn sec" data-a="repCopy">Copiar resumo</button>';
    if (S.copyMsg) h += `<p class="hint center">${esc(S.copyMsg)}</p>`;
    return h + "</div></main>";
  }
  function reportText() {
    const type = S.param === "valor" ? "valor" : "pessoal", { ds } = repData(S.repPeriod), m = metrics(ds), ai = (S.reports[repKey()] || {}).ai;
    const per = PERIODS.find(p => p[0] === S.repPeriod)[1], nome = (S.profile && S.profile.nome) || "";
    const L = [`I Can Do · ${type === "valor" ? "Relatório de valor" : "Relatório pessoal"}${nome ? " · " + nome : ""} · ${per}`, ""];
    if (ai && ai.manchete) L.push(ai.manchete, "");
    L.push(`• ${m.n} decisões, ${m.rev} revisadas` + (m.acerto != null ? `, ${m.acerto}% dos objetivos atingidos` : ""));
    if (type === "valor") {
      L.push(`• ${m.done} de ${m.acts} próximos passos entregues` + (m.deleg != null ? `; ${m.deleg}% com o time` : ""));
      if (m.people.length) L.push(`• Pessoas envolvidas: ${m.people.join(", ")}`);
      if (ai) { if (ai.valor_financeiro) L.push(`• ${ai.valor_financeiro}`); arr(ai.areas).forEach(a => L.push(`• ${a.area}: ${a.resumo}`)); arr(ai.destaques).forEach(x => L.push("", `${x.titulo}`, `Contexto: ${x.contexto}`, `Decisão: ${x.decisao}`, `Resultado: ${x.resultado}`, `Valor: ${x.valor}`)); if (ai.proximo_foco) L.push("", `Próximo foco: ${ai.proximo_foco}`); }
    } else {
      if (m.calib != null) L.push(`• Calibração: ${m.calib}/100 (confiança ${m.confRev}% × acerto ${m.acerto}%)`);
      if (ai) { arr(ai.forcas).forEach(x => L.push(`• ${x}`)); if (ai.foco) L.push("", `Para praticar: ${ai.foco}`); }
    }
    return L.join("\n");
  }

  /* ---------- frase do dia (Insight 1) ---------- */
  const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const dailyKey = () => "icando-daily-" + (S.session ? S.session.user.id : "local");
  const needsDaily = () => { const v = lsGet(dailyKey()); return !!S.profile && (!v || v.date !== todayStr()); };
  function cerebroText() {
    const ds = S.decisions; if (!ds.length) return "";
    const rev = ds.filter(d => d.revisao), acts = ds.flatMap(d => arr(d.acoes));
    const atingiu = rev.filter(d => d.revisao.atingido === "Sim").length;
    const conf = Math.round(ds.reduce((a, d) => a + (+d.confianca || 0), 0) / ds.length);
    const lines = [
      `Decisões registradas: ${ds.length}. Revisadas: ${rev.length}${rev.length ? ` (objetivo atingido em ${atingiu})` : ""}.`,
      `Confiança média declarada: ${conf}%.`,
      `Próximos passos: ${acts.filter(a => a.feito).length} concluídos de ${acts.length}.`,
      "Decisões recentes: " + ds.slice(0, 5).map(d => `"${decTitle(d)}" (${fmt(d.criadaEm)})`).join("; ") + "."
    ];
    const ap = rev.map(d => d.revisao.ia && d.revisao.ia.aprendizado).filter(Boolean).slice(0, 3);
    if (ap.length) lines.push("Aprendizados: " + ap.join(" | "));
    return lines.join("\n");
  }
  const FALLBACK = [
    ["Liderar é dar clareza. Hoje, uma conversa franca pode destravar muita coisa.", "Frase de partida, sem conexão com a IA."],
    ["Um time cresce quando o líder confia. Delegue uma coisa hoje.", "Frase de partida, sem conexão com a IA."],
    ["Decidir bem é um hábito. Você está construindo o seu.", "Frase de partida, sem conexão com a IA."]
  ];
  async function showDaily() {
    lsSet(dailyKey(), { date: todayStr() });
    S.daily = { loading: true, frase: "", porque: "", why: false };
    S.view = "daily"; render();
    let res = null;
    try {
      const recentes = arr(S.profile.frases).map(x => x.frase).slice(0, 10);
      res = await callAI("daily", { cerebro: cerebroText(), recentes }, {});
    } catch (e) { console.error(e); }
    if (!res || !res.frase) { const f = FALLBACK[new Date().getDate() % FALLBACK.length]; res = { frase: f[0], porque: f[1] }; }
    S.daily = { loading: false, frase: res.frase, porque: res.porque, why: false, enter: true };
    lsSet(dailyKey(), { date: todayStr(), frase: res.frase, porque: res.porque });
    S.profile.frases = [{ d: todayStr(), frase: res.frase }].concat(arr(S.profile.frases)).slice(0, 14);
    store.saveProfile();
    if (S.view === "daily") render();
  }
  function vDaily() {
    const d = S.daily || {}, p = S.profile || {};
    const h = new Date().getHours(), saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    const data = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    let out = `<div class="daily"><span class="mc-stars big" aria-hidden="true"></span><div class="dl-in g">`;
    out += `<p class="dl-date">${esc(data.charAt(0).toUpperCase() + data.slice(1))}</p>`;
    out += `<div class="dl-orb${d.loading ? " thinking" : ""}">${orb("lg")}</div>`;
    out += `<p class="dl-hi">${saud}${p.nome ? ", " + esc(p.nome) : ""}.</p>`;
    if (d.loading) out += '<p class="dl-wait">Lendo o seu cérebro…</p>';
    else {
      out += `<h1 class="dl-frase${d.enter ? " enter" : ""}">${esc(d.frase)}</h1>`;
      out += d.why ? `<p class="dl-why">${esc(d.porque)}</p>` : '<button class="dl-whybtn" data-a="dailyWhy">Por quê?</button>';
    }
    out += `</div><div class="dl-foot g"><button class="btn" data-a="dailyGo" ${d.loading ? "disabled" : ""}>Entrar</button></div></div>`;
    d.enter = false;
    return out;
  }

  const vSplash = () => `<div class="splash">${orb("lg")}<b>I Can Do</b><span>Carregando…</span></div>`;

  /* ---------- render ---------- */
  let lastKey = "", lastCount = 0;
  function autoGrow(t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 132) + "px"; }
  function render() {
    const sc = $app.querySelector(".scroll");
    const prevTop = sc ? sc.scrollTop : 0;
    const key = S.view + "|" + (S.param || "") + "|" + (S.chat && S.view === "chat" ? S.chat.kind : "");
    const count = S.chat ? S.chat.msgs.length + (S.chat.typing ? 1 : 0) + (S.chat.await ? 0.5 : 0) + (S.chat.tick || 0) * 0.001 : 0;
    let h;
    if (!S.ready) h = vSplash();
    else if (sb && !S.session) h = vLogin();
    else if (S.view === "daily" && S.daily) h = vDaily();
    else if (S.view === "onboard" && S.ob) h = vOnboard();
    else if (S.view === "chat" && S.chat) h = vChat();
    else if (S.view === "history") h = vHistory();
    else if (S.view === "detail") h = vDetail();
    else if (S.view === "profile") h = vProfile();
    else if (S.view === "mind") h = vMind();
    else if (S.view === "report") h = vReport();
    else h = vHome();
    if (mindStop && S.view !== "mind") mindStop();
    if (orbStop) orbStop();
    $app.innerHTML = h;
    if (S.view === "mind") startMind();
    if ((S.view === "home" || (S.view === "onboard" && S.ob && obStep().type === "talk")) && S.ready && !(sb && !S.session)) startOrb();
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
    else if (e.target.id === "talk-input") { e.preventDefault(); A.talkSendBtn(); }
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
    skipOnb: () => { talkStop(); lsSet(skipKey(), true); if (S.ob && S.ob.p.nome && !S.profile) { S.profile = clone(S.ob.p); store.saveProfile(); } go("home"); },
    obNext: () => { if (obValid()) { const st = obStep(); if (st.type === "choice" && S.ob.other) setPathIn(S.ob.p, st.bind, str(S.ob.otherText)); obGo(1); } },
    obBack: () => obGo(-1),
    redoOnb: () => onboarding(),
    obPick: v => { const o = S.ob; if (o.lock) return; o.lock = true; o.other = false; setPathIn(o.p, obStep().bind, v); render(); setTimeout(() => { if (S.view === "onboard" && S.ob === o) obGo(1); }, 260); },
    obOther: () => { S.ob.other = true; render(); const t = document.getElementById("ob-other"); if (t) t.focus(); },
    obAddP: () => { const o = S.ob; const n = str(o.np.nome); if (!n) { const t = document.getElementById("np-n"); if (t) t.focus(); return; } o.p.aoRedor.pessoas.push({ id: uid(), nome: n, papel: str(o.np.papel), nota: "" }); o.np = { nome: "", papel: "" }; render(); const t = document.getElementById("np-n"); if (t) t.focus(); },
    obDelP: v => { S.ob.p.aoRedor.pessoas.splice(+v, 1); render(); },
    obFinish: () => { talkStop(); S.ob = null; go("home", null, true); },
    pplAdd: v => { const m = S.chat && S.chat.msgs[+v]; if (!m || !m.people || m.people.state !== "ask") return; m.people.ids = addPeople(m.people.list); m.people.state = "added"; render(); },
    pplSkip: v => { const m = S.chat && S.chat.msgs[+v]; if (!m || !m.people) return; m.people.state = "skip"; render(); },
    pplUndo: v => { const m = S.chat && S.chat.msgs[+v]; if (!m || !m.people || !m.people.ids) return; S.profile = fullProfile(S.profile || {}); S.profile.aoRedor.pessoas = S.profile.aoRedor.pessoas.filter(x => !m.people.ids.includes(x.id)); store.saveProfile(); m.people.state = "skip"; render(); },
    trail: v => { const m = S.chat && S.chat.msgs[+v]; if (m && m.trail && m.trail.done) { m.trail.open = !m.trail.open; render(); } },
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
    repPeriod: v => { S.repPeriod = +v; S.copyMsg = ""; render(); },
    repGen: () => genReport(),
    repCopy: () => {
      const t = reportText();
      const ok = () => { S.copyMsg = "Resumo copiado. Cole no e-mail, no WhatsApp ou na apresentação."; render(); };
      try { navigator.clipboard.writeText(t).then(ok, () => { S.copyMsg = "Não consegui copiar automaticamente neste navegador."; render(); }); } catch { S.copyMsg = "Não consegui copiar automaticamente neste navegador."; render(); }
    },
    orbTalk: () => {
      if (S.view === "onboard") { const t = S.ob && S.ob.talk; if (!t || t.done || t.busy) return; if (S.speaking) { shutUp(); render(); } talkVoice(); }
      else homeVoice();
    },
    talkSendBtn: () => { const t = S.ob && S.ob.talk; if (!t) return; if (tv) talkFinishVoice(false); talkSend(t.input); },
    talkMute: () => { const m = !lsGet(muteKey); lsSet(muteKey, m); if (m) shutUp(); render(); },
    talkSkip: () => { talkStop(); obGo(1); },
    recalibrate: () => { onboarding(); const i = OB.findIndex(x => x.type === "talk"); S.ob.i = i; S.ob.talk = null; S.ob.talkFilled = new Set(); talkOpen(); render(); },
    playIntro: () => { S.video = true; render(); },
    closeIntro: () => { S.video = false; render(); },
    dailyWhy: () => { S.daily.why = true; render(); },
    dailyGo: () => { S.daily = null; go("home"); },
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
    if (!S.profile && !lsGet(skipKey())) onboarding(); else if (needsDaily()) showDaily(); else go("home");
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
