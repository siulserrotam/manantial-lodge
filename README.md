# Manantial Lodge

Aplicacion web de `manantiallodge.com` migrada a Next.js, con Supabase como base de datos y Vercel como hosting.

## Arquitectura

```text
manantiallodge.com
  -> Vercel
     -> Next.js
        -> app/ paginas y API
        -> public/ JS/CSS legacy reutilizados
     -> Supabase PostgreSQL
```

## Tecnologias

- Framework principal: Next.js.
- UI: React + HTML/CSS existente.
- Lenguaje: JavaScript.
- API: Next Route Handlers en `app/api`.
- Base de datos: Supabase PostgreSQL.
- Hosting: Vercel.
- Dominio: Hostinger DNS apuntando a Vercel.
- Historico local: Delphi/Pascal + Access en `backend/`.

## Estructura

```text
app/                  Aplicacion Next.js
app/api/              Backend serverless de Next
app/_lib/             Utilidades internas
public/               CSS y scripts publicados
web/                  HTML/JS/CSS original usado como vista legacy
supabase/schema.sql   Esquema de base de datos
backend/              Version Delphi/Pascal local conservada como historico
data/                 Datos locales ignorados por Git
```

## URLs

```text
Produccion: https://manantiallodge.com
Temporal Vercel: https://project-fczbm.vercel.app
Admin: https://manantiallodge.com/admin.html
QR cliente: https://manantiallodge.com/cliente.html?visita=TOKEN
GitHub: https://github.com/siulserrotam/manantial-lodge
Supabase: https://fricrvjzslzmveqenmxt.supabase.co
```

## Variables en Vercel

```text
ADMIN_USER
ADMIN_PASSWORD
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` es privada y nunca debe ir en JavaScript publico.

## Desarrollo

```bash
npm install
npm run dev
```

## Nota

La version gratuita de Vercel y Supabase es suficiente para empezar. Cuando crezcan fotos, historicos o pedidos diarios, conviene archivar cierres mensuales y evaluar un plan pago.
