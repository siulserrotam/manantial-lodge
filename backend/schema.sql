CREATE TABLE funcionarios (
  id AUTOINCREMENT CONSTRAINT pk_funcionarios PRIMARY KEY,
  nombre TEXT(100) NOT NULL,
  usuario TEXT(60) NOT NULL,
  clave TEXT(100) NOT NULL,
  rol TEXT(40) DEFAULT 'administrador',
  activo LONG DEFAULT 1,
  creado_en DATETIME DEFAULT Now()
);

CREATE UNIQUE INDEX idx_funcionarios_usuario ON funcionarios (usuario);

CREATE TABLE inventario (
  id AUTOINCREMENT CONSTRAINT pk_inventario PRIMARY KEY,
  nombre TEXT(120) NOT NULL,
  categoria TEXT(40) NOT NULL,
  unidad TEXT(40) DEFAULT 'unidad',
  cantidad LONG DEFAULT 0,
  creado_en DATETIME DEFAULT Now()
);

CREATE TABLE productos (
  id AUTOINCREMENT CONSTRAINT pk_productos PRIMARY KEY,
  nombre TEXT(120) NOT NULL,
  categoria TEXT(40) NOT NULL,
  precio LONG DEFAULT 0,
  inventario_id LONG,
  cantidad_inventario LONG DEFAULT 1,
  activo LONG DEFAULT 1,
  creado_en DATETIME DEFAULT Now()
);

CREATE TABLE mesas (
  id AUTOINCREMENT CONSTRAINT pk_mesas PRIMARY KEY,
  nombre TEXT(60) NOT NULL,
  estado TEXT(30) DEFAULT 'disponible',
  creado_en DATETIME DEFAULT Now()
);

CREATE UNIQUE INDEX idx_mesas_nombre ON mesas (nombre);

CREATE TABLE pedidos (
  id AUTOINCREMENT CONSTRAINT pk_pedidos PRIMARY KEY,
  mesa_id LONG NOT NULL,
  estado TEXT(30) DEFAULT 'abierto',
  total LONG DEFAULT 0,
  creado_en DATETIME DEFAULT Now()
);

CREATE TABLE pedido_detalle (
  id AUTOINCREMENT CONSTRAINT pk_pedido_detalle PRIMARY KEY,
  pedido_id LONG NOT NULL,
  producto_id LONG NOT NULL,
  cantidad LONG DEFAULT 1,
  precio LONG DEFAULT 0
);

CREATE TABLE pasadias_piscina (
  id AUTOINCREMENT CONSTRAINT pk_pasadias_piscina PRIMARY KEY,
  personas LONG NOT NULL,
  valor_persona LONG NOT NULL,
  total LONG NOT NULL,
  creado_en DATETIME DEFAULT Now()
);

CREATE TABLE cabanas (
  id AUTOINCREMENT CONSTRAINT pk_cabanas PRIMARY KEY,
  nombre TEXT(60) NOT NULL,
  precio_noche LONG DEFAULT 0,
  estado TEXT(30) DEFAULT 'disponible',
  creado_en DATETIME DEFAULT Now()
);

CREATE UNIQUE INDEX idx_cabanas_nombre ON cabanas (nombre);

CREATE TABLE clientes (
  id AUTOINCREMENT CONSTRAINT pk_clientes PRIMARY KEY,
  nombre TEXT(120) NOT NULL,
  tipo TEXT(30) NOT NULL,
  cabana_id LONG,
  estado TEXT(30) DEFAULT 'abierto',
  creado_en DATETIME DEFAULT Now()
);

CREATE TABLE cuenta_cargos (
  id AUTOINCREMENT CONSTRAINT pk_cuenta_cargos PRIMARY KEY,
  cliente_id LONG NOT NULL,
  concepto TEXT(180) NOT NULL,
  valor LONG DEFAULT 0,
  creado_en DATETIME DEFAULT Now()
);

CREATE TABLE recibos (
  id AUTOINCREMENT CONSTRAINT pk_recibos PRIMARY KEY,
  cliente_id LONG NOT NULL,
  total LONG DEFAULT 0,
  creado_en DATETIME DEFAULT Now()
);

CREATE TABLE inventario_movimientos (
  id AUTOINCREMENT CONSTRAINT pk_inventario_movimientos PRIMARY KEY,
  inventario_id LONG NOT NULL,
  tipo TEXT(20) NOT NULL,
  cantidad LONG NOT NULL,
  motivo LONGTEXT,
  creado_en DATETIME DEFAULT Now()
);
