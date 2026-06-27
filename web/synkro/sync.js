const syncForm = document.querySelector("#synkro-sync-form");
const tokenInput = document.querySelector("#synkro-sync-token");
const statusFilter = document.querySelector("#synkro-sync-status");
const platformFilter = document.querySelector("#synkro-sync-platform");
const dateFilter = document.querySelector("#synkro-sync-date");
const message = document.querySelector("#synkro-sync-message");
const summary = document.querySelector("#synkro-sync-summary");
const syncList = document.querySelector("#synkro-sync-list");
const metricsContainer = document.querySelector("#synkro-sync-metrics");
const refreshButton = document.querySelector("#synkro-sync-refresh");
const exportButton = document.querySelector("#synkro-sync-export");
const detailDialog = document.querySelector("#synkro-sync-dialog");
const detailContainer = document.querySelector("#synkro-sync-detail");

let adminToken = "";
let currentAttempts = [];
let filteredAttempts = [];

function setSyncMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function authHeaders() {
  return {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json"
  };
}

function buildAttemptsUrl() {
  const params = new URLSearchParams();
  if (statusFilter.value) {
    params.set("status", statusFilter.value);
  }
  params.set("limit", "200");
  params.set("resource", "sync-attempts");
  return `/api/synkro/internal?${params.toString()}`;
}

// ES: Carga los intentos tecnicos protegidos por token administrativo.
// EN: Loads technical sync attempts protected by the admin token.
async function loadAttempts() {
  if (!adminToken) {
    setSyncMessage("Ingresa el token administrativo.", "error");
    return;
  }

  setSyncMessage("Cargando sincronizaciones...");
  refreshButton.disabled = true;

  try {
    const response = await fetch(buildAttemptsUrl(), {
      headers: authHeaders()
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No fue posible consultar sincronizaciones.");
    }

    currentAttempts = result.attempts || [];
    applyClientFilters();
    setSyncMessage("Sincronizaciones cargadas.", "ok");
    refreshButton.disabled = false;
  } catch (error) {
    currentAttempts = [];
    filteredAttempts = [];
    renderAttempts();
    renderMetrics();
    setSyncMessage(error.message, "error");
    refreshButton.disabled = true;
    exportButton.disabled = true;
  }
}

function applyClientFilters() {
  const platform = platformFilter.value.trim().toLowerCase();
  const date = dateFilter.value;

  filteredAttempts = currentAttempts.filter((attempt) => {
    const order = attempt.order || {};
    const platformMatches = !platform || String(order.platform || "").toLowerCase().includes(platform);
    const dateMatches = !date || String(attempt.created_at || "").slice(0, 10) >= date;
    return platformMatches && dateMatches;
  });

  renderMetrics();
  renderAttempts();
  exportButton.disabled = filteredAttempts.length === 0;
}

function renderMetrics() {
  const totals = filteredAttempts.reduce((accumulator, attempt) => {
    const status = attempt.status || "queued";
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {});

  metricsContainer.innerHTML = `
    <article><span>En cola</span><strong>${totals.queued || 0}</strong></article>
    <article><span>Procesando</span><strong>${totals.processing || 0}</strong></article>
    <article><span>Exitosos</span><strong>${totals.success || 0}</strong></article>
    <article><span>Fallidos</span><strong>${totals.failed || 0}</strong></article>
  `;
}

function renderAttempts() {
  summary.textContent = `${filteredAttempts.length} intento${filteredAttempts.length === 1 ? "" : "s"} encontrado${filteredAttempts.length === 1 ? "" : "s"}.`;

  if (!filteredAttempts.length) {
    syncList.innerHTML = '<article><p class="muted">No hay sincronizaciones para este filtro.</p></article>';
    return;
  }

  syncList.innerHTML = filteredAttempts.map((attempt) => {
    const order = attempt.order || {};
    const tenant = attempt.tenant || {};
    return `
      <article class="synkro-sync-row" data-attempt-id="${escapeAttribute(attempt.id)}" data-order-id="${escapeAttribute(order.id || "")}">
        <div>
          <span class="synkro-status">${escapeHtml(attempt.status || "queued")}</span>
          <h3>${escapeHtml(order.external_order_id || "Orden sin ID externo")}</h3>
          <p>${escapeHtml(tenant.name || "Tenant sin nombre")} · ${escapeHtml(order.platform || "Sin plataforma")}</p>
        </div>
        <dl>
          <div><dt>Total</dt><dd>${formatMoney(order.total, order.currency)}</dd></div>
          <div><dt>Items</dt><dd>${Array.isArray(order.items_payload) ? order.items_payload.length : 0}</dd></div>
          <div><dt>Intento</dt><dd>#${Number(attempt.attempt_number || 1)}</dd></div>
          <div><dt>Fecha</dt><dd>${formatDate(attempt.created_at)}</dd></div>
        </dl>
        <p>${escapeHtml(attempt.message || "Sin mensaje tecnico.")}</p>
        <div class="synkro-sync-actions">
          <button type="button" class="secondary-button" data-action="detail">Ver detalle</button>
          <button type="button" class="secondary-button" data-action="logs"${order.id ? "" : " disabled"}>Ver auditoria</button>
        </div>
      </article>
    `;
  }).join("");
}

async function showDetail(card) {
  const attempt = findAttempt(card.dataset.attemptId);

  if (!attempt) {
    return;
  }

  detailContainer.innerHTML = `
    <h2>Detalle de sincronizacion</h2>
    <dl class="synkro-detail-grid">
      <div><dt>Estado</dt><dd>${escapeHtml(attempt.status || "queued")}</dd></div>
      <div><dt>Tenant</dt><dd>${escapeHtml(attempt.tenant?.name || "Sin dato")}</dd></div>
      <div><dt>Orden externa</dt><dd>${escapeHtml(attempt.order?.external_order_id || "Sin dato")}</dd></div>
      <div><dt>Plataforma</dt><dd>${escapeHtml(attempt.order?.platform || "Sin dato")}</dd></div>
    </dl>
    <h3>Payload normalizado</h3>
    <pre>${escapeHtml(JSON.stringify(attempt.order || {}, null, 2))}</pre>
  `;
  detailDialog.showModal();
}

async function showLogs(card) {
  const orderId = card.dataset.orderId;

  if (!orderId) {
    return;
  }

  detailContainer.innerHTML = "<h2>Auditoria</h2><p class=\"muted\">Cargando eventos...</p>";
  detailDialog.showModal();

  try {
    const response = await fetch(`/api/synkro/internal?resource=audit-logs&externalOrderId=${encodeURIComponent(orderId)}&limit=50`, {
      headers: authHeaders()
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No fue posible consultar auditoria.");
    }

    const logs = result.logs || [];
    detailContainer.innerHTML = `
      <h2>Auditoria</h2>
      ${logs.length ? logs.map((log) => `
        <article class="synkro-audit-event">
          <span>${escapeHtml(log.event_type)}</span>
          <strong>${formatDate(log.created_at)}</strong>
          <p>${escapeHtml(log.message)}</p>
          <pre>${escapeHtml(JSON.stringify(log.metadata || {}, null, 2))}</pre>
        </article>
      `).join("") : '<p class="muted">Esta orden aun no tiene eventos de auditoria.</p>'}
    `;
  } catch (error) {
    detailContainer.innerHTML = `<h2>Auditoria</h2><p class="message error">${escapeHtml(error.message)}</p>`;
  }
}

function exportAttemptsCsv() {
  if (!filteredAttempts.length) return;

  const headers = [
    "tenant",
    "platform",
    "external_order_id",
    "status",
    "attempt_number",
    "total",
    "currency",
    "message",
    "created_at"
  ];
  const rows = filteredAttempts.map((attempt) => {
    const order = attempt.order || {};
    const tenant = attempt.tenant || {};
    const values = {
      tenant: tenant.name,
      platform: order.platform,
      external_order_id: order.external_order_id,
      status: attempt.status,
      attempt_number: attempt.attempt_number,
      total: order.total,
      currency: order.currency,
      message: attempt.message,
      created_at: attempt.created_at
    };
    return headers.map((header) => csvCell(values[header])).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "synkro-sync-attempts.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function findAttempt(id) {
  return filteredAttempts.find((attempt) => attempt.id === id);
}

function formatMoney(value, currency = "COP") {
  const number = Number(value || 0);
  return number.toLocaleString("es-CO", {
    style: "currency",
    currency: currency || "COP",
    maximumFractionDigits: 0
  });
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

syncForm.addEventListener("submit", (event) => {
  event.preventDefault();
  adminToken = tokenInput.value.trim();
  loadAttempts();
});

refreshButton.addEventListener("click", loadAttempts);
exportButton.addEventListener("click", exportAttemptsCsv);
platformFilter.addEventListener("input", applyClientFilters);
dateFilter.addEventListener("change", applyClientFilters);

syncList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  const card = event.target.closest("[data-attempt-id]");

  if (!button || !card) {
    return;
  }

  if (button.dataset.action === "detail") {
    showDetail(card);
  }

  if (button.dataset.action === "logs") {
    showLogs(card);
  }
});
