import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPrompt, mock, parseJSON, SYSTEM } from "../../../lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = ["clarify", "decide", "actions", "review", "daily", "report"];
const fail = (status, code) => NextResponse.json({ code }, { status });

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return fail(400, "invalid_request"); }
  const { kind, payload } = body || {};
  if (!KINDS.includes(kind)) return fail(400, "invalid_request");

  // Com Supabase configurado, só quem está logado (e liberado) usa a IA.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return fail(401, "unauthorized");
    const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return fail(401, "unauthorized");
    const allow = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    if (allow.length && !allow.includes((data.user.email || "").toLowerCase())) return fail(403, "not_allowed");
  }

  // Sem chave da Anthropic, o app funciona em modo demonstração.
  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise(r => setTimeout(r, 700));
    return NextResponse.json({ demo: true, result: mock(kind, payload) });
  }

  const prompt = buildPrompt(kind, payload);
  if (!prompt) return fail(400, "invalid_request");
  if (prompt.length > 60000) return fail(413, "prompt_too_large");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: kind === "report" ? 3000 : 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Anthropic API", r.status, j?.error?.message);
      return fail(r.status === 429 || r.status === 529 ? 429 : 502, r.status === 429 || r.status === 529 ? "rate_limited" : "upstream_error");
    }
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    const result = parseJSON(text);
    if (!result) return fail(502, "invalid_json");
    return NextResponse.json({ result });
  } catch (e) {
    console.error("AI route", e);
    return fail(502, "upstream_error");
  }
}
