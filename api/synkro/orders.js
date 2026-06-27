import { supabaseRequest } from "../_supabase.js";
import { getTenantFromApiKey } from "./_security.js";

const MAX_ITEMS = 100;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, message: "Metodo no permitido." });
    return;
  }

  try {
    const tenant = await getTenantFromApiKey(request);

    if (!tenant) {
      response.status(401).json({ ok: false, message: "API key de Synkro invalida." });
      return;
    }

    const body = parseBody(request);
    const normalizedOrder = normalizeOrderPayload(body);

    if (!normalizedOrder.ok) {
      response.status(400).json({ ok: false, message: normalizedOrder.message });
      return;
    }

    const order = normalizedOrder.order;
    const integration = await getOrCreateIntegration(tenant.id, order.platform);
    const idempotencyKey = `${order.platform}:${order.external_order_id}`;
    const existingOrder = await findExistingOrder(tenant.id, idempotencyKey);

    if (existingOrder) {
      await createAuditLog({
        tenantId: tenant.id,
        externalOrderId: existingOrder.id,
        eventType: "duplicate_webhook_ignored",
        message: "Orden recibida nuevamente y omitida por idempotencia.",
        metadata: { idempotencyKey }
      });

      response.status(200).json({
        ok: true,
        idempotent: true,
        message: "Orden ya registrada. No se duplico.",
        order: existingOrder
      });
      return;
    }

    const insertedOrder = await createExternalOrder({
      tenantId: tenant.id,
      integrationId: integration.id,
      idempotencyKey,
      rawPayload: body,
      order
    });

    const syncAttempt = await createSyncAttempt({
      tenantId: tenant.id,
      externalOrderId: insertedOrder.id,
      message: "Orden recibida en sandbox. Pendiente de mapeo ERP."
    });

    await createAuditLog({
      tenantId: tenant.id,
      externalOrderId: insertedOrder.id,
      eventType: "webhook_received",
      message: "Orden recibida desde e-commerce.",
      metadata: {
        platform: order.platform,
        externalOrderId: order.external_order_id,
        total: order.total
      }
    });

    response.status(202).json({
      ok: true,
      message: "Orden recibida y encolada en sandbox.",
      order: insertedOrder,
      syncAttempt
    });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
}

function parseBody(request) {
  return typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
}

function normalizeOrderPayload(body) {
  // ES: Este contrato es deliberadamente simple para probar integraciones sin ERP real.
  // EN: This contract is intentionally small to test integrations before a real ERP.
  const platform = normalizePlatform(body.platform || body.provider || body.ecommerce);
  const externalOrderId = String(body.externalOrderId || body.external_order_id || body.orderId || body.id || "").trim();
  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS) : [];
  const subtotal = toMoney(body.subtotal);
  const tax = toMoney(body.tax || body.taxes || 0);
  const total = toMoney(body.total || body.orderTotal);
  const currency = String(body.currency || "COP").trim().toUpperCase();

  if (!platform) {
    return { ok: false, message: "Falta platform." };
  }

  if (!externalOrderId) {
    return { ok: false, message: "Falta externalOrderId." };
  }

  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, message: "El total de la orden debe ser mayor a cero." };
  }

  if (items.length === 0) {
    return { ok: false, message: "La orden debe tener al menos un item." };
  }

  return {
    ok: true,
    order: {
      platform,
      external_order_id: externalOrderId,
      customer_payload: normalizeCustomer(body.customer || body.client || body.billing || {}),
      items_payload: normalizeItems(items),
      subtotal: Number.isFinite(subtotal) ? subtotal : 0,
      tax: Number.isFinite(tax) ? tax : 0,
      total,
      currency: currency || "COP"
    }
  };
}

function normalizePlatform(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

function normalizeCustomer(customer) {
  return {
    name: String(customer.name || customer.nombre || "").trim(),
    email: String(customer.email || "").trim().toLowerCase(),
    phone: String(customer.phone || customer.celular || "").trim(),
    document: String(customer.document || customer.identification || customer.identificacion || "").trim()
  };
}

function normalizeItems(items) {
  return items.map((item) => ({
    sku: String(item.sku || item.reference || item.referencia || "").trim(),
    name: String(item.name || item.nombre || "").trim(),
    quantity: Number(item.quantity || item.cantidad || 1),
    unit_price: toMoney(item.unitPrice || item.unit_price || item.price || item.precio || 0),
    tax: toMoney(item.tax || item.impuesto || 0)
  }));
}

function toMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : NaN;
}

async function getOrCreateIntegration(tenantId, provider) {
  const path = `synkro_integrations?tenant_id=eq.${encodeURIComponent(tenantId)}&provider=eq.${encodeURIComponent(provider)}&select=*&limit=1`;
  const existing = await supabaseRequest(path);

  if (existing[0]) {
    return existing[0];
  }

  const rows = await supabaseRequest("synkro_integrations", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenantId,
      provider,
      direction: "ecommerce_to_erp",
      status: "sandbox"
    })
  });

  return rows[0];
}

async function findExistingOrder(tenantId, idempotencyKey) {
  const rows = await supabaseRequest(
    `synkro_external_orders?tenant_id=eq.${encodeURIComponent(tenantId)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`
  );
  return rows[0] || null;
}

async function createExternalOrder({ tenantId, integrationId, idempotencyKey, rawPayload, order }) {
  const rows = await supabaseRequest("synkro_external_orders", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenantId,
      integration_id: integrationId,
      platform: order.platform,
      external_order_id: order.external_order_id,
      customer_payload: order.customer_payload,
      items_payload: order.items_payload,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      currency: order.currency,
      status: "queued",
      idempotency_key: idempotencyKey,
      raw_payload: rawPayload
    })
  });

  return rows[0];
}

async function createSyncAttempt({ tenantId, externalOrderId, message }) {
  const rows = await supabaseRequest("synkro_sync_attempts", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenantId,
      external_order_id: externalOrderId,
      status: "queued",
      message,
      attempt_number: 1
    })
  });

  return rows[0];
}

async function createAuditLog({ tenantId, externalOrderId, eventType, message, metadata }) {
  const rows = await supabaseRequest("synkro_audit_logs", {
    method: "POST",
    body: JSON.stringify({
      tenant_id: tenantId,
      external_order_id: externalOrderId,
      event_type: eventType,
      message,
      metadata
    })
  });

  return rows[0];
}
