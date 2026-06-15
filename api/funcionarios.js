import { supabaseRequest } from "./_supabase.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, message: "Metodo no permitido. Usa POST." });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
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
    response.status(400).json({ ok: false, message: "Usuario, clave, identificacion y nombre son obligatorios." });
    return;
  }

  if (!/^\d{8}$/.test(payload.clave)) {
    response.status(400).json({ ok: false, message: "La clave debe tener exactamente 8 digitos." });
    return;
  }

  try {
    await supabaseRequest("funcionarios", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    response.status(200).json({ ok: true, message: "Usuario creado." });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
}
