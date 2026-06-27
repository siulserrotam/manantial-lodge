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
SYNKRO_ADMIN_TOKEN
```

`ADMIN_USER` y `ADMIN_PASSWORD` permiten entrar al panel si Supabase aun no tiene usuarios.

`SUPABASE_SERVICE_ROLE_KEY` es privada. No debe ir en archivos JavaScript publicos ni en GitHub.

`SYNKRO_ADMIN_TOKEN` protege la consulta y actualizacion interna de leads de Synkro.

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
/api/prospectos/buscar    Busca prospectos desde OpenStreetMap/Overpass
/api/prospectos/exportar  Exporta prospectos a Excel
/synkro.html       Landing inicial de Synkro
/api/synkro/leads  Captura leads de Synkro
/synkro-leads.html Panel interno de seguimiento Synkro
```

## Modulo de prospectos

El modulo de prospectos busca negocios por tipo, pais, departamento y ciudad usando OpenStreetMap a traves de Overpass API. No usa Google Places ni servicios pagos.

### Instalar dependencias

```bash
npm install
```

Dependencias principales:

```text
axios    Peticiones HTTP a Overpass y sitios web publicos
cheerio  Lectura de HTML para intentar encontrar correos visibles
xlsx     Exportacion de resultados a Excel
```

### Variables opcionales

```text
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
OVERPASS_API_URLS=https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter
NOMINATIM_API_URL=https://nominatim.openstreetmap.org/search
OVERPASS_TIMEOUT_MS=25000
PROSPECTOS_GEOCODE_TIMEOUT_MS=8000
PROSPECTOS_EMAIL_TIMEOUT_MS=6000
PROSPECTOS_USER_AGENT=StudioManantialProspectos/1.0 (contacto@manantiallodge.com)
```

Si no se configuran, el modulo usa valores por defecto conservadores. Primero ubica la ciudad o departamento con Nominatim de OpenStreetMap para consultar Overpass por bbox, evitando areas enormes. Las busquedas se limitan a maximo 200 resultados para respetar el uso de Overpass. `OVERPASS_API_URLS` permite rotar endpoints publicos separados por coma.

### Ejemplos de uso

Buscar negocios:

```text
GET /api/prospectos/buscar?tipo=glamping&pais=Colombia&ciudad=Bogota
GET /api/prospectos/buscar?tipo=lavanderia&pais=Colombia&ciudad=Medellin
GET /api/prospectos/buscar?tipo=cafe&pais=Colombia&departamento=Antioquia&ciudad=Medellin&limite=200
GET /api/prospectos/buscar?tipo=hoteles%20campestres&pais=Colombia&departamento=Boyaca&soloConWeb=1
GET /api/prospectos/buscar?tipo=lavanderia&pais=Colombia&departamento=Antioquia&ciudad=Medellin&soloConTelefono=1
```

Exportar a Excel:

```text
GET /api/prospectos/exportar?tipo=glamping&pais=Colombia&departamento=Cundinamarca&ciudad=Bogota
```

Respuesta JSON esperada en busqueda:

```json
{
  "ok": true,
  "total": 1,
  "limite": 200,
  "prospectos": [
    {
      "nombre": "Nombre del negocio",
      "tipo": "glamping",
      "pais": "Colombia",
      "departamento": "Cundinamarca",
      "ciudad": "Bogota",
      "direccion": "Direccion si existe",
      "telefono": "",
      "sitio_web": "",
      "correo": "",
      "latitud": 4.711,
      "longitud": -74.0721,
      "fuente": "OpenStreetMap / Overpass API",
      "estado_comercial": "Pendiente"
    }
  ]
}
```

Si el negocio tiene sitio web, el modulo intenta encontrar correos en la pagina principal y en `/contacto`, `/contact` y `/reservas`. Si no encuentra correo, retorna `Sin correo`; si el negocio no tiene web, deja el campo vacio.

La pagina `/prospectos.html` permite digitar cualquier tipologia, escoger pais/departamento/ciudad, filtrar por resultados con telefono, correo o pagina web, ver resultados paginados de 20 en 20 y descargar CSV o Excel.

### Agregar nuevos tipos de negocio

Edita `src/modules/prospectos/prospectos.utils.js` y agrega una entrada en `BUSINESS_TAGS` con sus alias y tags de OpenStreetMap. Ejemplo:

```js
{
  aliases: ["spa", "spas"],
  filters: [{ key: "leisure", value: "spa" }]
}
```

Cada filtro se consulta para nodos, ways y relations dentro del area indicada.

## Subproyecto Synkro

Synkro es una validacion inicial para un producto SaaS B2B que conectara tiendas online con ERPs contables. En esta primera fase dentro de este repositorio solo se implementa la entrada comercial:

```text
synkro.manantiallodge.com -> /web/synkro.html
/synkro.html              -> landing local/manual
/api/synkro/leads         -> captura de leads en Supabase
/synkro-leads.html        -> seguimiento interno de leads
```

La landing incluye:

```text
Propuesta de valor
Calculadora ROI
Flujo conceptual e-commerce -> Synkro -> ERP
Formulario de validacion comercial
```

Para guardar leads en Supabase, ejecuta el bloque de `synkro_leads` incluido en `supabase/schema.sql` o vuelve a correr el schema completo en un entorno controlado.

Variables necesarias ya existentes:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

DNS/Vercel:

```text
1. Agregar el dominio synkro.manantiallodge.com al proyecto en Vercel.
2. Configurar el CNAME o registro recomendado por Vercel en el proveedor DNS.
3. Confirmar que el deployment de produccion usa la rama produccion.
```

Esta fase no incluye todavia la plataforma .NET, multi-tenancy, conectores Shopify/WooCommerce/Siigo, RabbitMQ ni panel privado. Esos puntos quedan para fases posteriores cuando la validacion comercial tenga leads reales.

La segunda fase agrega seguimiento interno de leads:

```text
GET /api/synkro/leads
PATCH /api/synkro/leads
```

Ambos requieren header:

```text
Authorization: Bearer <SYNKRO_ADMIN_TOKEN>
```

La pagina `/synkro-leads.html` permite pegar el token, filtrar leads por estado, cambiar estado y guardar nota comercial.

El resumen vivo de fases esta en `docs/synkro-fases.md`.

## Nota sobre Delphi

La carpeta `backend/` mantiene la version local con Delphi y Access. Vercel no ejecuta `.exe` de Windows, por eso la version en dominio usa funciones Vercel y Supabase.
