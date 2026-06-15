const keys = {
  products: "manantialProducts",
  inventory: "manantialInventory",
  accounts: "manantialOpenAccounts",
  cabins: "manantialCabins",
  requests: "manantialClientRequests"
};

function load(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || "null") || fallback;
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

const defaultProducts = [
  { id: 1, type: "restaurante", name: "Sancocho campestre", price: 28000, inventoryId: 1, stockQty: 1, image: "" },
  { id: 2, type: "restaurante", name: "Trucha con patacon", price: 32000, inventoryId: 2, stockQty: 1, image: "" },
  { id: 3, type: "bar", name: "Limonada natural", price: 8000, inventoryId: 3, stockQty: 1, image: "" },
  { id: 4, type: "bar", name: "Cerveza nacional", price: 7000, inventoryId: 4, stockQty: 1, image: "" },
  { id: 5, type: "paquete", name: "Paquete minibar cabana", price: 35000, inventoryId: 4, stockQty: 2, image: "" }
];

const defaultInventory = [
  { id: 1, name: "Carne para sancocho", quantity: 20 },
  { id: 2, name: "Trucha", quantity: 12 },
  { id: 3, name: "Limonada", quantity: 30 },
  { id: 4, name: "Cerveza nacional", quantity: 48 }
];

const params = new URLSearchParams(window.location.search);
const token = params.get("visita") || "";
const accounts = load(keys.accounts, []);
const account = accounts.find((item) => (item.qrToken || `v-${item.id}`) === token);
const products = load(keys.products, defaultProducts);
const inventory = load(keys.inventory, defaultInventory);
const cabins = load(keys.cabins, []);
let cart = [];

function inventoryAvailable(product) {
  const item = inventory.find((stock) => stock.id === Number(product.inventoryId));
  return product.active !== false && Boolean(item && item.quantity >= Number(product.stockQty || 1));
}

function showMessage(text, type = "") {
  const message = document.querySelector("#client-message");
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function renderMenu() {
  const container = document.querySelector("#client-menu");
  const available = products.filter(inventoryAvailable);

  container.innerHTML = available.map((product) => `
    <article class="client-product">
      <img src="${product.image || defaultProductImage(product)}" alt="Imagen de ${product.name}">
      <div>
        <strong>${product.name}</strong>
        <span>${product.type === "bar" ? "Bar" : product.type === "paquete" ? "Paquete" : "Restaurante"} - ${formatMoney(product.price)}</span>
      </div>
      <button type="button" data-client-product="${product.id}">Agregar</button>
    </article>
  `).join("") || '<p class="muted">No hay productos disponibles en este momento.</p>';
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

function renderCart() {
  const container = document.querySelector("#client-cart");
  container.innerHTML = cart.map((item, index) => `
    <p>
      <span>${item.name}</span>
      <button type="button" class="danger-button" data-remove-cart="${index}">Quitar</button>
    </p>
  `).join("") || '<p class="muted">Aun no has agregado productos.</p>';
  document.querySelector("#client-cart-total").textContent =
    `Total: ${formatMoney(cart.reduce((sum, item) => sum + item.price, 0))}`;
}

function pushRequest(request) {
  const requests = load(keys.requests, []);
  requests.push({
    id: Date.now(),
    accountId: account.id,
    customer: account.customer,
    status: "pendiente",
    createdAt: new Date().toISOString(),
    ...request
  });
  save(keys.requests, requests);
}

if (!account) {
  document.querySelector("#client-invalid").hidden = false;
} else {
  document.querySelector("#client-valid").hidden = false;
  const cabin = cabins.find((item) => item.id === account.cabinId);
  document.querySelector("#client-summary").textContent =
    `${account.customer} - ${account.role === "huesped" ? account.cabinName : "Pasadia"}${cabin && cabin.amenities ? ` - ${cabin.amenities}` : " - Wifi y parqueadero disponibles"}`;
  document.querySelector("#client-target").value = account.cabinName || "";
  renderMenu();
  renderCart();
}

document.addEventListener("click", (event) => {
  const productButton = event.target.closest("[data-client-product]");
  if (productButton) {
    const product = products.find((item) => item.id === Number(productButton.dataset.clientProduct));
    if (product) {
      cart.push({ id: product.id, name: product.name, price: product.price });
      renderCart();
    }
    return;
  }

  const removeButton = event.target.closest("[data-remove-cart]");
  if (removeButton) {
    cart.splice(Number(removeButton.dataset.removeCart), 1);
    renderCart();
    return;
  }

  if (event.target.matches("#send-client-order")) {
    if (!cart.length) {
      showMessage("Agrega productos antes de enviar.", "error");
      return;
    }
    const target = document.querySelector("#client-target").value.trim();
    pushRequest({
      type: "order",
      target,
      detail: cart.map((item) => item.name).join(", "),
      total: cart.reduce((sum, item) => sum + item.price, 0),
      items: cart
    });
    cart = [];
    renderCart();
    showMessage("Pedido enviado. Un funcionario lo revisara.", "ok");
    return;
  }

  if (event.target.matches("#send-special-request")) {
    const message = document.querySelector("#special-message").value.trim();
    if (!message) {
      showMessage("Escribe la cancion o pedido especial.", "error");
      return;
    }
    pushRequest({
      type: "special",
      target: document.querySelector("#client-target").value.trim(),
      detail: message,
      total: 0,
      items: []
    });
    document.querySelector("#special-message").value = "";
    showMessage("Solicitud especial enviada.", "ok");
  }
});
