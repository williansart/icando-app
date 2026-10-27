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

-- Métricas de uso (só números, nunca o conteúdo das decisões).
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (char_length(kind) <= 20),
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_time on public.usage_events (user_id, created_at desc);
alter table public.usage_events enable row level security;
drop policy if exists "uso registra o proprio" on public.usage_events;
create policy "uso registra o proprio" on public.usage_events for insert with check (auth.uid() = user_id);

-- Resumo por pessoa, visível só para o administrador.
create or replace function public.admin_usage()
returns table (email text, ultimo_login timestamptz, ultima_atividade timestamptz, decisoes int, decisoes_7d int,
               revisadas int, usos_ia int, usos_ia_7d int, dias_ativos_30d int, perfil boolean)
language sql stable security definer set search_path = public as $$
  select u.email::text,
         u.last_sign_in_at,
         (select max(e.created_at) from public.usage_events e where e.user_id = u.id),
         (select count(*) from public.decisions d where d.user_id = u.id)::int,
         (select count(*) from public.decisions d where d.user_id = u.id and d.created_at > now() - interval '7 days')::int,
         (select count(*) from public.decisions d where d.user_id = u.id and jsonb_typeof(d.data -> 'revisao') = 'object')::int,
         (select count(*) from public.usage_events e where e.user_id = u.id and e.kind <> 'abriu')::int,
         (select count(*) from public.usage_events e where e.user_id = u.id and e.kind <> 'abriu' and e.created_at > now() - interval '7 days')::int,
         (select count(distinct (e.created_at at time zone 'America/Sao_Paulo')::date) from public.usage_events e where e.user_id = u.id and e.created_at > now() - interval '30 days')::int,
         exists (select 1 from public.profiles p where p.user_id = u.id)
  from auth.users u
  where public.is_admin()
  order by 3 desc nulls last, u.last_sign_in_at desc nulls last;
$$;
revoke all on function public.admin_usage() from public, anon;
grant execute on function public.admin_usage() to authenticated;

-- Convites: validação antes do login e status (pendente/aceito) para o administrador.
create or replace function public.can_sign_in(p_email text) returns boolean
  language sql stable security definer set search_path = public as $$
  select lower(trim(p_email)) = 'williansart@gmail.com'
      or exists (select 1 from public.invites i where i.email = lower(trim(p_email)))
$$;
revoke all on function public.can_sign_in(text) from public;
grant execute on function public.can_sign_in(text) to anon, authenticated;

create or replace function public.admin_invites()
returns table (email text, created_at timestamptz, aceito_em timestamptz)
language sql stable security definer set search_path = public as $$
  select i.email, i.created_at,
         (select min(u.email_confirmed_at) from auth.users u where lower(u.email) = i.email and u.last_sign_in_at is not null)
  from public.invites i
  where public.is_admin()
  order by i.created_at desc;
$$;
revoke all on function public.admin_invites() from public, anon;
grant execute on function public.admin_invites() to authenticated;
