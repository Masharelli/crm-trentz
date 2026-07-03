-- WhatsApp: conversaciones y mensajes recibidos/enviados via Meta Cloud API
-- (modo Coexistence: la app del celular sigue funcionando y sus mensajes
-- llegan como ecos por webhook).

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  phone_display text not null,
  profile_name text,
  client_id uuid references public.clients(id) on delete set null,
  contact_id uuid references public.client_contacts(id) on delete set null,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  last_message_preview text,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  wamid text unique,
  direction text not null check (direction in ('inbound', 'outbound')),
  source text not null default 'api' check (source in ('api', 'phone', 'history')),
  type text not null default 'text',
  body text,
  media_path text,
  media_mime_type text,
  status text,
  error_message text,
  wa_timestamp timestamptz not null,
  sent_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_conversation_idx
  on public.whatsapp_messages(conversation_id, wa_timestamp);
create index if not exists whatsapp_conversations_last_message_idx
  on public.whatsapp_conversations(last_message_at desc);
create index if not exists whatsapp_conversations_client_id_idx
  on public.whatsapp_conversations(client_id);

drop trigger if exists whatsapp_conversations_set_updated_at on public.whatsapp_conversations;
create trigger whatsapp_conversations_set_updated_at
  before update on public.whatsapp_conversations
  for each row execute function public.set_updated_at();

-- Matchea un numero de WhatsApp contra clientes por los ultimos 10 digitos.
-- Los telefonos guardados tienen formato libre y el wa_id mexicano puede
-- traer el "1" extra (521XXXXXXXXXX), por eso se comparan solo los ultimos 10.
-- Prioriza contactos (mas especifico) sobre el telefono principal del cliente.
create or replace function public.match_whatsapp_phone(p_last10 text)
returns table(client_id uuid, contact_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select matches.client_id, matches.contact_id from (
    select cc.client_id, cc.id as contact_id, 0 as prio
    from public.client_contacts cc
    where cc.phone is not null
      and right(regexp_replace(cc.phone, '\D', '', 'g'), 10) = p_last10
    union all
    select c.id as client_id, null::uuid as contact_id, 1 as prio
    from public.clients c
    where c.primary_phone is not null
      and right(regexp_replace(c.primary_phone, '\D', '', 'g'), 10) = p_last10
  ) matches
  order by prio
  limit 1;
$$;

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

drop policy if exists "Internal users can read whatsapp conversations" on public.whatsapp_conversations;
create policy "Internal users can read whatsapp conversations"
on public.whatsapp_conversations for select
using (public.is_internal_user());

drop policy if exists "Staff can manage whatsapp conversations" on public.whatsapp_conversations;
create policy "Staff can manage whatsapp conversations"
on public.whatsapp_conversations for update
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Admins can delete whatsapp conversations" on public.whatsapp_conversations;
create policy "Admins can delete whatsapp conversations"
on public.whatsapp_conversations for delete
using (public.current_profile_role() = 'admin');

drop policy if exists "Internal users can read whatsapp messages" on public.whatsapp_messages;
create policy "Internal users can read whatsapp messages"
on public.whatsapp_messages for select
using (public.is_internal_user());

drop policy if exists "Staff can create whatsapp messages" on public.whatsapp_messages;
create policy "Staff can create whatsapp messages"
on public.whatsapp_messages for insert
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Admins can delete whatsapp messages" on public.whatsapp_messages;
create policy "Admins can delete whatsapp messages"
on public.whatsapp_messages for delete
using (public.current_profile_role() = 'admin');

-- Media recibida (imagenes, audios, documentos). El webhook sube con service
-- role; los usuarios internos solo leen via signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('whatsapp-media', 'whatsapp-media', false, 26214400)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Internal users can read whatsapp media" on storage.objects;
create policy "Internal users can read whatsapp media"
on storage.objects for select
using (
  bucket_id = 'whatsapp-media'
  and public.is_internal_user()
);
