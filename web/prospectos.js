const prospectForm = document.querySelector("#prospect-form");
const prospectMessage = document.querySelector("#prospect-message");
const prospectSummary = document.querySelector("#prospect-summary");
const prospectRows = document.querySelector("#prospect-rows");
const csvButton = document.querySelector("#prospect-csv");
const excelButton = document.querySelector("#prospect-excel");

let currentProspectos = [];
let currentQuery = null;

function setProspectMessage(text, type = "") {
  prospectMessage.textContent = text;
  prospectMessage.className = `message ${type}`.trim();
}

function buildQueryFromForm() {
  const formData = new FormData(prospectForm);
  return {
    tipo: String(formData.get("tipo") || "").trim(),
    pais: String(formData.get("pais") || "").trim(),
    ciudad: String(formData.get("ciudad") || "").trim(),
    limite: String(formData.get("limite") || "50").trim()
  };
}

function buildSearchParams(query) {
  return new URLSearchParams({
    tipo: query.tipo,
    pais: query.pais,
    ciudad: query.ciudad,
    limite: query.limite
  });
}

function renderProspectos(prospectos) {
  if (!prospectos.length) {
    prospectRows.innerHTML = '<tr><td colspan="7">No se encontraron negocios para esta busqueda.</td></tr>';
    return;
  }

  prospectRows.innerHTML = prospectos.map((prospecto) => `
    <tr>
      <td>
        <strong>${escapeHtml(prospecto.nombre)}</strong>
        <span>${escapeHtml(prospecto.direccion || "Sin direccion")}</span>
      </td>
      <td>${escapeHtml(prospecto.tipo)}</td>
      <td>${escapeHtml(prospecto.ciudad)}</td>
      <td>${escapeHtml(prospecto.telefono || "Sin telefono")}</td>
      <td>${prospecto.sitio_web ? `<a href="${escapeAttribute(prospecto.sitio_web)}" target="_blank" rel="noopener">Abrir</a>` : "Sin web"}</td>
      <td>${escapeHtml(prospecto.correo || "Sin correo")}</td>
      <td>${buildMapLink(prospecto)}</td>
    </tr>
  `).join("");
}

function buildMapLink(prospecto) {
  if (!prospecto.latitud || !prospecto.longitud) {
    return "Sin coordenadas";
  }

  const url = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(prospecto.latitud)}&mlon=${encodeURIComponent(prospecto.longitud)}#map=17/${encodeURIComponent(prospecto.latitud)}/${encodeURIComponent(prospecto.longitud)}`;
  return `<a href="${url}" target="_blank" rel="noopener">Mapa</a>`;
}

function toggleExports(enabled) {
  csvButton.disabled = !enabled;
  excelButton.disabled = !enabled;
}

function downloadCsv() {
  if (!currentProspectos.length) return;

  const headers = [
    "nombre",
    "tipo",
    "pais",
    "ciudad",
    "direccion",
    "telefono",
    "sitio_web",
    "correo",
    "latitud",
    "longitud",
    "fuente",
    "estado_comercial"
  ];
  const rows = currentProspectos.map((prospecto) => headers.map((header) => csvCell(prospecto[header])).join(","));
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prospectos-${safeFilePart(currentQuery.tipo)}-${safeFilePart(currentQuery.ciudad)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadExcel() {
  if (!currentQuery) return;
  window.location.href = `/api/prospectos/exportar?${buildSearchParams(currentQuery).toString()}`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function safeFilePart(value) {
  return String(value || "prospectos")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

prospectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = buildQueryFromForm();

  if (!query.tipo || !query.ciudad) {
    setProspectMessage("Selecciona una categoria e ingresa una ciudad o departamento.", "error");
    return;
  }

  currentQuery = query;
  currentProspectos = [];
  toggleExports(false);
  prospectRows.innerHTML = '<tr><td colspan="7">Buscando negocios...</td></tr>';
  prospectSummary.textContent = "Consultando OpenStreetMap y sitios web publicos.";
  setProspectMessage("La busqueda puede tardar unos segundos si se revisan correos publicos.");
  prospectForm.querySelector("button").disabled = true;

  try {
    const response = await fetch(`/api/prospectos/buscar?${buildSearchParams(query).toString()}`);
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No fue posible completar la busqueda.");
    }

    currentProspectos = result.prospectos || [];
    renderProspectos(currentProspectos);
    prospectSummary.textContent = `${currentProspectos.length} negocio${currentProspectos.length === 1 ? "" : "s"} encontrado${currentProspectos.length === 1 ? "" : "s"} para ${query.tipo} en ${query.ciudad}.`;
    setProspectMessage("Busqueda completada.", "ok");
    toggleExports(currentProspectos.length > 0);
  } catch (error) {
    prospectRows.innerHTML = '<tr><td colspan="7">No se pudieron cargar resultados.</td></tr>';
    prospectSummary.textContent = "Revisa los parametros o intenta de nuevo en unos minutos.";
    setProspectMessage(error.message, "error");
  } finally {
    prospectForm.querySelector("button").disabled = false;
  }
});

csvButton.addEventListener("click", downloadCsv);
excelButton.addEventListener("click", downloadExcel);
