import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Confere se um e-mail pode usar o I Can Do: ALLOWED_EMAILS (Vercel) ou convite feito no app.
// Sem token: valida o e-mail digitado no login, antes de enviar o link.
// Com token: valida a pessoa já logada.
export async function POST(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: true });
  let body = {};
  try { body = await req.json(); } catch {}
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const sb = createClient(url, anon, opts);
  let email = String(body.email || "").trim().toLowerCase();
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (token) {
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401 });
    email = (data.user.email || "").toLowerCase();
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, code: "invalid_email" }, { status: 400 });
  const allow = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  if (!allow.length || allow.includes(email)) return NextResponse.json({ ok: true });
  const { data, error } = await sb.rpc("can_sign_in", { p_email: email });
  // função ainda não criada no Supabase: não trava ninguém (a IA continua protegida na rota dela)
  if (error) { console.error("access", error.message); return NextResponse.json({ ok: true, unchecked: true }); }
  return NextResponse.json({ ok: data === true });
}
