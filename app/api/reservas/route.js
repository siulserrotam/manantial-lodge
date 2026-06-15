import { json, supabaseRequest } from "../../_lib/supabase";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
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
    return json({ ok: false, message: "Faltan datos obligatorios de la reserva." }, 400);
  }

  try {
    await supabaseRequest("reservas", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return json({ ok: true, message: "Reserva registrada." });
  } catch (error) {
    return json({ ok: false, message: error.message }, 500);
  }
}

export function GET() {
  return json({ ok: false, message: "Metodo no permitido. Usa POST." }, 405);
}
