import { supabaseRequest } from "./_supabase.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, message: "Metodo no permitido. Usa POST." });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const payload = {
    qr_token: String(body.qrToken || body.qr_token || "").trim(),
    nombre: String(body.customer || body.nombre || "").trim(),
    identificacion: String(body.idNumber || body.identificacion || "").trim(),
    celular: String(body.phone || body.celular || "").trim(),
    email: String(body.email || "").trim(),
    rol: String(body.role || body.rol || "pasadia").trim(),
    alojamiento_nombre: String(body.cabinName || body.alojamiento_nombre || "").trim(),
    estado: "abierta"
  };

  if (!payload.qr_token || !payload.nombre || !payload.identificacion) {
    response.status(400).json({ ok: false, message: "Faltan datos obligatorios del cliente." });
    return;
  }

  try {
    const rows = await supabaseRequest("clientes", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    response.status(200).json({ ok: true, cliente: rows[0] });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
}
