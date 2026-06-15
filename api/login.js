import { hasSupabaseConfig, supabaseRequest } from "./_supabase.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, message: "Metodo no permitido. Usa POST." });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const usuario = String(body.usuario || "").trim();
  const clave = String(body.clave || "");

  if (hasSupabaseConfig()) {
    try {
      const rows = await supabaseRequest(`funcionarios?usuario=eq.${encodeURIComponent(usuario)}&activo=eq.true&select=usuario,clave,nombre,rol`);
      const funcionario = rows[0];

      if (!funcionario || funcionario.clave !== clave) {
        response.status(401).json({ ok: false, message: "Usuario o clave incorrectos." });
        return;
      }

      response.status(200).json({
        ok: true,
        funcionario: {
          nombre: funcionario.nombre,
          usuario: funcionario.usuario,
          rol: funcionario.rol
        }
      });
      return;
    } catch (error) {
      response.status(500).json({ ok: false, message: error.message });
      return;
    }
  }

  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    response.status(500).json({
      ok: false,
      message: "Faltan variables ADMIN_USER y ADMIN_PASSWORD en Vercel."
    });
    return;
  }

  if (usuario !== adminUser || clave !== adminPassword) {
    response.status(401).json({ ok: false, message: "Usuario o clave incorrectos." });
    return;
  }

  response.status(200).json({
    ok: true,
    funcionario: {
      nombre: "Administrador",
      usuario,
      rol: "administrador"
    }
  });
}
