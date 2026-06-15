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
