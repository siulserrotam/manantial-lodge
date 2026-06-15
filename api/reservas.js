import { supabaseRequest } from "./_supabase.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, message: "Metodo no permitido. Usa POST." });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const payload = {
    alojamiento_nombre: String(body.cabinName || body.alojamiento_nombre || "").trim(),
    nombre: String(body.name || body.nombre || "").trim(),
    identificacion: String(body.idNumber || body.identificacion || "").trim(),
    email: String(body.email || "").trim(),
    celular: String(body.phone || body.celular || "").trim(),
    fecha_ingreso: String(body.arrivalDate || body.fecha_ingreso || "").trim(),
    fecha_salida: String(body.exitDate || body.fecha_salida || "").trim(),
    estado: "Pendiente"
  };

  if (!payload.alojamiento_nombre || !payload.nombre || !payload.identificacion || !payload.fecha_ingreso || !payload.fecha_salida) {
    response.status(400).json({ ok: false, message: "Faltan datos obligatorios de la reserva." });
    return;
  }

  try {
    await supabaseRequest("reservas", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    response.status(200).json({ ok: true, message: "Reserva registrada." });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
}
