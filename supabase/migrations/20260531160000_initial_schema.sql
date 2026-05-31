create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.app_role as enum ('admin', 'staff', 'billing', 'read_only');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.client_status as enum ('prospect', 'active', 'paused', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pending', 'scheduled', 'paid', 'overdue', 'canceled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_type as enum ('contract', 'identification', 'tax', 'payment_receipt', 'legal', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum ('uploaded', 'reviewing', 'approved', 'rejected', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_status as enum ('pending', 'sent', 'failed', 'skipped');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text unique,
  role public.app_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  legal_name text,
  tax_id text,
  status public.client_status not null default 'prospect',
  primary_email text,
  primary_phone text,
  website text,
  address_line text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_display_name_length check (char_length(display_name) >= 2)
);

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  position text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_contacts_full_name_length check (char_length(full_name) >= 2)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  concept text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'MXN',
  due_date date not null,
  paid_at timestamptz,
  status public.payment_status not null default 'pending',
  reminder_days_before integer not null default 3,
  last_reminder_sent_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_positive check (amount > 0),
  constraint payments_currency_length check (char_length(currency) = 3),
  constraint payments_reminder_days_valid check (reminder_days_before >= 0)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  file_path text not null unique,
  file_size bigint,
  mime_type text,
  document_type public.document_type not null default 'other',
  status public.document_status not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_file_name_length check (char_length(file_name) >= 2),
  constraint documents_file_size_positive check (file_size is null or file_size > 0)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint notes_body_length check (char_length(body) >= 2)
);

create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  body text,
  status public.notification_status not null default 'pending',
  provider_message_id text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  failed_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_assigned_to_idx on public.clients(assigned_to);
create index if not exists clients_display_name_idx on public.clients(display_name);

create index if not exists client_contacts_client_id_idx on public.client_contacts(client_id);
create unique index if not exists client_contacts_one_primary_idx
  on public.client_contacts(client_id)
  where is_primary;

create index if not exists payments_client_id_idx on public.payments(client_id);
create index if not exists payments_due_date_idx on public.payments(due_date);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_assigned_to_idx on public.payments(assigned_to);

create index if not exists documents_client_id_idx on public.documents(client_id);
create index if not exists documents_payment_id_idx on public.documents(payment_id);
create index if not exists documents_type_idx on public.documents(document_type);

create index if not exists notes_client_id_idx on public.notes(client_id);
create index if not exists email_notifications_status_idx on public.email_notifications(status);
create index if not exists email_notifications_payment_id_idx on public.email_notifications(payment_id);
create index if not exists activity_logs_client_id_idx on public.activity_logs(client_id);
create index if not exists activity_logs_entity_idx on public.activity_logs(entity_type, entity_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists client_contacts_set_updated_at on public.client_contacts;
create trigger client_contacts_set_updated_at
  before update on public.client_contacts
  for each row execute function public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists email_notifications_set_updated_at on public.email_notifications;
create trigger email_notifications_set_updated_at
  before update on public.email_notifications
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.notes enable row level security;
alter table public.email_notifications enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "Profiles are visible to active internal users" on public.profiles;
create policy "Profiles are visible to active internal users"
on public.profiles for select
using (public.is_internal_user() and is_active);

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Internal users can read clients" on public.clients;
create policy "Internal users can read clients"
on public.clients for select
using (public.is_internal_user());

drop policy if exists "Staff can create clients" on public.clients;
create policy "Staff can create clients"
on public.clients for insert
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Staff can update clients" on public.clients;
create policy "Staff can update clients"
on public.clients for update
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Admins can delete clients" on public.clients;
create policy "Admins can delete clients"
on public.clients for delete
using (public.current_profile_role() = 'admin');

drop policy if exists "Internal users can read contacts" on public.client_contacts;
create policy "Internal users can read contacts"
on public.client_contacts for select
using (public.is_internal_user());

drop policy if exists "Staff can create contacts" on public.client_contacts;
create policy "Staff can create contacts"
on public.client_contacts for insert
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Staff can update contacts" on public.client_contacts;
create policy "Staff can update contacts"
on public.client_contacts for update
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Admins can delete contacts" on public.client_contacts;
create policy "Admins can delete contacts"
on public.client_contacts for delete
using (public.current_profile_role() = 'admin');

drop policy if exists "Internal users can read payments" on public.payments;
create policy "Internal users can read payments"
on public.payments for select
using (public.is_internal_user());

drop policy if exists "Billing users can create payments" on public.payments;
create policy "Billing users can create payments"
on public.payments for insert
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Billing users can update payments" on public.payments;
create policy "Billing users can update payments"
on public.payments for update
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Admins can delete payments" on public.payments;
create policy "Admins can delete payments"
on public.payments for delete
using (public.current_profile_role() = 'admin');

drop policy if exists "Internal users can read documents" on public.documents;
create policy "Internal users can read documents"
on public.documents for select
using (public.is_internal_user());

drop policy if exists "Staff can create documents" on public.documents;
create policy "Staff can create documents"
on public.documents for insert
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Staff can update documents" on public.documents;
create policy "Staff can update documents"
on public.documents for update
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Admins can delete documents" on public.documents;
create policy "Admins can delete documents"
on public.documents for delete
using (public.current_profile_role() = 'admin');

drop policy if exists "Internal users can read notes" on public.notes;
create policy "Internal users can read notes"
on public.notes for select
using (public.is_internal_user());

drop policy if exists "Staff can create notes" on public.notes;
create policy "Staff can create notes"
on public.notes for insert
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Admins can delete notes" on public.notes;
create policy "Admins can delete notes"
on public.notes for delete
using (public.current_profile_role() = 'admin');

drop policy if exists "Internal users can read email notifications" on public.email_notifications;
create policy "Internal users can read email notifications"
on public.email_notifications for select
using (public.is_internal_user());

drop policy if exists "Billing users can create email notifications" on public.email_notifications;
create policy "Billing users can create email notifications"
on public.email_notifications for insert
with check (public.current_profile_role() in ('admin', 'billing'));

drop policy if exists "Billing users can update email notifications" on public.email_notifications;
create policy "Billing users can update email notifications"
on public.email_notifications for update
using (public.current_profile_role() in ('admin', 'billing'))
with check (public.current_profile_role() in ('admin', 'billing'));

drop policy if exists "Admins can delete email notifications" on public.email_notifications;
create policy "Admins can delete email notifications"
on public.email_notifications for delete
using (public.current_profile_role() = 'admin');

drop policy if exists "Internal users can read activity logs" on public.activity_logs;
create policy "Internal users can read activity logs"
on public.activity_logs for select
using (public.is_internal_user());

drop policy if exists "Internal users can create activity logs" on public.activity_logs;
create policy "Internal users can create activity logs"
on public.activity_logs for insert
with check (public.is_internal_user());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-documents',
  'client-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Internal users can read client documents" on storage.objects;
create policy "Internal users can read client documents"
on storage.objects for select
using (
  bucket_id = 'client-documents'
  and public.is_internal_user()
);

drop policy if exists "Staff can upload client documents" on storage.objects;
create policy "Staff can upload client documents"
on storage.objects for insert
with check (
  bucket_id = 'client-documents'
  and public.current_profile_role() in ('admin', 'staff', 'billing')
);

drop policy if exists "Staff can update client documents" on storage.objects;
create policy "Staff can update client documents"
on storage.objects for update
using (
  bucket_id = 'client-documents'
  and public.current_profile_role() in ('admin', 'staff', 'billing')
)
with check (
  bucket_id = 'client-documents'
  and public.current_profile_role() in ('admin', 'staff', 'billing')
);

drop policy if exists "Admins can delete client documents" on storage.objects;
create policy "Admins can delete client documents"
on storage.objects for delete
using (
  bucket_id = 'client-documents'
  and public.current_profile_role() = 'admin'
);
