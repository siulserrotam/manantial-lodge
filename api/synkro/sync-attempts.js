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

  const status = String(request.query?.status || "").trim().toLowerCase();
  const tenantId = String(request.query?.tenantId || request.query?.tenant_id || "").trim();
  const limit = Math.min(Math.max(Number(request.query?.limit || 50), 1), 200);

  try {
    const filters = [
      status ? `status=eq.${encodeURIComponent(status)}` : "",
      tenantId ? `tenant_id=eq.${encodeURIComponent(tenantId)}` : ""
    ].filter(Boolean);
    const prefix = filters.length ? `${filters.join("&")}&` : "";
    const attempts = await supabaseRequest(
      `synkro_sync_attempts?${prefix}select=*&order=created_at.desc&limit=${limit}`
    );
    const orders = await fetchOrdersForAttempts(attempts);
    const tenants = await fetchTenantsForAttempts(attempts);

    response.status(200).json({
      ok: true,
      attempts: attempts.map((attempt) => ({
        ...attempt,
        tenant: tenants.get(attempt.tenant_id) || null,
        order: orders.get(attempt.external_order_id) || null
      }))
    });
  } catch (error) {
    response.status(500).json({ ok: false, message: error.message });
  }
}

async function fetchOrdersForAttempts(attempts) {
  // ES: Se consulta separado para evitar depender de nombres de relaciones PostgREST.
  // EN: Queried separately to avoid coupling to PostgREST relationship names.
  const orderIds = unique(attempts.map((attempt) => attempt.external_order_id).filter(Boolean));

  if (orderIds.length === 0) {
    return new Map();
  }

  const rows = await supabaseRequest(
    `synkro_external_orders?id=in.(${orderIds.map(encodeURIComponent).join(",")})&select=*`
  );

  return new Map(rows.map((row) => [row.id, row]));
}

async function fetchTenantsForAttempts(attempts) {
  const tenantIds = unique(attempts.map((attempt) => attempt.tenant_id).filter(Boolean));

  if (tenantIds.length === 0) {
    return new Map();
  }

  const rows = await supabaseRequest(
    `synkro_tenants?id=in.(${tenantIds.map(encodeURIComponent).join(",")})&select=id,name,status`
  );

  return new Map(rows.map((row) => [row.id, row]));
}

function unique(values) {
  return [...new Set(values)];
}
