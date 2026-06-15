import { json, supabaseRequest } from "../../_lib/supabase";

export async function GET() {
  try {
    const rows = await supabaseRequest("solicitudes_qr?estado=neq.atendido&select=*&order=creado_en.desc");
    return json({ ok: true, solicitudes: rows });
  } catch (error) {
    return json({ ok: false, message: error.message }, 500);
  }
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const estado = String(body.estado || "atendido").trim();

  if (!id) {
    return json({ ok: false, message: "Falta el ID de la solicitud." }, 400);
  }

  try {
    await supabaseRequest(`solicitudes_qr?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ estado })
    });
    return json({ ok: true, message: "Solicitud actualizada." });
  } catch (error) {
    return json({ ok: false, message: error.message }, 500);
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
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
    return json({ ok: false, message: "Faltan datos de la solicitud." }, 400);
  }

  try {
    const rows = await supabaseRequest("solicitudes_qr", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return json({ ok: true, solicitud: rows[0] });
  } catch (error) {
    return json({ ok: false, message: error.message }, 500);
  }
}
