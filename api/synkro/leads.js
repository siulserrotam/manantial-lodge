import { supabaseRequest } from "../_supabase.js";

const VALID_STATUSES = ["nuevo", "contactado", "calificado", "descartado"];

export default async function handler(request, response) {
  if (request.method === "GET") {
    if (!isAuthorized(request)) {
      response.status(401).json({ ok: false, message: "No autorizado." });
      return;
    }

    const estado = String(request.query?.estado || "").trim();
    const statusFilter = VALID_STATUSES.includes(estado) ? `estado=eq.${encodeURIComponent(estado)}&` : "";

    try {
      const leads = await supabaseRequest(`synkro_leads?${statusFilter}select=*&order=creado_en.desc&limit=200`);
      response.status(200).json({ ok: true, leads });
    } catch (error) {
      response.status(500).json({ ok: false, message: error.message });
    }
    return;
  }

  if (request.method === "PATCH") {
    if (!isAuthorized(request)) {
      response.status(401).json({ ok: false, message: "No autorizado." });
      return;
    }

    const body = parseBody(request);
    const id = String(body.id || "").trim();
    const estado = String(body.estado || "").trim();
    const notaComercial = String(body.notaComercial || body.nota_comercial || "").trim();

    if (!id) {
      response.status(400).json({ ok: false, message: "Falta el ID del lead." });
      return;
    }

    if (estado && !VALID_STATUSES.includes(estado)) {
      response.status(400).json({ ok: false, message: "Estado no valido." });
      return;
    }

    const payload = {
      actualizado_en: new Date().toISOString()
    };

    if (estado) {
      payload.estado = estado;
    }

    if (notaComercial) {
      payload.nota_comercial = notaComercial;
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
    nombre: String(body.nombre || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    celular: String(body.celular || "").trim(),
    empresa: String(body.empresa || "").trim(),
    ecommerce: String(body.ecommerce || "").trim(),
    erp: String(body.erp || "").trim(),
    pedidos_mes: Number(body.pedidosMes || body.pedidos_mes || 0),
    mensaje: String(body.mensaje || "").trim(),
    origen: "synkro_landing",
    estado: "nuevo"
  };

  if (!payload.nombre || !payload.email || !payload.celular) {
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

function isAuthorized(request) {
  const expectedToken = process.env.SYNKRO_ADMIN_TOKEN;

  if (!expectedToken) {
    return false;
  }

  const authorization = request.headers?.authorization || request.headers?.Authorization || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  return token && token === expectedToken;
}
