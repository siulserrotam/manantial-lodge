# Manantial Lodge

Proyecto web para `manantiallodge.com`: pagina publica, reservas, panel administrativo, QR de cliente, restaurante/bar, piscina, alojamientos e inventario.

## Estructura

```text
web/                  Paginas, estilos y JavaScript del sitio
api/                  Funciones serverless para Vercel
supabase/schema.sql   Tablas iniciales para Supabase PostgreSQL
backend/              Version local Delphi/Access para desarrollo en Windows
```

## Despliegue recomendado

```text
manantiallodge.com -> Vercel -> Supabase
```

Vercel publica la web y ejecuta las rutas `/api/*`. Supabase guarda la informacion en PostgreSQL.

## Variables necesarias en Vercel

En Vercel, entra al proyecto y configura:

```text
ADMIN_USER
ADMIN_PASSWORD
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

`ADMIN_USER` y `ADMIN_PASSWORD` permiten entrar al panel si Supabase aun no tiene usuarios.

`SUPABASE_SERVICE_ROLE_KEY` es privada. No debe ir en archivos JavaScript publicos ni en GitHub.

## Preparar Supabase

1. Entra a Supabase.
2. Abre SQL Editor.
3. Ejecuta el archivo `supabase/schema.sql`.
4. Crea el primer usuario administrador en la tabla `funcionarios` o usa temporalmente `ADMIN_USER` y `ADMIN_PASSWORD` desde Vercel.

Ejemplo de primer funcionario:

```sql
insert into public.funcionarios (usuario, clave, identificacion, nombre, celular, email, rol)
values ('admin', '12345678', '0000', 'Administrador', '', '', 'administrador');
```

## Rutas principales

```text
/                  Pagina publica
/admin.html        Panel administrativo
/cliente.html      Vista QR del cliente
/api/health        Prueba de API en Vercel
/api/login         Login administrativo
/api/funcionarios  Crear empleados
/api/reservas      Crear reservas publicas
```

## Nota sobre Delphi

La carpeta `backend/` mantiene la version local con Delphi y Access. Vercel no ejecuta `.exe` de Windows, por eso la version en dominio usa funciones Vercel y Supabase.
