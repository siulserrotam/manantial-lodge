const tokenForm = document.querySelector("#synkro-token-form");
const tokenInput = document.querySelector("#synkro-token");
const statusFilter = document.querySelector("#synkro-status-filter");
const message = document.querySelector("#synkro-admin-message");
const leadsSummary = document.querySelector("#synkro-leads-summary");
const leadsList = document.querySelector("#synkro-leads-list");
const refreshButton = document.querySelector("#synkro-refresh");

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
    params.set("estado", statusFilter.value);
  }
  const suffix = params.toString();
  return `/api/synkro/leads${suffix ? `?${suffix}` : ""}`;
}

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
    setAdminMessage("Leads cargados.", "ok");
    refreshButton.disabled = false;
  } catch (error) {
    leadsList.innerHTML = '<article><p class="muted">No se pudieron cargar leads.</p></article>';
    leadsSummary.textContent = "Revisa el token o intenta de nuevo.";
    setAdminMessage(error.message, "error");
  }
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
        <span class="synkro-status">${escapeHtml(lead.estado || "nuevo")}</span>
        <h3>${escapeHtml(lead.nombre)}</h3>
        <p>${escapeHtml(lead.empresa || "Empresa sin registrar")}</p>
      </div>
      <dl>
        <div><dt>Correo</dt><dd><a href="mailto:${escapeAttribute(lead.email)}">${escapeHtml(lead.email)}</a></dd></div>
        <div><dt>Celular</dt><dd><a href="https://wa.me/${normalizePhone(lead.celular)}" target="_blank" rel="noopener">${escapeHtml(lead.celular)}</a></dd></div>
        <div><dt>E-commerce</dt><dd>${escapeHtml(lead.ecommerce || "Sin dato")}</dd></div>
        <div><dt>ERP</dt><dd>${escapeHtml(lead.erp || "Sin dato")}</dd></div>
        <div><dt>Pedidos/mes</dt><dd>${Number(lead.pedidos_mes || 0).toLocaleString("es-CO")}</dd></div>
      </dl>
      <p>${escapeHtml(lead.mensaje || "Sin mensaje.")}</p>
      <form class="synkro-lead-form">
        <label>Estado</label>
        <select name="estado">
          ${statusOption("nuevo", lead.estado)}
          ${statusOption("contactado", lead.estado)}
          ${statusOption("calificado", lead.estado)}
          ${statusOption("descartado", lead.estado)}
        </select>
        <label>Nota comercial</label>
        <textarea name="notaComercial" placeholder="Resumen de llamada, objeciones, proximo paso...">${escapeHtml(lead.nota_comercial || "")}</textarea>
        <button type="submit">Guardar seguimiento</button>
      </form>
    </article>
  `).join("");
}

function statusOption(value, currentValue) {
  const selected = value === currentValue ? " selected" : "";
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return `<option value="${value}"${selected}>${label}</option>`;
}

async function updateLead(card, form) {
  const id = card.dataset.leadId;
  const formData = new FormData(form);
  const payload = {
    id,
    estado: String(formData.get("estado") || "").trim(),
    notaComercial: String(formData.get("notaComercial") || "").trim()
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

leadsList.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target.closest(".synkro-lead-form");
  const card = event.target.closest("[data-lead-id]");
  if (form && card) {
    updateLead(card, form);
  }
});
