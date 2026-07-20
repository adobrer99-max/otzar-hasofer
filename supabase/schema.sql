-- Otzar Ha'Sofer — Scribes' Cloud schema.
-- Run this once in your Supabase project's SQL editor (see DEPLOY.md).
--
-- Design: each table mirrors one local IndexedDB store as a jsonb-blob row
-- (`data`), keeping perfect parity with the app's local records and staying
-- robust to the project's additive-field evolution. Privacy is enforced at
-- the database layer: row-level security restricts every row to its owning
-- Scribe (owner_id = auth.uid()); the public anon key grants nothing beyond
-- what these policies allow.

-- Shared trigger: keep updated_at accurate on every update (server clock).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ————— participants —————
create table public.participants (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.participants enable row level security;
create policy "own rows" on public.participants
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger participants_updated_at
  before update on public.participants
  for each row execute function public.set_updated_at();
create index participants_owner_updated on public.participants (owner_id, updated_at);

-- ————— herald_layers —————
create table public.herald_layers (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.herald_layers enable row level security;
create policy "own rows" on public.herald_layers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger herald_layers_updated_at
  before update on public.herald_layers
  for each row execute function public.set_updated_at();
create index herald_layers_owner_updated on public.herald_layers (owner_id, updated_at);

-- ————— life_cycle_events —————
create table public.life_cycle_events (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.life_cycle_events enable row level security;
create policy "own rows" on public.life_cycle_events
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger life_cycle_events_updated_at
  before update on public.life_cycle_events
  for each row execute function public.set_updated_at();
create index life_cycle_events_owner_updated on public.life_cycle_events (owner_id, updated_at);

-- ————— commentaries —————
create table public.commentaries (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.commentaries enable row level security;
create policy "own rows" on public.commentaries
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger commentaries_updated_at
  before update on public.commentaries
  for each row execute function public.set_updated_at();
create index commentaries_owner_updated on public.commentaries (owner_id, updated_at);

-- ————— unions —————
-- Added after the first four tables shipped (the Covenantal Herald).
-- Existing deployments: run just this block — it is independent of the rest.
create table public.unions (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.unions enable row level security;
create policy "own rows" on public.unions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger unions_updated_at
  before update on public.unions
  for each row execute function public.set_updated_at();
create index unions_owner_updated on public.unions (owner_id, updated_at);

-- ————— card_art (global content — deliberately NOT owner-scoped) —————
-- Added with the card-art upload studio. Existing deployments: run just this
-- block — it is independent of the rest. Unlike the per-Scribe tables above,
-- the designer's card art is shipped content: every visitor (anonymous
-- included) reads it, and any signed-in Scribe may curate it.
create table public.card_art (
  id text primary key,            -- "letter:aleph" | "dorot:sarah-3"
  src text not null,              -- public URL of the storage object
  alt text not null,
  credit text,
  updated_at timestamptz not null default now()
);
alter table public.card_art enable row level security;
create policy "public read" on public.card_art
  for select using (true);
create policy "authed insert" on public.card_art
  for insert to authenticated with check (true);
create policy "authed update" on public.card_art
  for update to authenticated using (true);
create policy "authed delete" on public.card_art
  for delete to authenticated using (true);
create trigger card_art_updated_at
  before update on public.card_art
  for each row execute function public.set_updated_at();

-- The storage bucket holding the image files themselves: public read,
-- authenticated write. If the policy statements below are rejected in the
-- SQL editor (some projects restrict DDL on storage.objects), create the
-- same four policies in the dashboard under Storage → Policies instead.
insert into storage.buckets (id, name, public)
  values ('card-art', 'card-art', true)
  on conflict (id) do nothing;
create policy "card-art public read" on storage.objects
  for select using (bucket_id = 'card-art');
create policy "card-art authed insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'card-art');
create policy "card-art authed update" on storage.objects
  for update to authenticated using (bucket_id = 'card-art');
create policy "card-art authed delete" on storage.objects
  for delete to authenticated using (bucket_id = 'card-art');

-- ————— delete_my_account —————
-- Deleting the auth user cascades through every owner_id FK, removing the
-- Scribe's cloud rows (participants, readings, drafts, shares, all of it).
-- Security definer: runs as the function owner, which may delete from
-- auth.users; auth.uid() scopes it to the caller alone. Existing
-- deployments: run just this block.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ————— content_drafts —————
-- Scriptorium drafts. Draft ids ("dataset::entry") are only unique per
-- Scribe, so — unlike the uuid tables above — the primary key is composite;
-- the app pushes owner_id explicitly and upserts on (owner_id, id).
-- Existing deployments: run just this block.
create table public.content_drafts (
  id text not null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (owner_id, id)
);
alter table public.content_drafts enable row level security;
create policy "own rows" on public.content_drafts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger content_drafts_updated_at
  before update on public.content_drafts
  for each row execute function public.set_updated_at();
create index content_drafts_owner_updated on public.content_drafts (owner_id, updated_at);
