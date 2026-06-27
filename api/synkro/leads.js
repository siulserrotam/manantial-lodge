import { supabaseRequest } from "../_supabase.js";
import { isAdminAuthorized } from "./_security.js";

const VALID_STATUSES = ["new", "contacted", "qualified", "discarded"];

export default async function handler(request, response) {
  if (request.method === "GET") {
    if (!isAdminAuthorized(request)) {
      response.status(401).json({ ok: false, message: "No autorizado." });
      return;
    }

    const status = normalizeStatus(request.query?.status || request.query?.estado || "");
    const statusFilter = VALID_STATUSES.includes(status) ? `status=eq.${encodeURIComponent(status)}&` : "";

    try {
      const leads = await supabaseRequest(`synkro_leads?${statusFilter}select=*&order=created_at.desc&limit=200`);
      response.status(200).json({ ok: true, leads });
    } catch (error) {
      response.status(500).json({ ok: false, message: error.message });
    }
    return;
  }

  if (request.method === "PATCH") {
    if (!isAdminAuthorized(request)) {
      response.status(401).json({ ok: false, message: "No autorizado." });
      return;
    }

    const body = parseBody(request);
    const id = String(body.id || "").trim();
    const status = normalizeStatus(body.status || body.estado || "");
    const commercialNote = String(body.commercialNote || body.commercial_note || body.notaComercial || body.nota_comercial || "").trim();
    const score = parseOptionalInteger(body.score);
    const urgency = normalizeUrgency(body.urgency || body.urgencia || "");
    const owner = String(body.owner || body.responsable || "").trim();
    const nextContactAt = String(body.nextContactAt || body.next_contact_at || body.proximo_contacto || "").trim();
    const ecommerceValidated = parseOptionalBoolean(body.ecommerceValidated ?? body.ecommerce_validated);
    const erpValidated = parseOptionalBoolean(body.erpValidated ?? body.erp_validated);

    if (!id) {
      response.status(400).json({ ok: false, message: "Falta el ID del lead." });
      return;
    }

    if (status && !VALID_STATUSES.includes(status)) {
      response.status(400).json({ ok: false, message: "Estado no valido." });
      return;
    }

    if (urgency && !["low", "medium", "high"].includes(urgency)) {
      response.status(400).json({ ok: false, message: "Urgencia no valida." });
      return;
    }

    const payload = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      payload.status = status;
    }

    if (commercialNote) {
      payload.commercial_note = commercialNote;
    }

    if (score !== null) {
      payload.score = Math.max(0, Math.min(score, 100));
    }

    if (urgency) {
      payload.urgency = urgency;
    }

    if (owner) {
      payload.owner = owner;
    }

    if (nextContactAt) {
      payload.next_contact_at = nextContactAt;
    }

    if (ecommerceValidated !== null) {
      payload.ecommerce_validated = ecommerceValidated;
    }

    if (erpValidated !== null) {
      payload.erp_validated = erpValidated;
    }

    try {
      const rows = await supabaseRequest(`synkro_leads?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      response.status(200).json({ ok: true, lead: rows[0], message: "Lead actualizado." });
    } catch (error) {
      response.status(500).json({ ok: false, message: error.message });
    }
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, message: "Metodo no permitido." });
    return;
  }

  const body = parseBody(request);
  const payload = {
    name: String(body.name || body.nombre || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    phone: String(body.phone || body.celular || "").trim(),
    company: String(body.company || body.empresa || "").trim(),
    ecommerce_platform: String(body.ecommercePlatform || body.ecommerce_platform || body.ecommerce || "").trim(),
    erp_system: String(body.erpSystem || body.erp_system || body.erp || "").trim(),
    monthly_orders: Number(body.monthlyOrders || body.monthly_orders || body.pedidosMes || body.pedidos_mes || 0),
    message: String(body.message || body.mensaje || "").trim(),
    source: "synkro_landing",
    status: "new"
  };

  if (!payload.name || !payload.email || !payload.phone) {
    response.status(400).json({ ok: false, message: "Faltan nombre, correo o celular." });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    response.status(400).json({ ok: false, message: "Correo no valido." });
    return;
  }

  try {
    const rows = await supabaseRequest("synkro_leads", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    response.status(200).json({ ok: true, lead: rows[0], message: "Solicitud registrada." });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
}

function parseBody(request) {
  return typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
}

function normalizeStatus(value) {
  // ES: Mantiene compatibilidad con estados antiguos en espanol.
  // EN: Keeps backward compatibility with previous Spanish status values.
  const statusMap = {
    nuevo: "new",
    contactado: "contacted",
    calificado: "qualified",
    descartado: "discarded"
  };
  const status = String(value || "").trim();
  return statusMap[status] || status;
}

function normalizeUrgency(value) {
  const urgencyMap = {
    baja: "low",
    media: "medium",
    alta: "high"
  };
  const urgency = String(value || "").trim();
  return urgencyMap[urgency] || urgency;
}

function parseOptionalInteger(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "on", "yes", "si", "sí"].includes(String(value).trim().toLowerCase());
}
