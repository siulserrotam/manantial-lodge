import { json, supabaseRequest } from "../../_lib/supabase";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
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
    return json({ ok: false, message: "Faltan datos obligatorios del cliente." }, 400);
  }

  try {
    const rows = await supabaseRequest("clientes", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return json({ ok: true, cliente: rows[0] });
  } catch (error) {
    return json({ ok: false, message: error.message }, 500);
  }
}

export function GET() {
  return json({ ok: false, message: "Metodo no permitido. Usa POST." }, 405);
}
