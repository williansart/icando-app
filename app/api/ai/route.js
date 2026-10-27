import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPrompt, mock, parseJSON, SYSTEM } from "../../../lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = ["clarify", "decide", "actions", "review", "daily", "report", "calibrate"];
const fail = (status, code) => NextResponse.json({ code }, { status });

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return fail(400, "invalid_request"); }
  const { kind, payload } = body || {};
  if (!KINDS.includes(kind)) return fail(400, "invalid_request");

  // Com Supabase configurado, só quem está logado (e liberado) usa a IA.
  let logUse = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return fail(401, "unauthorized");
    const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return fail(401, "unauthorized");
    const email = (data.user.email || "").toLowerCase();
    const asUser = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
    // métrica de uso: só o tipo de chamada, nunca o conteúdo
    logUse = k => asUser.from("usage_events").insert({ kind: k }).then(() => {}, () => {});
    const allow = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allow.length && !allow.includes(email)) {
      // convites feitos dentro do app (tabela invites, protegida por RLS: a pessoa só enxerga o próprio convite)
      const { data: inv } = await asUser.from("invites").select("email").eq("email", email).maybeSingle();
      if (!inv) return fail(403, "not_allowed");
    }
  }

  // Provedor: Anthropic (preferido) ou OpenAI (temporário). Sem nenhuma chave, modo demonstração.
  const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : null;
  if (!provider) {
    await new Promise(r => setTimeout(r, 700));
    return NextResponse.json({ demo: true, result: mock(kind, payload) });
  }

  const prompt = buildPrompt(kind, payload);
  if (!prompt) return fail(400, "invalid_request");
  if (prompt.length > 60000) return fail(413, "prompt_too_large");
  const maxTokens = kind === "report" ? 3000 : 2000;

  try {
    const text = provider === "anthropic" ? await callAnthropic(prompt, maxTokens) : await callOpenAI(prompt, maxTokens);
    const result = parseJSON(text);
    if (!result) return fail(502, "invalid_json");
    if (logUse) await logUse(kind);
    return NextResponse.json({ result, provider });
  } catch (e) {
    console.error("AI route", provider, e && e.message);
    return fail(e && e.rate ? 429 : 502, e && e.rate ? "rate_limited" : "upstream_error");
  }
}

async function callAnthropic(prompt, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: maxTokens, system: SYSTEM, messages: [{ role: "user", content: prompt }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error("Anthropic " + r.status + " " + (j?.error?.message || "")), { rate: r.status === 429 || r.status === 529 });
  return (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
}

async function callOpenAI(prompt, maxTokens) {
  const models = [process.env.OPENAI_MODEL || "gpt-5.5", "chat-latest"].filter((m, i, a) => a.indexOf(m) === i);
  let lastErr = null;
  for (const model of models) {
    const r = await fetch((process.env.OPENAI_BASE_URL || "https://api.openai.com/v1") + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt + "\n\nResponda apenas com JSON válido." }],
        response_format: { type: "json_object" },
        max_completion_tokens: maxTokens * 2
      })
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
    lastErr = Object.assign(new Error("OpenAI " + r.status + " " + model + " " + (j?.error?.message || "")), { rate: r.status === 429 });
    const code = j?.error?.code || "";
    // modelo indisponível para esta conta: tenta o próximo
    if (!(r.status === 404 || code === "model_not_found" || (r.status === 400 && /model/i.test(j?.error?.message || "")))) break;
  }
  throw lastErr;
}
