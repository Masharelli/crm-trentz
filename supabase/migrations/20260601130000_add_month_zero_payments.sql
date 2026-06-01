alter type public.payment_status add value if not exists 'month_zero';

alter table public.payments
  add column if not exists is_month_zero boolean not null default false,
  add column if not exists second_month_amount numeric(12, 2),
  add column if not exists second_month_due_date date;

alter table public.payments
  drop constraint if exists payments_amount_positive,
  drop constraint if exists payments_amount_non_negative,
  drop constraint if exists payments_second_month_amount_positive,
  drop constraint if exists payments_month_zero_required_fields;

alter table public.payments
  add constraint payments_amount_non_negative check (amount >= 0),
  add constraint payments_second_month_amount_positive
    check (second_month_amount is null or second_month_amount > 0),
  add constraint payments_month_zero_required_fields check (
    (
      is_month_zero
      and status::text = 'month_zero'
      and amount = 0
      and paid_at is null
      and second_month_amount is not null
      and second_month_due_date is not null
    )
    or
    (
      not is_month_zero
      and status::text <> 'month_zero'
      and amount > 0
    )
  );

create index if not exists payments_month_zero_idx
  on public.payments(is_month_zero);
create index if not exists payments_second_month_due_date_idx
  on public.payments(second_month_due_date);
