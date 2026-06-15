import { json, supabaseRequest } from "../../_lib/supabase";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const payload = {
    usuario: String(body.usuario || "").trim(),
    clave: String(body.clave || ""),
    identificacion: String(body.identificacion || "").trim(),
    nombre: String(body.nombre || "").trim(),
    celular: String(body.celular || "").trim(),
    email: String(body.email || "").trim(),
    rol: String(body.rol || "operador").trim() || "operador",
    activo: true
  };

  if (!payload.usuario || !payload.clave || !payload.identificacion || !payload.nombre) {
    return json({ ok: false, message: "Usuario, clave, identificacion y nombre son obligatorios." }, 400);
  }

  if (!/^\d{8}$/.test(payload.clave)) {
    return json({ ok: false, message: "La clave debe tener exactamente 8 digitos." }, 400);
  }

  try {
    await supabaseRequest("funcionarios", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return json({ ok: true, message: "Usuario creado." });
  } catch (error) {
    return json({ ok: false, message: error.message }, 500);
  }
}

export function GET() {
  return json({ ok: false, message: "Metodo no permitido. Usa POST." }, 405);
}
