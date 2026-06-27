import { supabaseRequest } from "../_supabase.js";
import { isAdminAuthorized } from "./_security.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ ok: false, message: "Metodo no permitido." });
    return;
  }

  if (!isAdminAuthorized(request)) {
    response.status(401).json({ ok: false, message: "No autorizado." });
    return;
  }

  const externalOrderId = String(request.query?.externalOrderId || request.query?.external_order_id || "").trim();
  const tenantId = String(request.query?.tenantId || request.query?.tenant_id || "").trim();
  const limit = Math.min(Math.max(Number(request.query?.limit || 50), 1), 200);

  try {
    const filters = [
      externalOrderId ? `external_order_id=eq.${encodeURIComponent(externalOrderId)}` : "",
      tenantId ? `tenant_id=eq.${encodeURIComponent(tenantId)}` : ""
    ].filter(Boolean);
    const prefix = filters.length ? `${filters.join("&")}&` : "";
    const logs = await supabaseRequest(
      `synkro_audit_logs?${prefix}select=*&order=created_at.desc&limit=${limit}`
    );

    response.status(200).json({ ok: true, logs });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
}
