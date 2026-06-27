# Synkro - resumen de fases

## Vision

Synkro busca validar y luego construir un SaaS B2B que conecte tiendas online con ERPs contables para reducir digitacion manual, errores de facturacion e inventarios descuadrados.

## Implementado

### Fase 1 - Validacion comercial publica

- Landing publica en `/synkro.html`.
- Rewrite por subdominio para `synkro.manantiallodge.com`.
- Calculadora ROI con pedidos mensuales, ahorro estimado, horas liberadas y costo manual por pedido.
- Formulario de validacion comercial.
- Endpoint publico `POST /api/synkro/leads`.
- Tabla Supabase `synkro_leads`.
- Documentacion basica de DNS, Vercel y Supabase en `README.md`.

### Fase 2 - Seguimiento comercial interno

- Endpoint protegido `GET /api/synkro/leads` para listar leads.
- Endpoint protegido `PATCH /api/synkro/leads` para actualizar estado y nota comercial.
- Variable requerida `SYNKRO_ADMIN_TOKEN`.
- Estados comerciales iniciales: `nuevo`, `contactado`, `calificado`, `descartado`.
- Pagina interna `/synkro-leads.html` para consultar, filtrar y actualizar leads.
- Campos de seguimiento en Supabase: `nota_comercial` y `actualizado_en`.

## Falta por implementar

### Antes de seguir con producto

- Configurar `synkro.manantiallodge.com` en Vercel y DNS.
- Ejecutar/actualizar el schema de Supabase para crear `synkro_leads` con los campos de Fase 2.
- Crear `SYNKRO_ADMIN_TOKEN` en variables de entorno de Vercel.
- Probar captura real de leads desde produccion.
- Definir si Synkro queda indexable o se cambia temporalmente a `noindex`.
- Ajustar supuestos de ROI: costo mensual, minutos por pedido y costo objetivo de suscripcion.

### Fase 3 sugerida - Calificacion de oportunidad

- Agregar campos de lead scoring: urgencia, volumen, ERP validado, plataforma e-commerce validada, responsable comercial y fecha de proximo contacto.
- Exportar leads a CSV.
- Agregar origen/campana para medir canales.
- Crear una vista simple de metricas: leads nuevos, contactados, calificados y descartados.

### Fase 4 sugerida - Arquitectura tecnica del MVP

- Disenar contratos de webhook para Shopify/WooCommerce.
- Definir modelos base: Tenant, Integration, ExternalOrder, SyncAttempt, AuditLog.
- Crear estructura independiente para backend futuro (.NET) o decidir si el MVP seguira en serverless Node.
- Definir estrategia multi-tenant y seguridad por API key.
- Disenar idempotencia por orden externa antes de crear conectores reales.

### Fase 5 sugerida - Primer conector simulado

- Crear un endpoint webhook de prueba.
- Guardar ordenes simuladas en Supabase.
- Implementar motor de mapeo inicial.
- Generar logs de auditoria visibles para cliente interno.
- Evitar todavia integracion real con Siigo hasta validar el flujo comercial.
