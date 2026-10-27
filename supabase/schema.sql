-- I Can Do: tabelas e regras de acesso. Rode no Supabase em SQL Editor > New query.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists decisions_user_created on public.decisions (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.decisions enable row level security;

-- Cada pessoa só lê e escreve os próprios dados.
drop policy if exists "perfil proprio" on public.profiles;
create policy "perfil proprio" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "decisoes proprias" on public.decisions;
create policy "decisoes proprias" on public.decisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Convites: quem pode usar a IA, gerenciado de dentro do app (perfil > Convites).
-- Troque o e-mail abaixo se o administrador mudar.
create or replace function public.is_admin() returns boolean
  language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) = 'williansart@gmail.com' $$;

create table if not exists public.invites (
  email text primary key check (email = lower(email)),
  invited_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;

-- O administrador vê e gerencia todos; cada pessoa só consegue ver o próprio convite.
drop policy if exists "convites leitura" on public.invites;
create policy "convites leitura" on public.invites
  for select using (public.is_admin() or email = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "convites admin cria" on public.invites;
create policy "convites admin cria" on public.invites for insert with check (public.is_admin());
drop policy if exists "convites admin remove" on public.invites;
create policy "convites admin remove" on public.invites for delete using (public.is_admin());
