-- Portal del cliente: liga publica por token (como los formularios) donde el
-- cliente consulta sus pagos, documentos y formularios pendientes sin cuenta.
-- La pagina /p/[token] usa el service role; sin politicas anon el token es la
-- unica via de acceso. portal_enabled permite apagar la liga sin perderla.

alter table public.clients
  add column if not exists portal_token uuid not null unique default gen_random_uuid(),
  add column if not exists portal_enabled boolean not null default false;
