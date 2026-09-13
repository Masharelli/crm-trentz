-- Automatiza flujos de tareas cuando un cliente entra por primera vez a una
-- etapa del funnel. Los plazos se calculan desde la fecha de entrada.

alter table public.task_flow_steps
  add column if not exists due_days_after integer;

alter table public.task_flow_steps
  drop constraint if exists task_flow_steps_due_days_after_valid;
alter table public.task_flow_steps
  add constraint task_flow_steps_due_days_after_valid
  check (due_days_after is null or due_days_after between 0 and 3650);

alter table public.funnel_stages
  add column if not exists task_flow_id uuid
  references public.task_flows(id) on delete set null;

create index if not exists funnel_stages_task_flow_id_idx
  on public.funnel_stages(task_flow_id)
  where task_flow_id is not null;

alter table public.client_flows
  add column if not exists source_funnel_stage_id uuid
  references public.funnel_stages(id) on delete set null;

create unique index if not exists client_flows_stage_automation_once_idx
  on public.client_flows(client_id, source_funnel_stage_id)
  where source_funnel_stage_id is not null;

create or replace function public.apply_funnel_stage_task_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flow_id uuid;
  v_flow_name text;
  v_stage_name text;
  v_client_flow_id uuid;
begin
  if tg_op = 'UPDATE' and new.stage_id is not distinct from old.stage_id then
    return new;
  end if;

  select stage.task_flow_id, flow.name, stage.name
    into v_flow_id, v_flow_name, v_stage_name
  from public.funnel_stages as stage
  left join public.task_flows as flow on flow.id = stage.task_flow_id
  where stage.id = new.stage_id
    and stage.funnel_id = new.funnel_id;

  if not found then
    raise exception 'La etapa no pertenece al funnel indicado';
  end if;

  if v_flow_id is null or v_flow_name is null then
    return new;
  end if;

  insert into public.client_flows (
    client_id,
    flow_id,
    name,
    created_by,
    source_funnel_stage_id
  )
  values (
    new.client_id,
    v_flow_id,
    v_flow_name,
    auth.uid(),
    new.stage_id
  )
  on conflict do nothing
  returning id into v_client_flow_id;

  -- Si ya se ejecuto esta etapa para el cliente, no vuelve a crear tareas.
  if v_client_flow_id is null then
    return new;
  end if;

  insert into public.client_tasks (
    client_id,
    client_flow_id,
    name,
    position,
    due_date,
    created_by
  )
  select
    new.client_id,
    v_client_flow_id,
    step.name,
    step.position,
    case
      when step.due_days_after is null then null
      else (now() at time zone 'America/Mexico_City')::date
        + step.due_days_after
    end,
    auth.uid()
  from public.task_flow_steps as step
  where step.flow_id = v_flow_id
  order by step.position;

  insert into public.activity_logs (
    actor_id,
    client_id,
    entity_type,
    entity_id,
    action,
    description,
    metadata
  )
  values (
    auth.uid(),
    new.client_id,
    'client_flow',
    v_client_flow_id,
    'auto_assigned',
    format(
      'Flujo "%s" asignado automaticamente al entrar a "%s"',
      v_flow_name,
      v_stage_name
    ),
    jsonb_build_object(
      'funnel_id', new.funnel_id,
      'stage_id', new.stage_id,
      'task_flow_id', v_flow_id
    )
  );

  return new;
end;
$$;

revoke execute on function public.apply_funnel_stage_task_automation()
  from public, anon, authenticated;

drop trigger if exists funnel_stage_task_automation on public.funnel_clients;
create trigger funnel_stage_task_automation
  after insert or update of stage_id on public.funnel_clients
  for each row execute function public.apply_funnel_stage_task_automation();
