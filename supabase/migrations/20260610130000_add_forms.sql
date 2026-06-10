-- Formularios: plantillas de formulario, asignaciones a clientes (con liga
-- publica por token) y respuestas. La asignacion guarda una copia de los
-- campos (fields_snapshot) para que editar la plantilla no afecte ligas vivas.

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- field_type 'section' es un separador visual, no acepta respuesta.
create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  label text not null,
  help_text text,
  field_type text not null default 'text'
    check (field_type in ('section', 'text', 'textarea', 'number', 'date', 'select', 'multiselect', 'yesno')),
  options jsonb,
  is_required boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.form_assignments (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.forms(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  form_name text not null,
  fields_snapshot jsonb not null,
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- field_id apunta al id dentro de fields_snapshot (sin FK a form_fields,
-- para que las respuestas sobrevivan a cambios en la plantilla).
create table if not exists public.form_answers (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.form_assignments(id) on delete cascade,
  field_id uuid not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, field_id)
);

create index if not exists form_fields_form_id_idx on public.form_fields(form_id, position);
create index if not exists form_assignments_client_id_idx on public.form_assignments(client_id);
create index if not exists form_assignments_form_id_idx on public.form_assignments(form_id);
create index if not exists form_answers_assignment_id_idx on public.form_answers(assignment_id);

drop trigger if exists forms_set_updated_at on public.forms;
create trigger forms_set_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

drop trigger if exists form_assignments_set_updated_at on public.form_assignments;
create trigger form_assignments_set_updated_at
  before update on public.form_assignments
  for each row execute function public.set_updated_at();

drop trigger if exists form_answers_set_updated_at on public.form_answers;
create trigger form_answers_set_updated_at
  before update on public.form_answers
  for each row execute function public.set_updated_at();

alter table public.forms enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_assignments enable row level security;
alter table public.form_answers enable row level security;

-- La pagina publica /f/[token] usa el service role (bypassa RLS), por lo que
-- no hay politicas para anon: sin el token nadie externo puede leer nada.

drop policy if exists "Internal users can read forms" on public.forms;
create policy "Internal users can read forms"
on public.forms for select
using (public.is_internal_user());

drop policy if exists "Staff can manage forms" on public.forms;
create policy "Staff can manage forms"
on public.forms for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Internal users can read form fields" on public.form_fields;
create policy "Internal users can read form fields"
on public.form_fields for select
using (public.is_internal_user());

drop policy if exists "Staff can manage form fields" on public.form_fields;
create policy "Staff can manage form fields"
on public.form_fields for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Internal users can read form assignments" on public.form_assignments;
create policy "Internal users can read form assignments"
on public.form_assignments for select
using (public.is_internal_user());

drop policy if exists "Staff can manage form assignments" on public.form_assignments;
create policy "Staff can manage form assignments"
on public.form_assignments for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

drop policy if exists "Internal users can read form answers" on public.form_answers;
create policy "Internal users can read form answers"
on public.form_answers for select
using (public.is_internal_user());

drop policy if exists "Staff can manage form answers" on public.form_answers;
create policy "Staff can manage form answers"
on public.form_answers for all
using (public.current_profile_role() in ('admin', 'staff', 'billing'))
with check (public.current_profile_role() in ('admin', 'staff', 'billing'));

-- ── Plantilla precargada: Onboarding de cliente ─────────────────

with onboarding as (
  insert into public.forms (name, description)
  values (
    'Onboarding de cliente',
    'Perfil completo del cliente para arrancar campañas: negocio, números, objetivos, audiencia y materiales.'
  )
  returning id
)
insert into public.form_fields (form_id, label, help_text, field_type, options, is_required, position)
select onboarding.id, v.label, v.help_text, v.field_type, v.options, v.is_required, v.position
from onboarding,
(values
  ('Datos de contacto', null, 'section', null::jsonb, false, 0),
  ('Cliente / Persona responsable del proyecto', null, 'text', null, true, 1),
  ('WhatsApp / Teléfono de contacto', null, 'text', null, true, 2),
  ('Correo electrónico de contacto', null, 'text', null, true, 3),

  ('La empresa', null, 'section', null, false, 4),
  ('Nombre de la empresa o marca', null, 'text', null, true, 5),
  ('Razón social (si aplica)', null, 'text', null, false, 6),
  ('Giro / industria', null, 'text', null, true, 7),
  ('Años operando', null, 'text', null, false, 8),
  ('Ubicación(es)', null, 'text', null, false, 9),

  ('Presencia digital', null, 'section', null, false, 10),
  ('Sitio web (si aplica)', null, 'text', null, false, 11),
  ('Facebook (si aplica)', null, 'text', null, false, 12),
  ('Instagram (si aplica)', null, 'text', null, false, 13),
  ('Número de WhatsApp comercial (si aplica)', null, 'text', null, false, 14),
  ('TikTok / LinkedIn / Otras (si aplica)', null, 'text', null, false, 15),

  ('El negocio', null, 'section', null, false, 16),
  ('¿Qué vende? (en 1 frase)', null, 'text', null, true, 17),
  ('¿Por qué un cliente le compra a usted y no a la competencia?', null, 'textarea', null, true, 18),
  ('Top 3 productos/servicios más vendidos', null, 'textarea', null, true, 19),
  ('3 competidores directos (con URLs si tiene)', null, 'textarea', null, false, 20),

  ('Números del negocio', null, 'section', null, false, 21),
  ('Ticket promedio', null, 'text', null, true, 22),
  ('LTV estimado del cliente (Life Time Value / Valor de Vida del Cliente)',
   'Aproximadamente ¿cuánto dinero te deja un cliente durante toda su relación contigo? No nos interesa solo la primera venta, sino todas las compras que hará en el futuro. Ejemplo: un cliente te compra una vez por $5,000 y vuelve a comprar otras 3 veces durante el año; tu LTV sería aproximadamente $20,000.',
   'text', null, false, 23),
  ('Margen de utilidad aproximado (%)',
   'De cada venta que realizas, ¿qué porcentaje realmente se convierte en ganancia? Ejemplo: vendes en $10,000 y te cuesta $6,000 entregar el producto o servicio; tu utilidad es de $4,000, por lo que tu margen es del 40%.',
   'text', null, false, 24),
  ('CAC máximo aceptable (Coste de Adquisición de Clientes)',
   '¿Cuánto estarías dispuesto a invertir para conseguir un cliente nuevo sin que deje de ser rentable? Ejemplo: si ganas $10,000 de utilidad por cliente, probablemente podrías invertir hasta $2,000 o $3,000 para conseguirlo y seguir ganando dinero.',
   'text', null, false, 25),

  ('Objetivos de la campaña', null, 'section', null, false, 26),
  ('Objetivo principal', null, 'text', null, true, 27),
  ('KPI principal (CPL, CPA, ROAS)',
   '¿Qué resultado es el más importante para tu negocio? Ejemplo: "Mi prioridad es conseguir clientes nuevos aunque cada uno me cueste hasta $1,500."',
   'select',
   '["Leads (CPL): conseguir prospectos al menor costo posible", "Ventas (CPA): conseguir clientes al menor costo posible", "Rentabilidad (ROAS): recuperar varias veces lo invertido en publicidad"]'::jsonb,
   true, 28),
  ('Meta numérica mensual', null, 'text', null, false, 29),
  ('Inversión mensual disponible ($)', null, 'text', null, true, 30),
  ('¿Es flexible si hay resultados?', null, 'yesno', null, false, 31),

  ('Cliente ideal', null, 'section', null, false, 32),
  ('Rango de edad', null, 'text', null, false, 33),
  ('Género predominante', null, 'select', '["Masculino", "Femenino", "Ambos"]'::jsonb, false, 34),
  ('Ubicación geográfica deseada', null, 'text', null, false, 35),
  ('Ubicaciones excluidas', null, 'text', null, false, 36),
  ('Perfil / profesión', null, 'text', null, false, 37),
  ('Pain points (puntos de dolor) principales', null, 'textarea', null, false, 38),
  ('¿Qué los motiva a comprar?', null, 'textarea', null, false, 39),

  ('Historial y medición', null, 'section', null, false, 40),
  ('¿Ha hecho pauta antes?', null, 'yesno', null, false, 41),
  ('Si respondió "Sí": ¿qué funcionó y qué no?', null, 'textarea', null, false, 42),
  ('¿Tiene Pixel / Conversions API instalado?', null, 'select', '["Sí", "No", "No lo sé"]'::jsonb, false, 43),
  ('¿Tiene GA4 / GTM?', null, 'select', '["Sí", "No", "No lo sé"]'::jsonb, false, 44),

  ('Materiales', null, 'section', null, false, 45),
  ('Seleccione los materiales con los que cuenta actualmente', null, 'multiselect',
   '["Logotipo", "Fotos de productos/servicios", "Videos", "Testimonios de clientes", "Manual de identidad / brandbook", "Otro"]'::jsonb,
   false, 46),
  ('Comparte el material disponible aquí (ligas de Drive, Dropbox, etc.)',
   'Si los archivos son muy pesados, favor de enviarlos vía WhatsApp.',
   'textarea', null, false, 47),

  ('Restricciones y legales', null, 'section', null, false, 48),
  ('Categoría especial', null, 'select', '["Ninguna", "Financiera", "Salud", "Vivienda", "Política"]'::jsonb, false, 49),
  ('Palabras o claims que NO se pueden usar', null, 'textarea', null, false, 50),
  ('Competidores que NO se pueden mencionar', null, 'textarea', null, false, 51),
  ('Otros lineamientos legales o de marca', null, 'textarea', null, false, 52)
) as v(label, help_text, field_type, options, is_required, position);
