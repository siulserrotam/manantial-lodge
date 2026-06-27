const monthlyOperatorCost = 2400000;
const minutesPerOrder = 7;
const workHoursPerMonth = 192;

const ordersRange = document.querySelector("#orders-range");
const ordersOutput = document.querySelector("#orders-output");
const moneyOutput = document.querySelector("#money-output");
const hoursOutput = document.querySelector("#hours-output");
const costOutput = document.querySelector("#cost-output");
const leadOrders = document.querySelector("#lead-orders");
const leadForm = document.querySelector("#synkro-lead-form");
const synkroMessage = document.querySelector("#synkro-message");

function formatCurrency(value) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function updateRoi() {
  const orders = Number(ordersRange.value || 0);
  const hours = (orders * minutesPerOrder) / 60;
  const manualCostPerOrder = monthlyOperatorCost / Math.max(orders, 1);
  const utilization = Math.min(hours / workHoursPerMonth, 1);
  const estimatedSavings = monthlyOperatorCost * utilization;

  ordersOutput.textContent = `${orders.toLocaleString("es-CO")} pedidos`;
  moneyOutput.textContent = formatCurrency(estimatedSavings);
  hoursOutput.textContent = `${Math.round(hours).toLocaleString("es-CO")} h`;
  costOutput.textContent = formatCurrency(manualCostPerOrder);
  leadOrders.value = String(orders);
}

function setMessage(text, type = "") {
  synkroMessage.textContent = text;
  synkroMessage.className = `message ${type}`.trim();
}

ordersRange.addEventListener("input", updateRoi);
updateRoi();

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = leadForm.querySelector("button");
  const formData = new FormData(leadForm);
  const payload = Object.fromEntries(formData.entries());

  submitButton.disabled = true;
  setMessage("Registrando solicitud...");

  try {
    const response = await fetch("/api/synkro/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No fue posible registrar la solicitud.");
    }

    leadForm.reset();
    updateRoi();
    setMessage("Solicitud registrada. Te contactaremos para validar el caso.", "ok");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});
