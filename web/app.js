const API_URL = "/api";

const loginView = document.querySelector("#login-view");
const adminView = document.querySelector("#admin-view");
const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");
const button = form.querySelector("button");

const storage = {
  products: "manantialProducts",
  inventory: "manantialInventory",
  movements: "manantialInventoryMovements",
  accounts: "manantialOpenAccounts",
  sales: "manantialSales",
  tables: "manantialTables",
  cabins: "manantialCabins",
  expenses: "manantialExpenses",
  reservations: "manantialReservations",
  requests: "manantialClientRequests",
  serviceConfig: "manantialServiceConfig"
};

function load(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || "null") || fallback;
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let products = load(storage.products, [
  { id: 1, type: "restaurante", name: "Sancocho campestre", price: 28000, inventoryId: 1, stockQty: 1, image: "" },
  { id: 2, type: "restaurante", name: "Trucha con patacon", price: 32000, inventoryId: 2, stockQty: 1, image: "" },
  { id: 3, type: "bar", name: "Limonada natural", price: 8000, inventoryId: 3, stockQty: 1, image: "" },
  { id: 4, type: "bar", name: "Cerveza nacional", price: 7000, inventoryId: 4, stockQty: 1, image: "" },
  { id: 5, type: "paquete", name: "Paquete minibar cabana", price: 35000, inventoryId: 4, stockQty: 2, image: "" }
]);

let inventory = load(storage.inventory, [
  { id: 1, name: "Carne para sancocho", category: "comida", unit: "porcion", quantity: 20 },
  { id: 2, name: "Trucha", category: "comida", unit: "unidad", quantity: 12 },
  { id: 3, name: "Limonada", category: "bebida", unit: "vaso", quantity: 30 },
  { id: 4, name: "Cerveza nacional", category: "bebida", unit: "unidad", quantity: 48 }
]);

let inventoryMovements = load(storage.movements, []);
let tables = load(storage.tables, [{ id: 1, name: "Mesa 1" }, { id: 2, name: "Mesa 2" }]);
let cabins = load(storage.cabins, [
  { id: 1, name: "Cabana Tipi 101", type: "Cabana Tipi", price: 160000, status: "Disponible", amenities: "Sin cocina, nevera, desayuno incluido, wifi y parqueadero", assets: "Nevera minibar, cama doble, ventilador, mesa auxiliar, lenceria", pantry: "Agua, gaseosa, cerveza, paquetes, snacks" },
  { id: 2, name: "Cabana Tipi 102", type: "Cabana Tipi", price: 180000, status: "Disponible", amenities: "Sin cocina, nevera, desayuno incluido, wifi y parqueadero", assets: "Nevera minibar, cama doble, ventilador, mesa auxiliar, lenceria", pantry: "Agua, gaseosa, cerveza, paquetes, snacks" },
  { id: 3, name: "Apartaestudio Campestre", type: "Apartaestudio Campestre", price: 220000, status: "Disponible", amenities: "Cocina equipada, wifi y parqueadero", assets: "Nevera, estufa, menaje, cama, televisor, lenceria", pantry: "Bebidas, paquetes, cafe, huevos, snacks" },
  { id: 4, name: "Casa Campestre", type: "Casa Campestre", price: 480000, status: "Disponible", amenities: "3 habitaciones, cocina, zona social, wifi y parqueadero", assets: "Nevera, estufa, comedor, camas, televisor, sonido, menaje, lenceria", pantry: "Bebidas, paquetes, frutas, cafe, insumos de cocina" },
  { id: 5, name: "Salon Eventos", type: "Salon Eventos", price: 350000, status: "Disponible", amenities: "Salon para reuniones, ferias, fiestas y eventos campestres", assets: "Mesas, sillas, sonido, iluminacion, ventiladores, extension electrica", pantry: "Bebidas, hielo, paquetes y productos para evento" }
]);
let openAccounts = load(storage.accounts, []);
let sales = load(storage.sales, []);
let expenses = load(storage.expenses, []);
let reservations = load(storage.reservations, []);
let clientRequests = load(storage.requests, []);
let serviceConfig = load(storage.serviceConfig, {
  poolPrice: 15000
});
let selectedTableId = null;
let tableOrders = {};
let currentUser = null;
let activeTab = "restaurante";

function persistAll() {
  save(storage.products, products);
  save(storage.inventory, inventory);
  save(storage.movements, inventoryMovements);
  save(storage.tables, tables);
  save(storage.cabins, cabins);
  save(storage.accounts, openAccounts);
  save(storage.sales, sales);
  save(storage.expenses, expenses);
  save(storage.reservations, reservations);
  save(storage.requests, clientRequests);
  save(storage.serviceConfig, serviceConfig);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function isAdmin() {
  return currentUser && currentUser.rol === "administrador";
}

function roleLabel(role) {
  return role === "huesped" ? "Huesped" : "Pasadia";
}

function inventoryItem(id) {
  return inventory.find((item) => item.id === Number(id));
}

function inventoryName(id) {
  const item = inventoryItem(id);
  return item ? item.name : "Agotado";
}

function productAvailable(product) {
  const item = inventoryItem(product.inventoryId);
  return product.active !== false && Boolean(item && item.quantity >= Number(product.stockQty || 1));
}

function accountTotal(account) {
  return account.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
}

function selectedAccountId() {
  return Number(document.querySelector("#open-account").value || 0);
}

function selectedAccount() {
  return openAccounts.find((account) => account.id === selectedAccountId());
}

function isCabinInOpenAccount(cabinId) {
  return openAccounts.some((account) => account.role === "huesped" && account.cabinId === cabinId);
}

function cabinIsAvailable(cabin) {
  return cabin.status === "Disponible" && !isCabinInOpenAccount(cabin.id);
}

function isAdminTab(tabName) {
  return ["alojamientos", "bodega", "inventario", "empleados", "gastos", "recibos", "cierre", "facturacion"].includes(tabName);
}

function canUseTab(tabName) {
  return !isAdminTab(tabName) || isAdmin();
}

function activateTab(tabName) {
  const previousTab = activeTab;
  activeTab = canUseTab(tabName) ? tabName : "restaurante";

  document.querySelectorAll("[data-tab-button]").forEach((tabButton) => {
    const tab = tabButton.dataset.tabButton;
    tabButton.hidden = !canUseTab(tab);
    tabButton.classList.toggle("active", tab === activeTab);
  });

  document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    const tab = panel.dataset.tabPanel;
    panel.hidden = tab !== activeTab || !canUseTab(tab);
  });

  if (activeTab === "empleados" && previousTab !== "empleados") {
    window.setTimeout(clearEmployeeCredentialFields, 50);
  }
}

function clearEmployeeCredentialFields() {
  const userField = document.querySelector("#employee-user");
  const passwordField = document.querySelector("#employee-password");
  if (userField) userField.value = "";
  if (passwordField) passwordField.value = "";
}

function updateRoleVisibility() {
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.hidden = !isAdmin();
  });
  const poolPrice = document.querySelector("#pool-price");
  poolPrice.disabled = !isAdmin();
  poolPrice.title = isAdmin() ? "" : "Solo el administrador puede cambiar este valor";
}

function normalizeState() {
  const requiredCabins = [
    { id: 3, name: "Apartaestudio Campestre", type: "Apartaestudio Campestre", price: 220000, status: "Disponible", amenities: "Cocina equipada, wifi y parqueadero", assets: "Nevera, estufa, menaje, cama, televisor, lenceria", pantry: "Bebidas, paquetes, cafe, huevos, snacks" },
    { id: 4, name: "Casa Campestre", type: "Casa Campestre", price: 480000, status: "Disponible", amenities: "3 habitaciones, cocina, zona social, wifi y parqueadero", assets: "Nevera, estufa, comedor, camas, televisor, sonido, menaje, lenceria", pantry: "Bebidas, paquetes, frutas, cafe, insumos de cocina" },
    { id: 5, name: "Salon Eventos", type: "Salon Eventos", price: 350000, status: "Disponible", amenities: "Salon para reuniones, ferias, fiestas y eventos campestres", assets: "Mesas, sillas, sonido, iluminacion, ventiladores, extension electrica", pantry: "Bebidas, hielo, paquetes y productos para evento" }
  ];
  requiredCabins.forEach((cabin) => {
    if (!cabins.some((item) => item.id === cabin.id)) {
      cabins.push(cabin);
    }
  });

  if (!products.some((item) => item.id === 5)) {
    products.push({ id: 5, type: "paquete", name: "Paquete minibar cabana", price: 35000, inventoryId: 4, stockQty: 2, image: "", active: true });
  }

  cabins = cabins.map((cabin) => {
    if (cabin.id === 1) return { type: "Cabana Tipi", amenities: "Sin cocina, nevera, desayuno incluido, wifi y parqueadero", assets: "Nevera minibar, cama doble, ventilador, mesa auxiliar, lenceria", pantry: "Agua, gaseosa, cerveza, paquetes, snacks", ...cabin, name: "Cabana Tipi 101" };
    if (cabin.id === 2) return { type: "Cabana Tipi", amenities: "Sin cocina, nevera, desayuno incluido, wifi y parqueadero", assets: "Nevera minibar, cama doble, ventilador, mesa auxiliar, lenceria", pantry: "Agua, gaseosa, cerveza, paquetes, snacks", ...cabin, name: "Cabana Tipi 102" };
    return cabin;
  });
  products = products.map((product) => ({ image: "", stockQty: 1, active: true, ...product }));
  openAccounts = openAccounts.map((account) => ({
    qrToken: `v-${account.id}`,
    ...account
  }));
  tables = tables.length ? tables : [{ id: 1, name: "Mesa 1" }, { id: 2, name: "Mesa 2" }];
  persistAll();
}

function clientVisitUrl(account) {
  const publicOrigin = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "https://manantiallodge.com"
    : window.location.origin;
  return `${publicOrigin}/cliente.html?visita=${encodeURIComponent(account.qrToken || `v-${account.id}`)}`;
}

function qrImageUrl(account) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(clientVisitUrl(account))}`;
}

function whatsappQrUrl(account) {
  const cleanPhone = String(account.phone || "").replace(/\D/g, "");
  const phone = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
  const text = [
    `Hola ${account.customer}, este es tu QR de visita en Campestre finca el Manantial:`,
    clientVisitUrl(account),
    "Desde ahi puedes ver la carta, pedir a tu mesa o cabana y solicitar una cancion."
  ].join("\n");
  return `https://wa.me/${phone || "573507809843"}?text=${encodeURIComponent(text)}`;
}

function accountOptions() {
  return `
    <option value="">Selecciona cuenta abierta</option>
    ${openAccounts.map((account) => `
      <option value="${account.id}">${account.customer} - ${roleLabel(account.role)}</option>
    `).join("")}
  `;
}

function renderAccountSelects() {
  const openSelect = document.querySelector("#open-account");
  const poolSelect = document.querySelector("#pool-account");
  const previousOpen = openSelect.value;
  const previousPool = poolSelect.value;
  openSelect.innerHTML = accountOptions();
  poolSelect.innerHTML = accountOptions();
  openSelect.value = previousOpen;
  poolSelect.value = previousPool || previousOpen;
}

function renderProductList(containerId, type) {
  const container = document.querySelector(containerId);
  const list = products.filter((product) => product.type === type);

  container.innerHTML = list.map((product) => {
    const item = inventoryItem(product.inventoryId);
    const available = productAvailable(product);
    const stockText = item ? `${item.quantity} ${item.unit}` : "Agotado";
    return `
      <article class="product-row">
        <img class="product-thumb" src="${product.image || defaultProductImage(product)}" alt="Imagen de ${product.name}">
        <div>
          <strong>${product.name}</strong>
          <span>${formatMoney(product.price)} - ${inventoryName(product.inventoryId)} - ${available ? stockText : "Agotado"}</span>
        </div>
        ${isAdmin() ? `
          <button type="button" class="secondary-button" data-edit-product-price-id="${product.id}">Editar precio</button>
          <button type="button" class="secondary-button" data-toggle-product-id="${product.id}">
            ${product.active === false ? "Activar" : "Bloquear"}
          </button>
        ` : ""}
        <button type="button" data-product-id="${product.id}" ${available ? "" : "disabled"}>Agregar</button>
      </article>
    `;
  }).join("") || '<p class="muted">No hay productos en esta area.</p>';
}

function defaultProductImage(product) {
  if (product.type === "bar") {
    return "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=500&q=80";
  }
  if (product.type === "paquete") {
    return "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=500&q=80";
  }
  return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80";
}

function renderTables() {
  const container = document.querySelector("#tables");
  container.innerHTML = tables.map((table) => `
    <div class="table-chip">
      <button type="button" class="table-button ${table.id === selectedTableId ? "active" : ""}" data-table-id="${table.id}">
        ${table.name}
      </button>
      ${table.id > 2 ? `<button type="button" class="danger-button icon-danger" data-delete-table-id="${table.id}" title="Eliminar mesa" aria-label="Eliminar ${table.name}">X</button>` : ""}
    </div>
  `).join("");
}

function renderOrder() {
  const selectedTable = tables.find((table) => table.id === selectedTableId);
  const selectedTableText = document.querySelector("#selected-table");
  const orderItems = document.querySelector("#order-items");
  const orderTotal = document.querySelector("#order-total");

  if (!selectedTable) {
    selectedTableText.textContent = "Selecciona una mesa.";
    orderItems.innerHTML = "";
    orderTotal.textContent = formatMoney(0);
    return;
  }

  const items = tableOrders[selectedTableId] || [];
  selectedTableText.textContent = `Pedido de ${selectedTable.name}`;
  orderItems.innerHTML = items.map((item) => `
    <li><span>${item.name}</span><strong>${formatMoney(item.price)}</strong></li>
  `).join("");
  orderTotal.textContent = formatMoney(items.reduce((sum, item) => sum + item.price, 0));
}

function renderCabins() {
  const container = document.querySelector("#cabins");
  container.innerHTML = cabins.map((cabin) => `
    <article class="cabin-card lodging-card">
      <div>
        <strong>${cabin.name}</strong>
        <span>${cabin.type || "Alojamiento"} - ${formatMoney(cabin.price)} - ${cabinIsAvailable(cabin) ? "Disponible" : "Ocupada"}</span>
        <small>${cabin.amenities || "Wifi y parqueadero disponible"}</small>
      </div>
      <label>
        Valor
        <input type="number" min="0" step="5000" value="${cabin.price}" data-cabin-price-id="${cabin.id}">
      </label>
      <label>
        Disponibilidad
        <select data-cabin-status-id="${cabin.id}">
          <option value="Disponible" ${cabin.status === "Disponible" ? "selected" : ""}>Disponible</option>
          <option value="Ocupada" ${cabin.status === "Ocupada" ? "selected" : ""}>Ocupada</option>
          <option value="Mantenimiento" ${cabin.status === "Mantenimiento" ? "selected" : ""}>Mantenimiento</option>
        </select>
      </label>
      <label>
        Activos fijos
        <textarea rows="3" data-cabin-assets-id="${cabin.id}">${cabin.assets || ""}</textarea>
      </label>
      <label>
        Nevera y despensa
        <textarea rows="3" data-cabin-pantry-id="${cabin.id}">${cabin.pantry || ""}</textarea>
      </label>
      <div class="client-actions">
        <button type="button" class="secondary-button" data-print-contract-id="${cabin.id}">Imprimir contrato de cuidado</button>
        <button type="button" class="secondary-button" data-print-rules-id="${cabin.id}">Imprimir reglamento</button>
      </div>
    </article>
  `).join("");
}

function renderCabinSelect() {
  const select = document.querySelector("#client-cabin");
  select.innerHTML = `
    <option value="">Sin cabana</option>
    ${cabins.map((cabin) => `
      <option value="${cabin.id}" ${cabinIsAvailable(cabin) ? "" : "disabled"}>
        ${cabin.name} - ${cabinIsAvailable(cabin) ? "Disponible" : "Ocupada"}
      </option>
    `).join("")}
  `;
}

function renderReservations() {
  const container = document.querySelector("#reservation-list");
  if (!container) return;
  if (!reservations.length) {
    container.innerHTML = '<p class="muted">No hay reservas web registradas.</p>';
    return;
  }
  container.innerHTML = reservations.slice().reverse().map((reservation) => `
    <article>
      <span>
        ${reservation.name}<br>
        <small>${reservation.cabinName} - ${reservation.arrivalDate || "sin ingreso"} a ${reservation.exitDate || "sin salida"} - ${reservation.idNumber} - ${reservation.phone} - ${reservation.email}</small>
      </span>
      <strong>${reservation.status || "Pendiente"}</strong>
    </article>
  `).join("");
}

function renderInventoryControls() {
  const options = `
    <option value="">Selecciona insumo</option>
    ${inventory.map((item) => `<option value="${item.id}">${item.name} (${item.quantity} ${item.unit})</option>`).join("")}
  `;
  document.querySelector("#new-product-inventory").innerHTML = options;
  document.querySelector("#stock-movement-item").innerHTML = options;
}

function renderInventory() {
  const container = document.querySelector("#inventory-list");
  const history = document.querySelector("#inventory-history");

  container.innerHTML = inventory.map((item) => `
    <article>
      <span>
        <strong>${item.name}</strong><br>
        <small>${item.category} - ${item.unit}${item.purchaseDate ? ` - compra: ${item.purchaseDate}` : ""}${item.purchaseValue ? ` - ${formatMoney(item.purchaseValue)}` : ""}</small>
      </span>
      <strong>${item.quantity}</strong>
      <button type="button" class="danger-button" data-delete-stock-id="${item.id}">Eliminar</button>
    </article>
  `).join("") || '<p class="muted">No hay inventario.</p>';

  history.innerHTML = inventoryMovements.slice(-10).reverse().map((movement) => `
    <p>
      <span>${new Date(movement.createdAt).toLocaleString("es-CO")} - ${movement.itemName} - ${movement.note || movement.type}</span>
      <strong>${movement.type === "entrada" ? "+" : "-"}${movement.quantity}</strong>
    </p>
  `).join("") || '<p class="muted">Sin movimientos de inventario todavia.</p>';
}

function renderOpenClients() {
  const container = document.querySelector("#open-clients");
  container.innerHTML = openAccounts.map((account) => `
    <article class="client-row">
      <div>
        <strong>${account.customer}</strong><br>
        <small>${roleLabel(account.role)}${account.cabinName ? ` - ${account.cabinName}` : ""}</small><br>
        <small>${account.phone ? `Celular: ${account.phone}` : "Sin celular registrado"}</small>
      </div>
      <strong>${formatMoney(accountTotal(account))}</strong>
      <div class="client-actions">
        <button type="button" class="secondary-button" data-show-qr="${account.id}">Generar QR</button>
        <a class="button-link" href="${whatsappQrUrl(account)}" target="_blank" rel="noopener">Enviar WhatsApp</a>
        <button type="button" class="secondary-button" data-print-qr="${account.id}">Imprimir QR</button>
      </div>
    </article>
  `).join("") || '<p class="muted">No hay visitas abiertas.</p>';
}

function renderQrPanel(account) {
  const panel = document.querySelector("#client-qr-panel");
  if (!account) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  panel.hidden = false;
  panel.innerHTML = `
    <div>
      <p class="panel-kicker">QR de visita</p>
      <h3>${account.customer}</h3>
      <p class="muted">${clientVisitUrl(account)}</p>
      <a class="button-link" href="${whatsappQrUrl(account)}" target="_blank" rel="noopener">Enviar enlace por WhatsApp</a>
      <button type="button" class="secondary-button" data-print-qr="${account.id}">Imprimir QR</button>
    </div>
    <img src="${qrImageUrl(account)}" alt="QR de visita para ${account.customer}">
  `;
}

function printQr(account) {
  const printWindow = window.open("", "_blank", "width=520,height=720");
  if (!printWindow) {
    alert("El navegador bloqueo la ventana de impresion.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>QR ${account.customer}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; text-align: center; color: #193929; }
          img { width: 280px; height: 280px; margin: 18px auto; display: block; }
          p { color: #617066; overflow-wrap: anywhere; }
        </style>
      </head>
      <body>
        <h1>Campestre finca el Manantial</h1>
        <h2>${account.customer}</h2>
        <p>${roleLabel(account.role)}${account.cabinName ? ` - ${account.cabinName}` : ""}</p>
        <img src="${qrImageUrl(account)}" alt="QR de visita">
        <p>${clientVisitUrl(account)}</p>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function printLodgingDocument(cabin, documentType) {
  const title = documentType === "contract"
    ? "Contrato de cuidado de activos"
    : "Reglamento del alojamiento";
  const body = documentType === "contract"
    ? `
      <p>El huesped recibe el alojamiento <strong>${cabin.name}</strong> en buen estado y se compromete al cuidado de los activos fijos relacionados.</p>
      <h3>Activos fijos entregados</h3>
      <p>${(cabin.assets || "Sin activos registrados").replaceAll("\n", "<br>")}</p>
      <h3>Productos disponibles en nevera y despensa</h3>
      <p>${(cabin.pantry || "Sin productos registrados").replaceAll("\n", "<br>")}</p>
      <p>Todo dano, perdida o consumo sera revisado al cierre de la visita y podra cargarse a la cuenta final.</p>
    `
    : `
      <p>Bienvenido a <strong>${cabin.name}</strong>. Para una buena estadia se solicita respetar las siguientes reglas:</p>
      <ul>
        <li>Cuidar los activos fijos, lenceria, nevera, menaje y elementos entregados.</li>
        <li>Reportar cualquier novedad al personal de la finca.</li>
        <li>Respetar horarios, zonas comunes, piscina, parqueadero y normas de convivencia.</li>
        <li>Los productos de nevera y despensa consumidos se cargan a la cuenta del huesped.</li>
        <li>El alojamiento incluye wifi y parqueadero. El desayuno aplica cuando este indicado en el plan.</li>
      </ul>
    `;

  const printWindow = window.open("", "_blank", "width=760,height=900");
  if (!printWindow) {
    alert("El navegador bloqueo la ventana de impresion.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${title} - ${cabin.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 36px; color: #193929; line-height: 1.55; }
          h1, h2, h3 { color: #193929; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 64px; }
          .line { border-top: 1px solid #193929; padding-top: 8px; }
        </style>
      </head>
      <body>
        <h1>Campestre finca el Manantial</h1>
        <h2>${title}</h2>
        <p><strong>Alojamiento:</strong> ${cabin.name}</p>
        <p><strong>Tipo:</strong> ${cabin.type || "Alojamiento"}</p>
        <p><strong>Valor:</strong> ${formatMoney(cabin.price)}</p>
        ${body}
        <div class="signatures">
          <div class="line">Firma huesped</div>
          <div class="line">Firma funcionario</div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function renderClientRequests() {
  const container = document.querySelector("#client-requests");
  if (!container) return;

  const pending = clientRequests.filter((request) => request.status !== "atendido");
  container.innerHTML = pending.slice().reverse().map((request) => `
    <p class="request-row">
      <span>
        <strong>${request.customer} - ${request.type === "special" ? "Solicitud especial" : "Pedido QR"}</strong><br>
        <small>${request.detail} ${request.target ? `- ${request.target}` : ""}</small><br>
        <small>${request.total ? formatMoney(request.total) : "Sin valor asignado"}</small>
      </span>
      <span class="client-actions">
        ${request.type === "order"
          ? `<button type="button" data-charge-request-id="${request.id}">Cargar a cuenta</button>`
          : `<button type="button" class="secondary-button" data-mark-request-done="${request.id}">Atendido</button>`}
      </span>
    </p>
  `).join("") || '<p class="muted">Sin solicitudes por QR.</p>';
}

function renderAccountTotal() {
  const account = selectedAccount();
  document.querySelector("#account-total").textContent =
    account ? `Total cuenta: ${formatMoney(accountTotal(account))}` : "Total cuenta: $0";
}

function renderReceipt(sale) {
  const receipt = document.querySelector("#receipt");
  if (!sale) {
    receipt.innerHTML = '<p class="muted">Cuando finalices una visita, aqui se vera el recibo.</p>';
    return;
  }

  receipt.innerHTML = `
    <div class="receipt-header">
      <strong>Recibo ${sale.id}</strong>
      <span>${new Date(sale.createdAt).toLocaleString("es-CO")}</span>
    </div>
    <p><strong>Cliente:</strong> ${sale.customer}</p>
    <p><strong>Tipo:</strong> ${roleLabel(sale.role)}</p>
    ${sale.cabinName ? `<p><strong>Cabana:</strong> ${sale.cabinName}</p>` : ""}
    <p><strong>Forma de pago:</strong> ${sale.paymentMethod || "No registrado"}</p>
    <ul>
      ${sale.items.map((item) => `<li><span>${item.name}</span><strong>${formatMoney(item.price)}</strong></li>`).join("")}
    </ul>
    <p class="summary-total">Total pagado: ${formatMoney(sale.total)}</p>
  `;
}

function renderReceiptList() {
  const container = document.querySelector("#receipt-list");
  container.innerHTML = sales.slice().reverse().map((sale) => `
    <p>
      <span>${sale.id} - ${sale.customer} - ${new Date(sale.createdAt).toLocaleDateString("es-CO")}</span>
      <strong>${formatMoney(sale.total)}</strong>
    </p>
  `).join("") || '<p class="muted">No hay recibos generados.</p>';
}

function renderExpenses() {
  const container = document.querySelector("#expense-list");
  container.innerHTML = expenses.slice().reverse().map((expense) => `
    <article>
      <span>
        ${expense.category}<br>
        <small>${expense.detail || "Sin detalle"}${expense.invoice ? ` - Factura: ${expense.invoice}` : ""} - ${new Date(expense.createdAt).toLocaleDateString("es-CO")}</small>
      </span>
      <strong>${formatMoney(expense.value)}</strong>
    </article>
  `).join("") || '<p class="muted">No hay gastos registrados.</p>';
}

function renderSalesSummary() {
  const container = document.querySelector("#sales-summary");
  const today = todayKey();
  const month = monthKey();
  const todaySales = sales.filter((sale) => sale.date === today);
  const monthSales = sales.filter((sale) => sale.month === month);
  const monthExpenses = expenses.filter((expense) => expense.month === month);
  const allIncome = sales.reduce((sum, sale) => sum + sale.total, 0);
  const allExpenses = expenses.reduce((sum, expense) => sum + expense.value, 0);
  const monthIncome = monthSales.reduce((sum, sale) => sum + sale.total, 0);
  const monthOut = monthExpenses.reduce((sum, expense) => sum + expense.value, 0);

  container.innerHTML = `
    <article><span>Ventas de hoy</span><strong>${formatMoney(todaySales.reduce((sum, sale) => sum + sale.total, 0))}</strong></article>
    <article><span>Recibos de hoy</span><strong>${todaySales.length}</strong></article>
    <article><span>Ganado este mes</span><strong>${formatMoney(monthIncome)}</strong></article>
    <article><span>Gastado este mes</span><strong>${formatMoney(monthOut)}</strong></article>
    <article><span>Cierre mensual</span><strong>${formatMoney(monthIncome - monthOut)}</strong></article>
    <article><span>Historico neto</span><strong>${formatMoney(allIncome - allExpenses)}</strong></article>
  `;
}

function updatePoolTotal() {
  const people = Number(document.querySelector("#pool-people").value || 0);
  const price = Number(document.querySelector("#pool-price").value || 0);
  document.querySelector("#pool-total").textContent = `Total: ${formatMoney(people * price)}`;
}

function updateServiceFields() {
  document.querySelector("#pool-price").value = serviceConfig.poolPrice;
}

function syncClientRequests() {
  fetch("/api/solicitudes")
    .then((response) => response.json())
    .then((result) => {
      if (!result.ok) throw new Error(result.message || "No fue posible cargar solicitudes.");
      const cloudRequests = (result.solicitudes || []).map((request) => ({
        id: request.id,
        accountId: request.cliente_id,
        visitToken: request.qr_token,
        customer: request.cliente_nombre,
        type: request.tipo,
        target: request.destino,
        detail: request.detalle,
        total: Number(request.total || 0),
        items: request.items || [],
        status: request.estado,
        createdAt: request.creado_en
      }));
      const localPending = load(storage.requests, []).filter((request) => request.status !== "atendido");
      const cloudIds = new Set(cloudRequests.map((request) => String(request.id)));
      clientRequests = [
        ...cloudRequests,
        ...localPending.filter((request) => !cloudIds.has(String(request.id)))
      ];
      renderClientRequests();
    })
    .catch(() => {
      clientRequests = load(storage.requests, []);
      renderClientRequests();
    });
}

function markCloudRequestDone(id) {
  return fetch("/api/solicitudes", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, estado: "atendido" })
  }).catch(() => {});
}

function renderAdmin() {
  renderProductList("#restaurant-products", "restaurante");
  renderProductList("#bar-products", "bar");
  renderProductList("#package-products", "paquete");
  renderTables();
  renderOrder();
  renderCabins();
  renderReservations();
  renderCabinSelect();
  document.querySelector("#client-cabin").disabled = document.querySelector("#client-role").value !== "huesped";
  renderAccountSelects();
  renderOpenClients();
  renderClientRequests();
  renderAccountTotal();
  renderInventoryControls();
  renderInventory();
  renderExpenses();
  renderReceiptList();
  renderSalesSummary();
  updateServiceFields();
  updatePoolTotal();
}

function findProduct(id) {
  return products.find((product) => product.id === Number(id));
}

function registerInventoryMovement({ inventoryId, type, quantity, note }) {
  const item = inventoryItem(inventoryId);
  if (!item) return false;
  if (type === "salida" && item.quantity < quantity) {
    alert(`No existe inventario suficiente para ${item.name}. Disponible: ${item.quantity} ${item.unit}.`);
    return false;
  }

  item.quantity += type === "entrada" ? quantity : -quantity;
  inventoryMovements.push({
    id: Date.now(),
    inventoryId: item.id,
    itemName: item.name,
    type,
    quantity,
    note,
    createdAt: new Date().toISOString()
  });
  persistAll();
  return true;
}

function consumeProductInventory(product) {
  const item = inventoryItem(product.inventoryId);
  const quantity = Number(product.stockQty || 1);
  if (!item || item.quantity < quantity) {
    alert(`No se puede agregar ${product.name}: no existe en inventario o esta agotado.`);
    return false;
  }
  return registerInventoryMovement({
    inventoryId: item.id,
    type: "salida",
    quantity,
    note: `Pedido: ${product.name}`
  });
}

function closeAccount(account) {
  const paymentMethod = document.querySelector("#payment-method").value;
  const sale = {
    id: `R-${String(sales.length + 1).padStart(4, "0")}`,
    customer: account.customer,
    role: account.role,
    cabinName: account.cabinName,
    items: account.items,
    total: accountTotal(account),
    date: todayKey(),
    month: monthKey(),
    createdAt: new Date().toISOString(),
    user: currentUser ? currentUser.usuario : "sin usuario",
    paymentMethod
  };

  sales.push(sale);
  openAccounts = openAccounts.filter((item) => item.id !== account.id);
  if (account.cabinId) {
    const cabin = cabins.find((item) => item.id === account.cabinId);
    if (cabin) cabin.status = "Disponible";
  }
  persistAll();
  renderReceipt(sale);
  renderAdmin();
  return sale;
}

function readImageAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function showAdmin(funcionario) {
  currentUser = funcionario;
  loginView.hidden = true;
  adminView.hidden = false;
  document.title = `Administracion - ${funcionario.nombre}`;
  document.querySelector("#session-user").textContent = `${funcionario.nombre} - Rol: ${funcionario.rol}`;
  updateRoleVisibility();
  activateTab("restaurante");
  renderAdmin();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const usuario = String(data.get("usuario") || "").trim();
  const clave = String(data.get("clave") || "");

  button.disabled = true;
  showMessage("Validando ingreso...");
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, clave })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      showMessage(result.message || "No fue posible ingresar.", "error");
      return;
    }
    showMessage(`Bienvenido, ${result.funcionario.nombre}.`, "ok");
    showAdmin(result.funcionario);
  } catch (error) {
    showMessage(`No se pudo conectar con el servidor REST de Delphi: ${error.message}`, "error");
  } finally {
    button.disabled = false;
  }
});

adminView.addEventListener("click", async (event) => {
  const target = event.target;

  if (target.matches("[data-tab-button]")) {
    activateTab(target.dataset.tabButton);
    return;
  }

  if (target.matches("#logout-button")) {
    adminView.hidden = true;
    loginView.hidden = false;
    form.reset();
    showMessage("");
    currentUser = null;
    return;
  }

  if (target.matches("#add-table")) {
    const nextId = Math.max(...tables.map((table) => table.id), 0) + 1;
    tables.push({ id: nextId, name: `Mesa ${nextId}` });
    persistAll();
    renderTables();
    return;
  }

  if (target.matches("[data-delete-table-id]")) {
    const id = Number(target.dataset.deleteTableId);
    if (id <= 2) return;
    const items = tableOrders[id] || [];
    if (items.length && !confirm(`La mesa tiene ${items.length} producto(s) pendientes. Si la eliminas se perdera ese pedido. Deseas continuar?`)) {
      return;
    }
    tables = tables.filter((table) => table.id !== id);
    delete tableOrders[id];
    if (selectedTableId === id) selectedTableId = null;
    persistAll();
    renderAdmin();
    return;
  }

  if (target.matches("#open-client")) {
    const name = document.querySelector("#client-name").value.trim();
    const idNumber = document.querySelector("#client-id-number").value.trim();
    const phone = document.querySelector("#client-phone").value.trim();
    const email = document.querySelector("#client-email").value.trim();
    const role = document.querySelector("#client-role").value;
    const cabinId = Number(document.querySelector("#client-cabin").value || 0);
    const cabin = cabins.find((item) => item.id === cabinId);

    if (!name || !idNumber) {
      alert("Ingresa nombre e identificacion del cliente.");
      return;
    }
    if (role === "huesped" && !cabin) {
      alert("Selecciona una cabana para el huesped.");
      return;
    }
    if (role === "huesped" && !cabinIsAvailable(cabin)) {
      alert("Esa cabana ya tiene una visita abierta. Finaliza esa visita antes de asignarla de nuevo.");
      return;
    }
    if (cabin) cabin.status = "Ocupada";
    const account = {
      id: Date.now(),
      customer: name,
      idNumber,
      phone,
      email,
      role,
      cabinId: cabin ? cabin.id : null,
      cabinName: cabin ? cabin.name : "",
      qrToken: `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      items: []
    };
    openAccounts.push(account);
    fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account)
    }).catch(() => {});
    ["#client-name", "#client-id-number", "#client-phone", "#client-email"].forEach((selector) => {
      document.querySelector(selector).value = "";
    });
    persistAll();
    renderAdmin();
    return;
  }

  if (target.matches("[data-show-qr]")) {
    const account = openAccounts.find((item) => item.id === Number(target.dataset.showQr));
    renderQrPanel(account);
    return;
  }

  if (target.matches("[data-print-qr]")) {
    const account = openAccounts.find((item) => item.id === Number(target.dataset.printQr));
    if (account) {
      renderQrPanel(account);
      printQr(account);
    }
    return;
  }

  if (target.matches("[data-print-contract-id]")) {
    const cabin = cabins.find((item) => item.id === Number(target.dataset.printContractId));
    if (cabin) printLodgingDocument(cabin, "contract");
    return;
  }

  if (target.matches("[data-print-rules-id]")) {
    const cabin = cabins.find((item) => item.id === Number(target.dataset.printRulesId));
    if (cabin) printLodgingDocument(cabin, "rules");
    return;
  }

  if (target.matches("[data-mark-request-done]")) {
    const request = clientRequests.find((item) => String(item.id) === String(target.dataset.markRequestDone));
    if (request) {
      request.status = "atendido";
      markCloudRequestDone(request.id);
      persistAll();
      renderClientRequests();
    }
    return;
  }

  if (target.matches("[data-charge-request-id]")) {
    const request = clientRequests.find((item) => String(item.id) === String(target.dataset.chargeRequestId));
    const account = request
      ? openAccounts.find((item) => String(item.id) === String(request.accountId)) ||
        openAccounts.find((item) => item.qrToken && item.qrToken === request.visitToken)
      : null;
    if (!request || !account) {
      alert("No se encontro la cuenta abierta de esta solicitud.");
      return;
    }
    if (request.type === "order") {
      (request.items || []).forEach((item) => {
        account.items.push({
          name: `${item.name} (${request.target || "QR cliente"})`,
          price: item.price
        });
      });
    } else {
      account.items.push({
        name: `Solicitud especial: ${request.detail}${request.target ? ` (${request.target})` : ""}`,
        price: 0
      });
    }
    request.status = "atendido";
    markCloudRequestDone(request.id);
    persistAll();
    renderAdmin();
    alert("Pedido QR cargado a la cuenta del cliente.");
    return;
  }

  if (target.matches("#add-product")) {
    if (!isAdmin()) {
      alert("Solo el administrador puede agregar productos.");
      return;
    }
    const inventoryId = Number(document.querySelector("#new-product-inventory").value || 0);
    const name = document.querySelector("#new-product-name").value.trim();
    const price = Number(document.querySelector("#new-product-price").value || 0);
    const stockQty = Number(document.querySelector("#new-product-stock-qty").value || 1);
    if (!inventoryId) {
      alert("Selecciona un insumo del inventario. El producto no puede quedar sin inventario.");
      return;
    }
    if (!name || price <= 0 || stockQty <= 0) {
      alert("Ingresa nombre, precio y cantidad valida.");
      return;
    }
    const image = await readImageAsDataUrl(document.querySelector("#new-product-image").files[0]);
    products.push({
      id: Date.now(),
      type: document.querySelector("#new-product-category").value,
      name,
      price,
      inventoryId,
      stockQty,
      image
    });
    document.querySelector("#new-product-name").value = "";
    document.querySelector("#new-product-image").value = "";
    persistAll();
    renderAdmin();
    return;
  }

  if (target.matches("[data-table-id]")) {
    selectedTableId = Number(target.dataset.tableId);
    renderTables();
    renderOrder();
    return;
  }

  if (target.matches("[data-product-id]")) {
    if (!selectedTableId) {
      alert("Selecciona una mesa antes de agregar productos.");
      return;
    }
    const product = findProduct(target.dataset.productId);
    if (!product || !consumeProductInventory(product)) return;
    tableOrders[selectedTableId] = tableOrders[selectedTableId] || [];
    tableOrders[selectedTableId].push({ name: product.name, price: product.price });
    renderAdmin();
    return;
  }

  if (target.matches("#charge-order")) {
    const account = selectedAccount();
    const items = tableOrders[selectedTableId] || [];
    const table = tables.find((item) => item.id === selectedTableId);
    if (!account) {
      alert("Selecciona una cuenta abierta.");
      return;
    }
    if (!table || !items.length) {
      alert("Selecciona una mesa con productos antes de cargar.");
      return;
    }
    items.forEach((item) => account.items.push({ name: `${item.name} (${table.name})`, price: item.price }));
    tableOrders[selectedTableId] = [];
    persistAll();
    renderAdmin();
    alert("Pedido cargado a la cuenta abierta.");
    return;
  }

  if (target.matches("#charge-pool")) {
    const account = openAccounts.find((item) => item.id === Number(document.querySelector("#pool-account").value || 0));
    const people = Number(document.querySelector("#pool-people").value || 0);
    const price = Number(document.querySelector("#pool-price").value || 0);
    if (!account) {
      alert("Selecciona una cuenta abierta para cargar piscina.");
      return;
    }
    if (people <= 0) {
      alert("Ingresa el numero de personas.");
      return;
    }
    account.items.push({ name: `Ingreso piscina (${people} persona${people === 1 ? "" : "s"})`, price: people * price });
    persistAll();
    renderAdmin();
    alert("Ingreso a piscina cargado a la cuenta.");
    return;
  }

  if (target.matches("#close-account")) {
    const account = selectedAccount();
    if (!account) {
      alert("Selecciona una cuenta abierta.");
      return;
    }
    if (!account.items.length) {
      alert("La cuenta no tiene cargos.");
      return;
    }
    const sale = closeAccount(account);
    alert(`Visita finalizada. Recibo generado: ${sale.id}`);
    return;
  }

  if (target.matches("#add-stock-item")) {
    const name = document.querySelector("#stock-name").value.trim();
    const category = document.querySelector("#stock-category").value;
    const unit = document.querySelector("#stock-unit").value.trim() || "unidad";
    const quantity = Number(document.querySelector("#stock-quantity").value || 0);
    const purchaseDate = document.querySelector("#stock-purchase-date").value || todayKey();
    const purchaseValue = Number(document.querySelector("#stock-purchase-value").value || 0);
    if (!name || quantity < 0) {
      alert("Ingresa nombre y cantidad valida.");
      return;
    }
    const item = { id: Date.now(), name, category, unit, quantity, purchaseDate, purchaseValue };
    inventory.push(item);
    inventoryMovements.push({
      id: Date.now() + 1,
      inventoryId: item.id,
      itemName: item.name,
      type: "entrada",
      quantity,
      note: `Ingreso inicial${purchaseValue ? ` - compra ${formatMoney(purchaseValue)}` : ""}`,
      createdAt: new Date().toISOString()
    });
    document.querySelector("#stock-name").value = "";
    persistAll();
    renderAdmin();
    return;
  }

  if (target.matches("#register-stock-movement")) {
    const inventoryId = Number(document.querySelector("#stock-movement-item").value || 0);
    const quantity = Number(document.querySelector("#stock-movement-quantity").value || 0);
    const type = document.querySelector("#stock-movement-type").value;
    const note = document.querySelector("#stock-movement-note").value.trim();
    if (!inventoryId || quantity <= 0) {
      alert("Selecciona insumo y cantidad valida.");
      return;
    }
    registerInventoryMovement({ inventoryId, type, quantity, note });
    document.querySelector("#stock-movement-note").value = "";
    renderAdmin();
    return;
  }

  if (target.matches("[data-delete-stock-id]")) {
    const id = Number(target.dataset.deleteStockId);
    if (products.some((product) => product.inventoryId === id)) {
      alert("No puedes eliminar este insumo porque esta asociado a productos de la carta.");
      return;
    }
    inventory = inventory.filter((item) => item.id !== id);
    persistAll();
    renderAdmin();
    return;
  }

  if (target.matches("[data-toggle-product-id]")) {
    const product = products.find((item) => item.id === Number(target.dataset.toggleProductId));
    if (product) {
      product.active = product.active === false;
      persistAll();
      renderAdmin();
    }
    return;
  }

  if (target.matches("[data-edit-product-price-id]")) {
    if (!isAdmin()) {
      alert("Solo el administrador puede modificar precios.");
      return;
    }
    const product = products.find((item) => item.id === Number(target.dataset.editProductPriceId));
    if (!product) return;
    const value = Number(prompt(`Nuevo valor para ${product.name}`, String(product.price)) || product.price);
    if (value <= 0) {
      alert("Ingresa un valor valido.");
      return;
    }
    product.price = value;
    persistAll();
    renderAdmin();
    return;
  }

  if (target.matches("#add-expense")) {
    const category = document.querySelector("#expense-category").value;
    const detail = document.querySelector("#expense-detail").value.trim();
    const invoice = document.querySelector("#expense-invoice").value.trim();
    const value = Number(document.querySelector("#expense-value").value || 0);
    if (value <= 0) {
      alert("Ingresa el valor del gasto.");
      return;
    }
    expenses.push({ id: Date.now(), category, detail, invoice, value, date: todayKey(), month: monthKey(), createdAt: new Date().toISOString() });
    document.querySelector("#expense-detail").value = "";
    document.querySelector("#expense-invoice").value = "";
    document.querySelector("#expense-value").value = "0";
    persistAll();
    renderAdmin();
    return;
  }

  if (target.matches("#create-employee")) {
    const payload = {
      usuario: document.querySelector("#employee-user").value.trim(),
      clave: document.querySelector("#employee-password").value,
      identificacion: document.querySelector("#employee-id").value.trim(),
      nombre: document.querySelector("#employee-name").value.trim(),
      celular: document.querySelector("#employee-phone").value.trim(),
      email: document.querySelector("#employee-email").value.trim(),
      rol: document.querySelector("#employee-role").value
    };
    const employeeMessage = document.querySelector("#employee-message");
    if (!payload.usuario || !payload.clave || !payload.identificacion || !payload.nombre) {
      employeeMessage.textContent = "Usuario, clave, identificacion y nombre son obligatorios.";
      employeeMessage.className = "message error";
      return;
    }
    if (!/^\d{8}$/.test(payload.clave)) {
      employeeMessage.textContent = "La clave debe tener exactamente 8 digitos. Ejemplo: 12345678.";
      employeeMessage.className = "message error";
      return;
    }
    try {
      const response = await fetch(`${API_URL}/funcionarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      employeeMessage.textContent = result.message || "Usuario creado.";
      employeeMessage.className = `message ${response.ok && result.ok ? "ok" : "error"}`;
      if (response.ok && result.ok) {
        ["#employee-user", "#employee-password", "#employee-id", "#employee-name", "#employee-phone", "#employee-email"].forEach((selector) => {
          document.querySelector(selector).value = "";
        });
      }
    } catch (error) {
      employeeMessage.textContent = `No se pudo crear el funcionario: ${error.message}`;
      employeeMessage.className = "message error";
    }
    return;
  }

  if (target.matches("#export-close")) {
    const rows = [
      ["tipo", "fecha", "detalle", "valor", "forma_pago_o_factura"],
      ...sales.map((sale) => ["venta", sale.createdAt, sale.customer, sale.total, sale.paymentMethod || ""]),
      ...expenses.map((expense) => ["gasto", expense.createdAt, `${expense.category} ${expense.detail || ""}`, expense.value, expense.invoice || ""])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cierre-${todayKey()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    return;
  }

  if (target.matches("#prepare-invoice")) {
    const nit = document.querySelector("#invoice-nit").value.trim();
    const email = document.querySelector("#invoice-email").value.trim();
    const invoiceMessage = document.querySelector("#invoice-message");
    if (!nit || !email) {
      invoiceMessage.textContent = "Ingresa documento y correo del cliente.";
      invoiceMessage.className = "message error";
      return;
    }
    invoiceMessage.textContent = "Datos preparados. Falta conectar proveedor tecnologico DIAN para emitir factura electronica real.";
    invoiceMessage.className = "message ok";
  }
});

adminView.addEventListener("input", (event) => {
  if (event.target.matches("#pool-people, #pool-price")) updatePoolTotal();
  if (event.target.matches("#pool-price")) {
    serviceConfig.poolPrice = Number(event.target.value || 0);
    persistAll();
  }
  if (event.target.matches("[data-cabin-price-id]")) {
    const cabin = cabins.find((item) => item.id === Number(event.target.dataset.cabinPriceId));
    if (cabin) {
      cabin.price = Number(event.target.value || 0);
      persistAll();
      renderCabinSelect();
    }
  }
  if (event.target.matches("[data-cabin-assets-id]")) {
    const cabin = cabins.find((item) => item.id === Number(event.target.dataset.cabinAssetsId));
    if (cabin) {
      cabin.assets = event.target.value;
      persistAll();
    }
  }
  if (event.target.matches("[data-cabin-pantry-id]")) {
    const cabin = cabins.find((item) => item.id === Number(event.target.dataset.cabinPantryId));
    if (cabin) {
      cabin.pantry = event.target.value;
      persistAll();
    }
  }
});

adminView.addEventListener("change", (event) => {
  if (event.target.matches("#open-account")) renderAccountTotal();
  if (event.target.matches("#client-role")) {
    const cabinSelect = document.querySelector("#client-cabin");
    cabinSelect.disabled = event.target.value !== "huesped";
    if (cabinSelect.disabled) cabinSelect.value = "";
  }
  if (event.target.matches("[data-cabin-status-id]")) {
    const cabin = cabins.find((item) => item.id === Number(event.target.dataset.cabinStatusId));
    if (cabin && !isCabinInOpenAccount(cabin.id)) {
      cabin.status = event.target.value;
      persistAll();
      renderCabinSelect();
      renderCabins();
    } else if (cabin) {
      alert("No puedes cambiar disponibilidad mientras tenga una visita abierta.");
      renderCabins();
    }
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === storage.requests) {
    syncClientRequests();
  }
});

window.setInterval(syncClientRequests, 2500);

normalizeState();
