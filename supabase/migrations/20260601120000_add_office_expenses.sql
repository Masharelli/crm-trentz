do $$
begin
  create type public.office_expense_category as enum (
    'rent',
    'payroll',
    'software',
    'services',
    'marketing',
    'taxes',
    'equipment',
    'maintenance',
    'travel',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.office_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category public.office_expense_category not null default 'other',
  amount numeric(12, 2) not null,
  currency text not null default 'MXN',
  expense_date date not null default current_date,
  vendor text,
  payment_method text,
  receipt_url text,
  recurring boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint office_expenses_description_length check (char_length(description) >= 2),
  constraint office_expenses_amount_positive check (amount > 0),
  constraint office_expenses_currency_length check (char_length(currency) = 3)
);

create index if not exists office_expenses_expense_date_idx
  on public.office_expenses(expense_date);
create index if not exists office_expenses_category_idx
  on public.office_expenses(category);
create index if not exists office_expenses_created_by_idx
  on public.office_expenses(created_by);

drop trigger if exists office_expenses_set_updated_at on public.office_expenses;
create trigger office_expenses_set_updated_at
  before update on public.office_expenses
  for each row execute function public.set_updated_at();

alter table public.office_expenses enable row level security;

drop policy if exists "Internal users can read office expenses" on public.office_expenses;
create policy "Internal users can read office expenses"
on public.office_expenses for select
using (public.is_internal_user());

drop policy if exists "Billing users can create office expenses" on public.office_expenses;
create policy "Billing users can create office expenses"
on public.office_expenses for insert
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Billing users can update office expenses" on public.office_expenses;
create policy "Billing users can update office expenses"
on public.office_expenses for update
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Admins can delete office expenses" on public.office_expenses;
create policy "Admins can delete office expenses"
on public.office_expenses for delete
using (public.current_profile_role() = 'admin');
