-- Tareas: plantillas de flujo, flujos asignados a clientes y tareas (de flujo o sueltas).

create table if not exists public.task_flows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_flow_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.task_flows(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Instancia de un flujo asignado a un cliente. Guarda el nombre como copia
-- para sobrevivir si la plantilla se elimina o cambia.
create table if not exists public.client_flows (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  flow_id uuid references public.task_flows(id) on delete set null,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tarea de un cliente. client_flow_id null = tarea suelta.
create table if not exists public.client_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  client_flow_id uuid references public.client_flows(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  due_date date,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_flow_steps_flow_id_idx on public.task_flow_steps(flow_id, position);
create index if not exists client_flows_client_id_idx on public.client_flows(client_id);
create index if not exists client_tasks_client_id_idx on public.client_tasks(client_id);
create index if not exists client_tasks_client_flow_id_idx on public.client_tasks(client_flow_id);
create index if not exists client_tasks_due_date_idx on public.client_tasks(due_date) where completed_at is null;

drop trigger if exists task_flows_set_updated_at on public.task_flows;
create trigger task_flows_set_updated_at
  before update on public.task_flows
  for each row execute function public.set_updated_at();

drop trigger if exists client_flows_set_updated_at on public.client_flows;
create trigger client_flows_set_updated_at
  before update on public.client_flows
  for each row execute function public.set_updated_at();

drop trigger if exists client_tasks_set_updated_at on public.client_tasks;
create trigger client_tasks_set_updated_at
  before update on public.client_tasks
  for each row execute function public.set_updated_at();

alter table public.task_flows enable row level security;
alter table public.task_flow_steps enable row level security;
alter table public.client_flows enable row level security;
alter table public.client_tasks enable row level security;

drop policy if exists "Internal users can read task flows" on public.task_flows;
create policy "Internal users can read task flows"
on public.task_flows for select
using (public.is_internal_user());

drop policy if exists "Staff can manage task flows" on public.task_flows;
create policy "Staff can manage task flows"
on public.task_flows for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Internal users can read task flow steps" on public.task_flow_steps;
create policy "Internal users can read task flow steps"
on public.task_flow_steps for select
using (public.is_internal_user());

drop policy if exists "Staff can manage task flow steps" on public.task_flow_steps;
create policy "Staff can manage task flow steps"
on public.task_flow_steps for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Internal users can read client flows" on public.client_flows;
create policy "Internal users can read client flows"
on public.client_flows for select
using (public.is_internal_user());

drop policy if exists "Staff can manage client flows" on public.client_flows;
create policy "Staff can manage client flows"
on public.client_flows for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Internal users can read client tasks" on public.client_tasks;
create policy "Internal users can read client tasks"
on public.client_tasks for select
using (public.is_internal_user());

drop policy if exists "Staff can manage client tasks" on public.client_tasks;
create policy "Staff can manage client tasks"
on public.client_tasks for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));
