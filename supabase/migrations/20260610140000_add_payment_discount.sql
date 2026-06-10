-- Registra la columna de descuento de pagos en las migraciones.
-- La columna ya existe en produccion (se agrego desde el SQL Editor sin
-- guardar la migracion); el "if not exists" hace que sea seguro ejecutarla
-- ahi tambien. En ambientes nuevos la crea desde cero.

alter table public.payments
  add column if not exists discount_pct numeric(5, 2) not null default 0;
