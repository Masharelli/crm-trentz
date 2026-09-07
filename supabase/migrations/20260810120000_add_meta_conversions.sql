-- Eventos enviados a Meta CAPI. Solo se registran conversiones atribuibles a
-- anuncios de clic a WhatsApp (ctwa_clid presente).

alter table public.whatsapp_conversations
  add column if not exists ctwa_clid text,
  add column if not exists whatsapp_business_account_id text;

create index if not exists whatsapp_conversations_ctwa_clid_idx
  on public.whatsapp_conversations(ctwa_clid)
  where ctwa_clid is not null;

create table if not exists public.meta_conversion_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_name text not null check (event_name in ('LeadSubmitted', 'Purchase')),
  client_id uuid references public.clients(id) on delete set null,
  conversation_id uuid references public.whatsapp_conversations(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  response jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists meta_conversion_events_status_idx
  on public.meta_conversion_events(status, created_at desc);

alter table public.meta_conversion_events enable row level security;

drop policy if exists "Internal users can read Meta conversion events" on public.meta_conversion_events;
create policy "Internal users can read Meta conversion events"
on public.meta_conversion_events for select
using (public.is_internal_user());
