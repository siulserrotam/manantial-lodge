import { hasSupabaseConfig, json, supabaseRequest } from "../../_lib/supabase";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const usuario = String(body.usuario || "").trim();
  const clave = String(body.clave || "");

  if (hasSupabaseConfig()) {
    try {
      const rows = await supabaseRequest(`funcionarios?usuario=eq.${encodeURIComponent(usuario)}&activo=eq.true&select=usuario,clave,nombre,rol`);
      const funcionario = rows[0];

      if (!funcionario || funcionario.clave !== clave) {
        return json({ ok: false, message: "Usuario o clave incorrectos." }, 401);
      }

      return json({
        ok: true,
        funcionario: {
          nombre: funcionario.nombre,
          usuario: funcionario.usuario,
          rol: funcionario.rol
        }
      });
    } catch (error) {
      return json({ ok: false, message: error.message }, 500);
    }
  }

  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    return json({ ok: false, message: "Faltan variables ADMIN_USER y ADMIN_PASSWORD en Vercel." }, 500);
  }

  if (usuario !== adminUser || clave !== adminPassword) {
    return json({ ok: false, message: "Usuario o clave incorrectos." }, 401);
  }

  return json({
    ok: true,
    funcionario: {
      nombre: "Administrador",
      usuario,
      rol: "administrador"
    }
  });
}

export function GET() {
  return json({ ok: false, message: "Metodo no permitido. Usa POST." }, 405);
}
