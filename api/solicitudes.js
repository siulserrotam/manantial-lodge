import { supabaseRequest } from "./_supabase.js";

export default async function handler(request, response) {
  if (request.method === "GET") {
    try {
      const rows = await supabaseRequest("solicitudes_qr?estado=neq.atendido&select=*&order=creado_en.desc");
      response.status(200).json({ ok: true, solicitudes: rows });
    } catch (error) {
      response.status(500).json({ ok: false, message: error.message });
    }
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ ok: false, message: "Metodo no permitido." });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const payload = {
    cliente_id: body.accountId || body.cliente_id || null,
    qr_token: String(body.visitToken || body.qrToken || body.qr_token || "").trim(),
    cliente_nombre: String(body.customer || body.cliente_nombre || "").trim(),
    tipo: String(body.type || body.tipo || "special").trim(),
    destino: String(body.target || body.destino || "").trim(),
    detalle: String(body.detail || body.detalle || "").trim(),
    total: Number(body.total || 0),
    items: body.items || [],
    estado: "pendiente"
  };

  if (!payload.qr_token || !payload.cliente_nombre || !payload.detalle) {
    response.status(400).json({ ok: false, message: "Faltan datos de la solicitud." });
    return;
  }

  try {
    const rows = await supabaseRequest("solicitudes_qr", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    response.status(200).json({ ok: true, solicitud: rows[0] });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
}
