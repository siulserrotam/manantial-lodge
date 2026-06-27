create extension if not exists pgcrypto;

create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  clave text not null,
  identificacion text,
  nombre text not null,
  celular text,
  email text,
  rol text not null default 'operador',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.alojamientos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo text not null,
  precio numeric(12,2) not null default 0,
  estado text not null default 'Disponible',
  descripcion text,
  activos text,
  despensa text,
  imagen text,
  creado_en timestamptz not null default now()
);

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  alojamiento_id uuid references public.alojamientos(id),
  alojamiento_nombre text not null,
  nombre text not null,
  identificacion text not null,
  email text,
  celular text,
  fecha_ingreso date not null,
  fecha_salida date not null,
  estado text not null default 'Pendiente',
  creado_en timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  qr_token text not null unique,
  nombre text not null,
  identificacion text,
  celular text,
  email text,
  rol text not null default 'pasadia',
  alojamiento_id uuid references public.alojamientos(id),
  alojamiento_nombre text,
  estado text not null default 'abierta',
  creado_en timestamptz not null default now(),
  cerrado_en timestamptz
);

create table if not exists public.inventario (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  unidad text not null default 'unidad',
  cantidad numeric(12,2) not null default 0,
  valor_compra numeric(12,2) not null default 0,
  fecha_compra date,
  creado_en timestamptz not null default now()
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  inventario_id uuid references public.inventario(id),
  nombre text not null,
  categoria text not null,
  precio numeric(12,2) not null default 0,
  cantidad_inventario numeric(12,2) not null default 1,
  imagen text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.solicitudes_qr (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  qr_token text not null,
  cliente_nombre text not null,
  tipo text not null,
  destino text,
  detalle text not null,
  total numeric(12,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  estado text not null default 'pendiente',
  creado_en timestamptz not null default now()
);

create table if not exists public.cargos_cuenta (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  concepto text not null,
  valor numeric(12,2) not null default 0,
  origen text,
  creado_en timestamptz not null default now()
);

create table if not exists public.synkro_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  company text,
  ecommerce_platform text,
  erp_system text,
  monthly_orders integer not null default 0,
  message text,
  commercial_note text,
  score integer not null default 0,
  urgency text not null default 'medium',
  owner text,
  next_contact_at date,
  ecommerce_validated boolean not null default false,
  erp_validated boolean not null default false,
  source text not null default 'synkro_landing',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.synkro_leads
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists company text,
  add column if not exists ecommerce_platform text,
  add column if not exists erp_system text,
  add column if not exists monthly_orders integer not null default 0,
  add column if not exists message text,
  add column if not exists commercial_note text,
  add column if not exists score integer not null default 0,
  add column if not exists urgency text not null default 'medium',
  add column if not exists owner text,
  add column if not exists next_contact_at date,
  add column if not exists ecommerce_validated boolean not null default false,
  add column if not exists erp_validated boolean not null default false,
  add column if not exists source text not null default 'synkro_landing',
  add column if not exists status text not null default 'new',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'synkro_leads'
      and column_name = 'nombre'
  ) then
    execute 'alter table public.synkro_leads alter column nombre drop not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'synkro_leads'
      and column_name = 'celular'
  ) then
    execute 'alter table public.synkro_leads alter column celular drop not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'synkro_leads'
      and column_name = 'nombre'
  ) then
    execute $migration$
      update public.synkro_leads
      set
        name = coalesce(name, nombre),
        phone = coalesce(phone, celular),
        company = coalesce(company, empresa),
        ecommerce_platform = coalesce(ecommerce_platform, ecommerce),
        erp_system = coalesce(erp_system, erp),
        monthly_orders = coalesce(monthly_orders, pedidos_mes, 0),
        message = coalesce(message, mensaje),
        commercial_note = coalesce(commercial_note, nota_comercial),
        source = coalesce(source, origen, 'synkro_landing'),
        status = coalesce(status, case estado
          when 'nuevo' then 'new'
          when 'contactado' then 'contacted'
          when 'calificado' then 'qualified'
          when 'descartado' then 'discarded'
          else estado
        end, 'new'),
        created_at = coalesce(created_at, creado_en, now()),
        updated_at = coalesce(updated_at, actualizado_en)
      where true
    $migration$;
  end if;
end $$;

create table if not exists public.synkro_tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key_hash text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.synkro_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.synkro_tenants(id),
  provider text not null,
  direction text not null default 'ecommerce_to_erp',
  status text not null default 'sandbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (tenant_id, provider)
);

create table if not exists public.synkro_external_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.synkro_tenants(id),
  integration_id uuid references public.synkro_integrations(id),
  platform text not null,
  external_order_id text not null,
  customer_payload jsonb not null default '{}'::jsonb,
  items_payload jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency text not null default 'COP',
  status text not null default 'queued',
  idempotency_key text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (tenant_id, idempotency_key)
);

create table if not exists public.synkro_sync_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.synkro_tenants(id),
  external_order_id uuid not null references public.synkro_external_orders(id),
  status text not null default 'queued',
  message text,
  attempt_number integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.synkro_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.synkro_tenants(id),
  external_order_id uuid references public.synkro_external_orders(id),
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists synkro_external_orders_tenant_created_idx
  on public.synkro_external_orders (tenant_id, created_at desc);

create index if not exists synkro_sync_attempts_tenant_created_idx
  on public.synkro_sync_attempts (tenant_id, created_at desc);

create index if not exists synkro_audit_logs_order_created_idx
  on public.synkro_audit_logs (external_order_id, created_at desc);

insert into public.inventario (nombre, categoria, unidad, cantidad, valor_compra)
values
  ('Carne para sancocho', 'comida', 'porcion', 20, 0),
  ('Trucha', 'comida', 'unidad', 12, 0),
  ('Limonada', 'bebida', 'vaso', 30, 0),
  ('Cerveza nacional', 'bebida', 'unidad', 48, 0)
on conflict do nothing;

insert into public.productos (nombre, categoria, precio, inventario_id, cantidad_inventario, imagen, activo)
select 'Sancocho campestre', 'restaurante', 28000, id, 1, '', true
from public.inventario
where nombre = 'Carne para sancocho'
and not exists (select 1 from public.productos where nombre = 'Sancocho campestre');

insert into public.productos (nombre, categoria, precio, inventario_id, cantidad_inventario, imagen, activo)
select 'Trucha con patacon', 'restaurante', 32000, id, 1, '', true
from public.inventario
where nombre = 'Trucha'
and not exists (select 1 from public.productos where nombre = 'Trucha con patacon');

insert into public.productos (nombre, categoria, precio, inventario_id, cantidad_inventario, imagen, activo)
select 'Limonada natural', 'bar', 8000, id, 1, '', true
from public.inventario
where nombre = 'Limonada'
and not exists (select 1 from public.productos where nombre = 'Limonada natural');

insert into public.productos (nombre, categoria, precio, inventario_id, cantidad_inventario, imagen, activo)
select 'Cerveza nacional', 'bar', 7000, id, 1, '', true
from public.inventario
where nombre = 'Cerveza nacional'
and not exists (select 1 from public.productos where nombre = 'Cerveza nacional');

insert into public.alojamientos (nombre, tipo, precio, estado, descripcion, activos, despensa)
values
  ('Cabana Tipi 101', 'Cabana Tipi', 160000, 'Disponible', 'Cabana tipi con nevera, desayuno incluido, wifi y parqueadero.', 'Nevera minibar, cama doble, ventilador, mesa auxiliar, lenceria', 'Agua, gaseosa, cerveza, paquetes, snacks'),
  ('Cabana Tipi 102', 'Cabana Tipi', 180000, 'Disponible', 'Cabana tipi privada con nevera, desayuno incluido, wifi y parqueadero.', 'Nevera minibar, cama doble, ventilador, mesa auxiliar, lenceria', 'Agua, gaseosa, cerveza, paquetes, snacks'),
  ('Apartaestudio Campestre', 'Apartaestudio Campestre', 220000, 'Disponible', 'Alojamiento con cocina equipada, wifi y parqueadero.', 'Nevera, estufa, menaje, cama, televisor, lenceria', 'Bebidas, paquetes, cafe, huevos, snacks'),
  ('Casa Campestre', 'Casa Campestre', 480000, 'Disponible', 'Casa de 3 habitaciones con cocina y zona social.', 'Nevera, estufa, comedor, camas, televisor, sonido, menaje, lenceria', 'Bebidas, paquetes, frutas, cafe, insumos de cocina'),
  ('Salon Eventos', 'Salon Eventos', 350000, 'Disponible', 'Espacio para eventos, reuniones, ferias y fiestas.', 'Mesas, sillas, sonido, iluminacion, ventiladores, extension electrica', 'Bebidas, hielo, paquetes y productos para evento')
on conflict (nombre) do nothing;
