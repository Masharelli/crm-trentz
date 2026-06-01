# Base de datos de Trentz CRM

Este archivo explica la primera version de la base de datos. La migracion esta
en:

```text
supabase/migrations/20260531160000_initial_schema.sql
```

## Que estamos creando

La base de datos queda dividida por responsabilidades:

| Tabla | Para que sirve |
| --- | --- |
| `profiles` | Usuarios internos de Trentz y su rol. Se conecta con `auth.users` de Supabase. |
| `clients` | Empresas o clientes que atiende la oficina. |
| `client_contacts` | Personas de contacto dentro de cada cliente. |
| `payments` | Fechas de pago, mes cero, montos, estados y reglas de recordatorio. |
| `office_expenses` | Gastos internos de oficina para comparar egresos contra pagos cobrados. |
| `documents` | Metadatos de archivos subidos por cliente. El archivo real vive en Supabase Storage. |
| `notes` | Notas internas por cliente. |
| `email_notifications` | Correos programados, enviados o fallidos. |
| `activity_logs` | Historial de actividad: quien hizo que y cuando. |

Tambien se crea un bucket privado de Storage:

```text
client-documents
```

Ese bucket sera donde subamos contratos, comprobantes, identificaciones y otros
documentos.

## Roles internos

La tabla `profiles` maneja estos roles:

| Rol | Uso recomendado |
| --- | --- |
| `admin` | Puede administrar usuarios, borrar registros y cambiar configuracion. |
| `staff` | Puede crear y editar clientes, contactos, pagos, documentos y notas. |
| `billing` | Enfocado en pagos, documentos y correos de cobranza. |
| `read_only` | Puede consultar informacion, pero no modificarla. |

## Seguridad

La migracion activa Row Level Security en todas las tablas principales.

En terminos simples:

- Si no hay usuario autenticado, no se puede leer ni modificar informacion.
- Solo usuarios activos en `profiles` pueden ver datos internos.
- Solo `admin`, `staff` y `billing` pueden crear o editar informacion operativa, pagos y gastos.
- Solo `admin` puede borrar datos sensibles.
- El bucket `client-documents` es privado.

## Como ejecutarlo en Supabase

1. Entra a Supabase y crea un proyecto nuevo para Trentz.
2. Abre `SQL Editor`.
3. Copia todo el contenido de:

```text
supabase/migrations/20260531160000_initial_schema.sql
```

4. Pegalo en el SQL Editor.
5. Ejecuta el script.

6. Ejecuta tambien las migraciones posteriores, por ejemplo:

```text
supabase/migrations/20260601120000_add_office_expenses.sql
supabase/migrations/20260601130000_add_month_zero_payments.sql
```

Si todo sale bien, deberias ver las tablas en `Table Editor` y el bucket
`client-documents` en `Storage`.

## Crear el primer administrador

Despues de ejecutar la migracion:

1. Ve a `Authentication` > `Users`.
2. Crea tu usuario con tu correo.
3. Regresa a `SQL Editor`.
4. Ejecuta esto cambiando el correo:

```sql
update public.profiles
set role = 'admin',
    full_name = 'Tu nombre'
where email = 'tu-correo@trentz.mx';
```

Si el usuario ya existia antes de crear la migracion y no aparece en
`profiles`, usa esta variante:

```sql
insert into public.profiles (id, email, full_name, role)
select id, email, 'Tu nombre', 'admin'
from auth.users
where email = 'tu-correo@trentz.mx'
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();
```

## Probar login en la app

1. Ve a `Authentication` > `Users`.
2. Crea un usuario con correo y contrasena.
3. Si quieres que sea administrador, ejecuta el SQL de la seccion anterior.
4. En la app local abre:

```text
http://localhost:3000/login
```

5. Inicia sesion con ese correo y contrasena.

Al entrar, el dashboard usara las tablas reales de Supabase. Si aun no has
creado clientes, pagos o documentos, las metricas apareceran en cero.

## Variables de entorno

Copia `.env.example` a `.env.local` y llena estos valores desde Supabase:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=notificaciones@trentz.mx
```

Notas importantes:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` pueden usarse en
  el navegador.
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe usarse en componentes del cliente. Solo
  se usara en funciones del servidor o cron jobs.
- `.env.local` no se sube a Git porque contiene secretos reales.

## Siguiente paso del proyecto

Cuando ya tengas el proyecto de Supabase creado y las variables listas, el
siguiente paso sera conectar Next.js a Supabase Auth para iniciar sesion y
empezar a leer clientes reales desde `clients`.
