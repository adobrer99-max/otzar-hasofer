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
