-- Funnels: tableros tipo kanban para mover clientes entre etapas.

create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funnel_stages (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.funnel_clients (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  stage_id uuid not null references public.funnel_stages(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (funnel_id, client_id)
);

create index if not exists funnel_stages_funnel_id_idx on public.funnel_stages(funnel_id, position);
create index if not exists funnel_clients_funnel_id_idx on public.funnel_clients(funnel_id);
create index if not exists funnel_clients_stage_id_idx on public.funnel_clients(stage_id);
create index if not exists funnel_clients_client_id_idx on public.funnel_clients(client_id);

drop trigger if exists funnels_set_updated_at on public.funnels;
create trigger funnels_set_updated_at
  before update on public.funnels
  for each row execute function public.set_updated_at();

drop trigger if exists funnel_clients_set_updated_at on public.funnel_clients;
create trigger funnel_clients_set_updated_at
  before update on public.funnel_clients
  for each row execute function public.set_updated_at();

alter table public.funnels enable row level security;
alter table public.funnel_stages enable row level security;
alter table public.funnel_clients enable row level security;

drop policy if exists "Internal users can read funnels" on public.funnels;
create policy "Internal users can read funnels"
on public.funnels for select
using (public.is_internal_user());

drop policy if exists "Staff can create funnels" on public.funnels;
create policy "Staff can create funnels"
on public.funnels for insert
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Staff can update funnels" on public.funnels;
create policy "Staff can update funnels"
on public.funnels for update
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Staff can delete funnels" on public.funnels;
create policy "Staff can delete funnels"
on public.funnels for delete
using (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Internal users can read funnel stages" on public.funnel_stages;
create policy "Internal users can read funnel stages"
on public.funnel_stages for select
using (public.is_internal_user());

drop policy if exists "Staff can manage funnel stages" on public.funnel_stages;
create policy "Staff can manage funnel stages"
on public.funnel_stages for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Internal users can read funnel clients" on public.funnel_clients;
create policy "Internal users can read funnel clients"
on public.funnel_clients for select
using (public.is_internal_user());

drop policy if exists "Staff can manage funnel clients" on public.funnel_clients;
create policy "Staff can manage funnel clients"
on public.funnel_clients for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));
