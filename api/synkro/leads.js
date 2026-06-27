import { supabaseRequest } from "../_supabase.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, message: "Metodo no permitido. Usa POST." });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
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
