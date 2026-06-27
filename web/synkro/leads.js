const tokenForm = document.querySelector("#synkro-token-form");
const tokenInput = document.querySelector("#synkro-token");
const statusFilter = document.querySelector("#synkro-status-filter");
const message = document.querySelector("#synkro-admin-message");
const leadsSummary = document.querySelector("#synkro-leads-summary");
const leadsList = document.querySelector("#synkro-leads-list");
const refreshButton = document.querySelector("#synkro-refresh");
const exportButton = document.querySelector("#synkro-export");
const metricsContainer = document.querySelector("#synkro-lead-metrics");

let adminToken = "";
let currentLeads = [];

function setAdminMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function authHeaders() {
  return {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json"
  };
}

function buildLeadsUrl() {
  const params = new URLSearchParams();
  if (statusFilter.value) {
    params.set("status", statusFilter.value);
  }
  const suffix = params.toString();
  return `/api/synkro/leads${suffix ? `?${suffix}` : ""}`;
}

// ES: Carga leads protegidos usando el token administrativo.
// EN: Loads protected leads using the administrative token.
async function loadLeads() {
  if (!adminToken) {
    setAdminMessage("Ingresa el token administrativo.", "error");
    return;
  }

  setAdminMessage("Cargando leads...");
  refreshButton.disabled = true;

  try {
    const response = await fetch(buildLeadsUrl(), {
      headers: authHeaders()
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No fue posible consultar leads.");
    }

    currentLeads = result.leads || [];
    renderLeads();
    renderMetrics();
    setAdminMessage("Leads cargados.", "ok");
    refreshButton.disabled = false;
    exportButton.disabled = currentLeads.length === 0;
  } catch (error) {
    leadsList.innerHTML = '<article><p class="muted">No se pudieron cargar leads.</p></article>';
    leadsSummary.textContent = "Revisa el token o intenta de nuevo.";
    setAdminMessage(error.message, "error");
    exportButton.disabled = true;
  }
}

function renderMetrics() {
  const totals = currentLeads.reduce((summary, lead) => {
    summary[lead.status || "new"] = (summary[lead.status || "new"] || 0) + 1;
    return summary;
  }, {});

  metricsContainer.innerHTML = `
    <article><span>Nuevos</span><strong>${totals.new || 0}</strong></article>
    <article><span>Contactados</span><strong>${totals.contacted || 0}</strong></article>
    <article><span>Calificados</span><strong>${totals.qualified || 0}</strong></article>
    <article><span>Descartados</span><strong>${totals.discarded || 0}</strong></article>
  `;
}

function renderLeads() {
  leadsSummary.textContent = `${currentLeads.length} lead${currentLeads.length === 1 ? "" : "s"} encontrado${currentLeads.length === 1 ? "" : "s"}.`;

  if (!currentLeads.length) {
    leadsList.innerHTML = '<article><p class="muted">No hay leads para este filtro.</p></article>';
    return;
  }

  leadsList.innerHTML = currentLeads.map((lead) => `
    <article class="synkro-lead-card" data-lead-id="${escapeAttribute(lead.id)}">
      <div>
        <span class="synkro-status">${escapeHtml(lead.status || "new")}</span>
        <h3>${escapeHtml(lead.name)}</h3>
        <p>${escapeHtml(lead.company || "Empresa sin registrar")}</p>
      </div>
      <dl>
        <div><dt>Correo</dt><dd><a href="mailto:${escapeAttribute(lead.email)}">${escapeHtml(lead.email)}</a></dd></div>
        <div><dt>Celular</dt><dd><a href="https://wa.me/${normalizePhone(lead.phone)}" target="_blank" rel="noopener">${escapeHtml(lead.phone)}</a></dd></div>
        <div><dt>E-commerce</dt><dd>${escapeHtml(lead.ecommerce_platform || "Sin dato")}</dd></div>
        <div><dt>ERP</dt><dd>${escapeHtml(lead.erp_system || "Sin dato")}</dd></div>
        <div><dt>Pedidos/mes</dt><dd>${Number(lead.monthly_orders || 0).toLocaleString("es-CO")}</dd></div>
      </dl>
      <p>${escapeHtml(lead.message || "Sin mensaje.")}</p>
      <form class="synkro-lead-form">
        <label>Estado</label>
        <select name="status">
          ${statusOption("new", lead.status, "Nuevo")}
          ${statusOption("contacted", lead.status, "Contactado")}
          ${statusOption("qualified", lead.status, "Calificado")}
          ${statusOption("discarded", lead.status, "Descartado")}
        </select>
        <label>Score</label>
        <input name="score" type="number" min="0" max="100" value="${Number(lead.score || 0)}">
        <label>Urgencia</label>
        <select name="urgency">
          ${urgencyOption("low", lead.urgency, "Baja")}
          ${urgencyOption("medium", lead.urgency, "Media")}
          ${urgencyOption("high", lead.urgency, "Alta")}
        </select>
        <label>Responsable</label>
        <input name="owner" value="${escapeAttribute(lead.owner || "")}" placeholder="Nombre comercial">
        <label>Proximo contacto</label>
        <input name="nextContactAt" type="date" value="${escapeAttribute(lead.next_contact_at || "")}">
        <fieldset class="synkro-validation-flags">
          <legend>Validaciones</legend>
          <label><input type="checkbox" name="ecommerceValidated" value="1"${lead.ecommerce_validated ? " checked" : ""}> E-commerce validado</label>
          <label><input type="checkbox" name="erpValidated" value="1"${lead.erp_validated ? " checked" : ""}> ERP validado</label>
        </fieldset>
        <label>Nota comercial</label>
        <textarea name="commercialNote" placeholder="Resumen de llamada, objeciones, proximo paso...">${escapeHtml(lead.commercial_note || "")}</textarea>
        <button type="submit">Guardar seguimiento</button>
      </form>
    </article>
  `).join("");
}

function statusOption(value, currentValue, label) {
  const selected = value === currentValue ? " selected" : "";
  return `<option value="${value}"${selected}>${label}</option>`;
}

function urgencyOption(value, currentValue, label) {
  const selected = value === (currentValue || "medium") ? " selected" : "";
  return `<option value="${value}"${selected}>${label}</option>`;
}

async function updateLead(card, form) {
  const id = card.dataset.leadId;
  const formData = new FormData(form);
  const payload = {
    id,
    status: String(formData.get("status") || "").trim(),
    score: String(formData.get("score") || "0").trim(),
    urgency: String(formData.get("urgency") || "medium").trim(),
    owner: String(formData.get("owner") || "").trim(),
    nextContactAt: String(formData.get("nextContactAt") || "").trim(),
    ecommerceValidated: formData.get("ecommerceValidated") ? "1" : "0",
    erpValidated: formData.get("erpValidated") ? "1" : "0",
    commercialNote: String(formData.get("commercialNote") || "").trim()
  };
  const button = form.querySelector("button");

  button.disabled = true;
  setAdminMessage("Guardando seguimiento...");

  try {
    const response = await fetch("/api/synkro/leads", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No fue posible actualizar el lead.");
    }

    await loadLeads();
    setAdminMessage("Seguimiento actualizado.", "ok");
  } catch (error) {
    setAdminMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function exportLeadsCsv() {
  if (!currentLeads.length) return;

  const headers = [
    "name",
    "email",
    "phone",
    "company",
    "ecommerce_platform",
    "erp_system",
    "monthly_orders",
    "status",
    "score",
    "urgency",
    "owner",
    "next_contact_at",
    "ecommerce_validated",
    "erp_validated",
    "commercial_note",
    "created_at"
  ];
  const rows = currentLeads.map((lead) => headers.map((header) => csvCell(lead[header])).join(","));
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "synkro-leads.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

tokenForm.addEventListener("submit", (event) => {
  event.preventDefault();
  adminToken = tokenInput.value.trim();
  loadLeads();
});

statusFilter.addEventListener("change", () => {
  if (adminToken) {
    loadLeads();
  }
});

refreshButton.addEventListener("click", loadLeads);
exportButton.addEventListener("click", exportLeadsCsv);

leadsList.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target.closest(".synkro-lead-form");
  const card = event.target.closest("[data-lead-id]");
  if (form && card) {
    updateLead(card, form);
  }
});
