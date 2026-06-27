import { createHash } from "node:crypto";
import { supabaseRequest } from "../_supabase.js";

export function isAdminAuthorized(request) {
  // ES: Protege pantallas y endpoints internos con un token privado.
  // EN: Protects internal screens and endpoints with a private token.
  const expectedToken = process.env.SYNKRO_ADMIN_TOKEN;

  if (!expectedToken) {
    return false;
  }

  const authorization = getHeader(request, "authorization");
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  return Boolean(token && token === expectedToken);
}

export async function getTenantFromApiKey(request) {
  // ES: Cada cliente de Synkro usara una API key propia para webhooks.
  // EN: Each Synkro customer uses its own API key for webhooks.
  const apiKey = getHeader(request, "x-synkro-api-key").trim();

  if (!apiKey) {
    return null;
  }

  const apiKeyHash = hashSecret(apiKey);
  const rows = await supabaseRequest(
    `synkro_tenants?api_key_hash=eq.${encodeURIComponent(apiKeyHash)}&status=eq.active&select=*&limit=1`
  );

  return rows[0] || null;
}

export function hashSecret(secret) {
  return createHash("sha256").update(String(secret)).digest("hex");
}

function getHeader(request, name) {
  const headers = request.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || "";
}
