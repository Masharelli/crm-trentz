-- Confiabilidad y actualizacion en vivo para la bandeja de WhatsApp.

alter table public.whatsapp_conversations
  add column if not exists inbox_status text not null default 'open'
    check (inbox_status in ('open', 'resolved')),
  add column if not exists assigned_to uuid references public.profiles(id)
    on delete set null;

create index if not exists whatsapp_conversations_inbox_status_idx
  on public.whatsapp_conversations(inbox_status, last_message_at desc);
create index if not exists whatsapp_conversations_assigned_to_idx
  on public.whatsapp_conversations(assigned_to, last_message_at desc);

-- Los mensajes salientes se crean como pending antes de llamar a Meta y el
-- mismo usuario completa despues el wamid/estado. El webhook sigue usando
-- service role para los estados posteriores.
drop policy if exists "Staff can update their whatsapp messages" on public.whatsapp_messages;
create policy "Staff can update their whatsapp messages"
on public.whatsapp_messages for update
using (
  public.current_profile_role() in ('admin', 'staff', 'billing')
  and sent_by = auth.uid()
)
with check (
  public.current_profile_role() in ('admin', 'staff', 'billing')
  and sent_by = auth.uid()
);

-- Registra un entrante e incrementa no leidos en una sola operacion para no
-- perder conteos cuando llegan varios webhooks al mismo tiempo. Los eventos
-- atrasados tampoco deben regresar la vista previa a un mensaje mas viejo.
create or replace function public.record_whatsapp_inbound(
  p_conversation_id uuid,
  p_occurred_at timestamptz,
  p_preview text,
  p_ctwa_clid text default null,
  p_waba_id text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.whatsapp_conversations
  set
    last_message_preview = case
      when last_message_at is null or p_occurred_at >= last_message_at
        then p_preview
      else last_message_preview
    end,
    last_message_at = greatest(coalesce(last_message_at, p_occurred_at), p_occurred_at),
    last_inbound_at = greatest(coalesce(last_inbound_at, p_occurred_at), p_occurred_at),
    unread_count = unread_count + 1,
    inbox_status = 'open',
    ctwa_clid = coalesce(p_ctwa_clid, ctwa_clid),
    whatsapp_business_account_id = coalesce(p_waba_id, whatsapp_business_account_id)
  where id = p_conversation_id;
$$;

revoke all on function public.record_whatsapp_inbound(uuid, timestamptz, text, text, text)
from public, anon, authenticated;
grant execute on function public.record_whatsapp_inbound(uuid, timestamptz, text, text, text)
to service_role;

-- Habilita los eventos que usa el cliente. El bloque es idempotente para
-- proyectos donde las tablas ya se agregaron manualmente.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'whatsapp_conversations'
    ) then
      alter publication supabase_realtime add table public.whatsapp_conversations;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'whatsapp_messages'
    ) then
      alter publication supabase_realtime add table public.whatsapp_messages;
    end if;
  end if;
end $$;
