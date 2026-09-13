-- Operaciones compuestas atomicas y agregados de reportes.

create or replace function public.update_funnel_with_stages(
  p_funnel_id uuid,
  p_name text,
  p_description text,
  p_stages jsonb,
  p_removals jsonb default '[]'::jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_stage jsonb;
  v_removal jsonb;
  v_stage_id uuid;
  v_target_id uuid;
  v_task_flow_id uuid;
  v_ids_by_key jsonb := '{}'::jsonb;
  v_position integer := 0;
begin
  if public.current_profile_role() not in ('admin', 'staff', 'billing') then
    raise exception 'No tienes permiso para actualizar funnels';
  end if;

  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'El nombre del funnel debe tener al menos 2 caracteres';
  end if;

  if jsonb_typeof(p_stages) <> 'array' or jsonb_array_length(p_stages) = 0 then
    raise exception 'El funnel debe tener al menos una etapa';
  end if;

  update public.funnels
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), '')
  where id = p_funnel_id;

  if not found then
    raise exception 'El funnel no existe o no tienes permiso para editarlo';
  end if;

  for v_stage in select value from jsonb_array_elements(p_stages)
  loop
    if char_length(trim(coalesce(v_stage ->> 'name', ''))) = 0 then
      raise exception 'Las etapas no pueden estar vacias';
    end if;

    v_stage_id := nullif(v_stage ->> 'id', '')::uuid;
    v_task_flow_id := nullif(v_stage ->> 'task_flow_id', '')::uuid;

    if v_stage_id is null then
      insert into public.funnel_stages (
        funnel_id,
        name,
        position,
        task_flow_id
      )
      values (
        p_funnel_id,
        trim(v_stage ->> 'name'),
        v_position,
        v_task_flow_id
      )
      returning id into v_stage_id;
    else
      update public.funnel_stages
      set name = trim(v_stage ->> 'name'),
          position = v_position,
          task_flow_id = v_task_flow_id
      where id = v_stage_id
        and funnel_id = p_funnel_id;

      if not found then
        raise exception 'Una etapa no pertenece al funnel o ya no existe';
      end if;
    end if;

    v_ids_by_key := v_ids_by_key || jsonb_build_object(v_stage ->> 'key', v_stage_id);
    v_position := v_position + 1;
  end loop;

  for v_removal in select value from jsonb_array_elements(coalesce(p_removals, '[]'::jsonb))
  loop
    v_stage_id := nullif(v_removal ->> 'id', '')::uuid;
    v_target_id := null;

    if nullif(v_removal ->> 'targetKey', '') is not null then
      v_target_id := nullif(v_ids_by_key ->> (v_removal ->> 'targetKey'), '')::uuid;
      if v_target_id is null then
        raise exception 'No se encontro la etapa destino para reubicar clientes';
      end if;
    end if;

    if v_target_id is null then
      delete from public.funnel_clients where stage_id = v_stage_id;
    else
      update public.funnel_clients
      set stage_id = v_target_id
      where stage_id = v_stage_id;
    end if;

    delete from public.funnel_stages
    where id = v_stage_id
      and funnel_id = p_funnel_id;

    if not found then
      raise exception 'Una etapa eliminada no pertenece al funnel o ya no existe';
    end if;
  end loop;
end;
$$;

revoke all on function public.update_funnel_with_stages(uuid, text, text, jsonb, jsonb)
  from public, anon;
grant execute on function public.update_funnel_with_stages(uuid, text, text, jsonb, jsonb)
  to authenticated;

create or replace function public.update_task_flow_with_steps(
  p_flow_id uuid,
  p_name text,
  p_description text,
  p_steps jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_step jsonb;
  v_step_id uuid;
  v_due_days integer;
  v_position integer := 0;
begin
  if public.current_profile_role() not in ('admin', 'staff', 'billing') then
    raise exception 'No tienes permiso para actualizar flujos';
  end if;

  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'El nombre del flujo debe tener al menos 2 caracteres';
  end if;

  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then
    raise exception 'El flujo debe tener al menos un paso';
  end if;

  update public.task_flows
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), '')
  where id = p_flow_id;

  if not found then
    raise exception 'El flujo no existe o no tienes permiso para editarlo';
  end if;

  delete from public.task_flow_steps as existing
  where existing.flow_id = p_flow_id
    and not exists (
      select 1
      from jsonb_array_elements(p_steps) as incoming(value)
      where nullif(incoming.value ->> 'id', '')::uuid = existing.id
    );

  for v_step in select value from jsonb_array_elements(p_steps)
  loop
    if char_length(trim(coalesce(v_step ->> 'name', ''))) = 0 then
      raise exception 'Los pasos no pueden estar vacios';
    end if;

    v_step_id := nullif(v_step ->> 'id', '')::uuid;
    v_due_days := nullif(v_step ->> 'due_days_after', '')::integer;

    if v_due_days is not null and (v_due_days < 0 or v_due_days > 3650) then
      raise exception 'El plazo de una tarea no es valido';
    end if;

    if v_step_id is null then
      insert into public.task_flow_steps (
        flow_id,
        name,
        position,
        due_days_after
      )
      values (
        p_flow_id,
        trim(v_step ->> 'name'),
        v_position,
        v_due_days
      );
    else
      update public.task_flow_steps
      set name = trim(v_step ->> 'name'),
          position = v_position,
          due_days_after = v_due_days
      where id = v_step_id
        and flow_id = p_flow_id;

      if not found then
        raise exception 'Un paso no pertenece al flujo o ya no existe';
      end if;
    end if;

    v_position := v_position + 1;
  end loop;
end;
$$;

revoke all on function public.update_task_flow_with_steps(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.update_task_flow_with_steps(uuid, text, text, jsonb)
  to authenticated;

create or replace function public.get_crm_report_summary(
  p_today date,
  p_window_start date,
  p_year_start date
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_internal_user() then
    raise exception 'No tienes permiso para consultar reportes';
  end if;

  with payment_values as (
    select
      paid_at,
      status,
      case
        when is_month_zero then coalesce(second_month_amount, 0)
        else amount * (1 - coalesce(discount_pct, 0) / 100)
      end as net_amount,
      case
        when is_month_zero then coalesce(second_month_due_date, due_date)
        else due_date
      end as effective_due_date
    from public.payments
  ),
  revenue_months as (
    select
      to_char(paid_at at time zone 'America/Mexico_City', 'YYYY-MM') as month_key,
      sum(net_amount) as total
    from payment_values
    where paid_at is not null
      and paid_at >= (p_window_start::timestamp at time zone 'America/Mexico_City')
    group by 1
  ),
  client_months as (
    select
      to_char(created_at at time zone 'America/Mexico_City', 'YYYY-MM') as month_key,
      count(*) as total
    from public.clients
    where created_at >= (p_window_start::timestamp at time zone 'America/Mexico_City')
    group by 1
  ),
  client_statuses as (
    select status::text as status_key, count(*) as total
    from public.clients
    group by status
  )
  select jsonb_build_object(
    'cobrado_anio', coalesce((
      select sum(net_amount)
      from payment_values
      where paid_at >= (p_year_start::timestamp at time zone 'America/Mexico_City')
    ), 0),
    'por_cobrar', coalesce((
      select sum(net_amount)
      from payment_values
      where status in ('pending', 'scheduled', 'overdue', 'month_zero')
        and effective_due_date >= p_today
    ), 0),
    'vencido', coalesce((
      select sum(net_amount)
      from payment_values
      where status in ('pending', 'scheduled', 'overdue', 'month_zero')
        and effective_due_date < p_today
    ), 0),
    'clientes_activos', (select count(*) from public.clients where status = 'active'),
    'total_clientes', (select count(*) from public.clients),
    'revenue_by_month', coalesce((
      select jsonb_object_agg(month_key, total) from revenue_months
    ), '{}'::jsonb),
    'clients_by_month', coalesce((
      select jsonb_object_agg(month_key, total) from client_months
    ), '{}'::jsonb),
    'status_counts', coalesce((
      select jsonb_object_agg(status_key, total) from client_statuses
    ), '{}'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_crm_report_summary(date, date, date)
  from public, anon;
grant execute on function public.get_crm_report_summary(date, date, date)
  to authenticated;

create or replace function public.get_payment_totals(
  p_today date,
  p_in_seven_days date,
  p_current_month text
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_internal_user() then
    raise exception 'No tienes permiso para consultar pagos';
  end if;

  with payment_values as (
    select
      paid_at,
      status,
      case
        when is_month_zero then coalesce(second_month_amount, 0)
        else amount * (1 - coalesce(discount_pct, 0) / 100)
      end as net_amount,
      case
        when is_month_zero then coalesce(second_month_due_date, due_date)
        else due_date
      end as effective_due_date
    from public.payments
    where status <> 'canceled'
  )
  select jsonb_build_object(
    'por_cobrar', coalesce(sum(net_amount) filter (
      where status in ('pending', 'scheduled', 'overdue', 'month_zero')
    ), 0),
    'vencido', coalesce(sum(net_amount) filter (
      where status in ('pending', 'scheduled', 'overdue', 'month_zero')
        and effective_due_date < p_today
    ), 0),
    'vencido_count', count(*) filter (
      where status in ('pending', 'scheduled', 'overdue', 'month_zero')
        and effective_due_date < p_today
    ),
    'por_vencer', coalesce(sum(net_amount) filter (
      where status in ('pending', 'scheduled', 'overdue', 'month_zero')
        and effective_due_date between p_today and p_in_seven_days
    ), 0),
    'cobrado_mes', coalesce(sum(net_amount) filter (
      where status = 'paid'
        and to_char(paid_at at time zone 'America/Mexico_City', 'YYYY-MM') = p_current_month
    ), 0)
  ) into v_result
  from payment_values;

  return v_result;
end;
$$;

revoke all on function public.get_payment_totals(date, date, text)
  from public, anon;
grant execute on function public.get_payment_totals(date, date, text)
  to authenticated;

create or replace function public.update_form_with_fields(
  p_form_id uuid,
  p_name text,
  p_description text,
  p_fields jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_field jsonb;
  v_field_id uuid;
  v_field_type text;
  v_position integer := 0;
begin
  if public.current_profile_role() not in ('admin', 'staff', 'billing') then
    raise exception 'No tienes permiso para actualizar formularios';
  end if;

  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'El nombre del formulario debe tener al menos 2 caracteres';
  end if;

  if jsonb_typeof(p_fields) <> 'array' or jsonb_array_length(p_fields) = 0 then
    raise exception 'El formulario debe tener al menos una pregunta';
  end if;

  update public.forms
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), '')
  where id = p_form_id;

  if not found then
    raise exception 'El formulario no existe o no tienes permiso para editarlo';
  end if;

  delete from public.form_fields as existing
  where existing.form_id = p_form_id
    and not exists (
      select 1
      from jsonb_array_elements(p_fields) as incoming(value)
      where nullif(incoming.value ->> 'id', '')::uuid = existing.id
    );

  for v_field in select value from jsonb_array_elements(p_fields)
  loop
    if char_length(trim(coalesce(v_field ->> 'label', ''))) = 0 then
      raise exception 'Todas las preguntas necesitan un texto';
    end if;

    v_field_id := nullif(v_field ->> 'id', '')::uuid;
    v_field_type := v_field ->> 'field_type';

    if v_field_id is null then
      insert into public.form_fields (
        form_id,
        label,
        help_text,
        field_type,
        options,
        is_required,
        position
      )
      values (
        p_form_id,
        trim(v_field ->> 'label'),
        nullif(trim(coalesce(v_field ->> 'help_text', '')), ''),
        v_field_type,
        case when jsonb_typeof(v_field -> 'options') = 'array'
          then v_field -> 'options' else null end,
        case when v_field_type = 'section' then false
          else coalesce((v_field ->> 'is_required')::boolean, false) end,
        v_position
      );
    else
      update public.form_fields
      set label = trim(v_field ->> 'label'),
          help_text = nullif(trim(coalesce(v_field ->> 'help_text', '')), ''),
          field_type = v_field_type,
          options = case when jsonb_typeof(v_field -> 'options') = 'array'
            then v_field -> 'options' else null end,
          is_required = case when v_field_type = 'section' then false
            else coalesce((v_field ->> 'is_required')::boolean, false) end,
          position = v_position
      where id = v_field_id
        and form_id = p_form_id;

      if not found then
        raise exception 'Una pregunta no pertenece al formulario o ya no existe';
      end if;
    end if;

    v_position := v_position + 1;
  end loop;
end;
$$;

revoke all on function public.update_form_with_fields(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.update_form_with_fields(uuid, text, text, jsonb)
  to authenticated;

create or replace function public.get_overdue_payment_summary(p_today date)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_internal_user() then
    raise exception 'No tienes permiso para consultar pagos';
  end if;

  select jsonb_build_object(
    'count', count(*),
    'total', coalesce(sum(amount * (1 - coalesce(discount_pct, 0) / 100)), 0)
  ) into v_result
  from public.payments
  where is_month_zero = false
    and status not in ('paid', 'canceled')
    and (status = 'overdue' or due_date < p_today);

  return v_result;
end;
$$;

revoke all on function public.get_overdue_payment_summary(date)
  from public, anon;
grant execute on function public.get_overdue_payment_summary(date)
  to authenticated;
