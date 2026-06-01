# Trentz CRM

CRM interno para controlar clientes, fechas de pago, mes cero, contabilidad
ligera, documentos y recordatorios por correo.

## Stack inicial

- Next.js con App Router para la aplicacion web.
- TypeScript para reducir errores al modificar codigo.
- Tailwind CSS para estilos rapidos y consistentes.
- Supabase para base de datos, login y storage.
- Resend para correos transaccionales.

## Lo que ya existe

- `src/app/page.tsx`: dashboard protegido. Lee metricas, pagos, clientes y
  documentos desde Supabase.
- `src/app/login/page.tsx`: pantalla de acceso interno.
- `src/app/auth-actions.ts`: acciones de iniciar sesion y cerrar sesion.
- `src/lib/dashboard-data.ts`: consultas que alimentan el dashboard.
- `src/app/(dashboard)/contabilidad`: tracking de gastos de oficina, ingresos
  cobrados y balance por mes.
- `src/lib/supabase`: clientes de Supabase para servidor, navegador y proxy.
- `src/app/layout.tsx`: configuracion global de la app, idioma y metadatos del
  sitio.
- `src/app/globals.css`: estilos globales y variables base.
- `.env.example`: lista de variables que necesitaremos configurar para
  Supabase y Resend.
- `supabase/migrations`: migraciones de base de datos, incluyendo clientes,
  pagos, documentos y gastos de oficina.
- `docs/database.md`: explicacion paso a paso de tablas, roles, seguridad y
  ejecucion en Supabase.

## Comandos utiles

```bash
npm run dev
```

Levanta la app en desarrollo. Normalmente queda en `http://localhost:3000`.

```bash
npm run lint
```

Revisa errores de codigo y estilo.

```bash
npm run build
```

Compila la app como se haria antes de subirla a produccion.

## Flujo de uso local

1. Levanta el servidor con `npm run dev`.
2. Abre `http://localhost:3000`.
3. Si no hay sesion activa, la app te manda a `/login`.
4. Entra con un usuario creado en Supabase Auth.
5. El dashboard lee datos reales desde Supabase.

Si las metricas aparecen en cero, normalmente significa que las tablas aun no
tienen registros o que el usuario no existe/esta inactivo en `profiles`.

## Siguientes pasos tecnicos

1. Crear un proyecto en Supabase.
2. Ejecutar la migracion de `supabase/migrations`.
3. Crear el primer usuario administrador.
4. Agregar variables de entorno en `.env.local`.
5. Probar login en `/login`.
6. Crear los formularios para registrar clientes.
7. Agregar subida de archivos a Supabase Storage.
8. Conectar Resend para enviar recordatorios.

La guia detallada esta en `docs/database.md`.
