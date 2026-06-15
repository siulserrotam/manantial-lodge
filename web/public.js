const ads = [
  {
    title: "Almuerzo campestre",
    text: "Promociona aqui combos familiares, platos especiales o eventos del restaurante.",
    action: "Reservar por WhatsApp"
  },
  {
    title: "Pasadia en piscina",
    text: "Espacio ideal para anunciar tarifas de pasadia, horarios y planes para grupos.",
    action: "Consultar disponibilidad"
  },
  {
    title: "Hospedaje en cabanas",
    text: "Publica ofertas de fin de semana, noches romanticas o planes para familias.",
    action: "Pedir informacion"
  },
  {
    title: "Anuncia tu negocio",
    text: "Este espacio puede mostrar aliados locales de forma aleatoria en cada visita.",
    action: "Contactar"
  }
];

function adTemplate(ad) {
  return `
    <p class="ad-label">Publicidad</p>
    <h2>${ad.title}</h2>
    <p>${ad.text}</p>
    <a href="https://wa.me/573507809843" target="_blank" rel="noopener">${ad.action}</a>
  `;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

const selectedAds = shuffle(ads);

document.querySelectorAll("[data-ad-slot]").forEach((slot, index) => {
  slot.innerHTML = adTemplate(selectedAds[index % selectedAds.length]);
});

const eventSlides = [...document.querySelectorAll(".event-slide")];
const eventDots = [...document.querySelectorAll("[data-event-dot]")];
let activeEventSlide = 0;

function showEventSlide(index) {
  if (!eventSlides.length) return;
  activeEventSlide = index % eventSlides.length;
  eventSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === activeEventSlide);
  });
  eventDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === activeEventSlide);
  });
}

eventDots.forEach((dot) => {
  dot.addEventListener("click", () => showEventSlide(Number(dot.dataset.eventDot)));
});

if (eventSlides.length) {
  window.setInterval(() => showEventSlide(activeEventSlide + 1), 5200);
}

const cabinStorageKey = "manantialCabins";
const reservationStorageKey = "manantialReservations";
const accountStorageKey = "manantialOpenAccounts";
const defaultCabins = [
  {
    id: 1,
    name: "Cabana Tipi 101",
    price: 160000,
    status: "Disponible",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
    detail: "Cabana tipi con nevera, desayuno incluido, wifi y parqueadero."
  },
  {
    id: 2,
    name: "Cabana Tipi 102",
    price: 180000,
    status: "Disponible",
    image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=900&q=80",
    detail: "Cabana tipi privada con nevera, desayuno incluido, wifi y parqueadero."
  },
  {
    id: 3,
    name: "Apartaestudio Campestre",
    price: 220000,
    status: "Disponible",
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80",
    detail: "Alojamiento con cocina equipada, wifi y parqueadero."
  },
  {
    id: 4,
    name: "Casa Campestre",
    price: 480000,
    status: "Disponible",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
    detail: "Casa de 3 habitaciones con cocina y zona social."
  },
  {
    id: 5,
    name: "Salon Eventos",
    price: 350000,
    status: "Disponible",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80",
    detail: "Espacio para eventos, reuniones, ferias y fiestas."
  }
];

function load(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || "null") || fallback;
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function cabinIsOpen(cabin, accounts) {
  return accounts.some((account) => account.role === "huesped" && account.cabinId === cabin.id);
}

function cabinImage(cabin) {
  const fallback = defaultCabins.find((item) => item.id === cabin.id);
  return cabin.image || (fallback ? fallback.image : defaultCabins[0].image);
}

function cabinDetail(cabin) {
  const fallback = defaultCabins.find((item) => item.id === cabin.id);
  return cabin.detail || (fallback ? fallback.detail : "Cabana disponible para reserva.");
}

function formatPrice(value) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function leadDaysFor(cabin) {
  const text = `${cabin.name} ${cabin.type || ""}`.toLowerCase();
  return text.includes("casa") || text.includes("salon") || text.includes("evento") ? 7 : 1;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function blockedReservationsFor(cabinId) {
  return load(reservationStorageKey, [])
    .filter((reservation) =>
      Number(reservation.cabinId) === Number(cabinId) &&
      reservation.status !== "Cancelada" &&
      reservation.arrivalDate &&
      reservation.exitDate
    );
}

function selectedDateRangeIsBlocked(cabin, arrivalDate, exitDate) {
  const start = new Date(`${arrivalDate}T00:00:00`);
  const end = new Date(`${exitDate}T00:00:00`);
  return blockedReservationsFor(cabin.id).some((reservation) => {
    const reservedStart = new Date(`${reservation.arrivalDate}T00:00:00`);
    const reservedEnd = new Date(`${reservation.exitDate}T00:00:00`);
    return rangesOverlap(start, end, reservedStart, reservedEnd);
  });
}

function blockedDatesText(cabin) {
  const dates = blockedReservationsFor(cabin.id);
  if (!dates.length) return "Sin fechas bloqueadas.";
  return dates.map((reservation) => `${reservation.arrivalDate} a ${reservation.exitDate}`).join(" | ");
}

function updateReservationCalendar(cabin) {
  const arrival = document.querySelector("#reservation-arrival");
  const exit = document.querySelector("#reservation-exit");
  if (!arrival || !exit) return;

  if (!cabin) {
    arrival.value = "";
    exit.value = "";
    arrival.removeAttribute("min");
    exit.removeAttribute("min");
    return;
  }

  const minArrival = dateKey(addDays(new Date(), leadDaysFor(cabin)));
  arrival.min = minArrival;
  if (!arrival.value || arrival.value < minArrival) {
    arrival.value = minArrival;
  }

  const minExit = dateKey(addDays(new Date(`${arrival.value}T00:00:00`), 1));
  exit.min = minExit;
  if (!exit.value || exit.value <= arrival.value) {
    exit.value = minExit;
  }
}

function selectReservationCabin(cabin) {
  document.querySelector("#reservation-cabin").value = cabin ? cabin.id : "";
  document.querySelector("#reservation-selected-title").textContent = cabin ? cabin.name : "Selecciona una cabana";
  document.querySelector("#reservation-selected-detail").textContent = cabin
    ? `${formatPrice(cabin.price)}. Reserva con ${leadDaysFor(cabin)} dia${leadDaysFor(cabin) === 1 ? "" : "s"} de anticipacion minima. ${cabinDetail(cabin)} Fechas bloqueadas: ${blockedDatesText(cabin)}`
    : "Las cabanas disponibles apareceran a la izquierda.";
  updateReservationCalendar(cabin);

  document.querySelectorAll("[data-reservation-cabin]").forEach((button) => {
    button.classList.toggle("selected", cabin && Number(button.dataset.reservationCabin) === cabin.id);
  });
}

function renderReservationCabins() {
  const container = document.querySelector("#reservation-cabin-cards");
  if (!container) return;

  const storedCabins = load(cabinStorageKey, defaultCabins).map((cabin) => ({ ...cabin }));
  const cabins = [
    ...storedCabins,
    ...defaultCabins.filter((cabin) => !storedCabins.some((stored) => stored.id === cabin.id))
  ];
  const accounts = load(accountStorageKey, []);
  const available = cabins.filter((cabin) => cabin.status === "Disponible" && !cabinIsOpen(cabin, accounts));

  container.innerHTML = available.map((cabin) => `
    <button class="reservation-cabin-card" type="button" data-reservation-cabin="${cabin.id}">
      <img src="${cabinImage(cabin)}" alt="Fotografia de ${cabin.name}">
      <span>
        <strong>${cabin.name}</strong>
        <small>${formatPrice(cabin.price)} por noche</small>
        <em>${cabinDetail(cabin)}</em>
      </span>
    </button>
  `).join("") || '<p class="muted">No hay cabanas disponibles para reservar en este momento.</p>';

  selectReservationCabin(available[0] || null);
}

const reservationForm = document.querySelector("#reservation-form");
if (reservationForm) {
  renderReservationCabins();

  document.querySelector("#reservation-cabin-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-reservation-cabin]");
    if (!button) return;
    const cabins = load(cabinStorageKey, defaultCabins);
    const cabin = cabins.find((item) => item.id === Number(button.dataset.reservationCabin));
    selectReservationCabin(cabin || null);
  });

  document.querySelector("#reservation-arrival").addEventListener("change", () => {
    const cabins = load(cabinStorageKey, defaultCabins);
    const cabin = cabins.find((item) => item.id === Number(document.querySelector("#reservation-cabin").value || 0));
    updateReservationCalendar(cabin || null);
  });

  reservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#reservation-message");
    const cabins = load(cabinStorageKey, defaultCabins);
    const cabinId = Number(document.querySelector("#reservation-cabin").value || 0);
    const cabin = cabins.find((item) => item.id === cabinId);
    if (!cabin) {
      message.textContent = "No hay cabanas disponibles para reservar.";
      message.className = "message error";
      return;
    }

    const arrivalDate = document.querySelector("#reservation-arrival").value;
    const exitDate = document.querySelector("#reservation-exit").value;
    const minArrival = dateKey(addDays(new Date(), leadDaysFor(cabin)));
    if (arrivalDate < minArrival) {
      message.textContent = `Este alojamiento requiere reservar minimo con ${leadDaysFor(cabin)} dia${leadDaysFor(cabin) === 1 ? "" : "s"} de anticipacion.`;
      message.className = "message error";
      return;
    }
    if (!exitDate || exitDate <= arrivalDate) {
      message.textContent = "La fecha de salida debe ser posterior a la fecha de ingreso.";
      message.className = "message error";
      return;
    }
    if (selectedDateRangeIsBlocked(cabin, arrivalDate, exitDate)) {
      message.textContent = "Ese rango de fechas ya esta bloqueado para este alojamiento.";
      message.className = "message error";
      return;
    }

    const reservation = {
      id: Date.now(),
      cabinId,
      cabinName: cabin.name,
      name: document.querySelector("#reservation-name").value.trim(),
      arrivalDate,
      exitDate,
      idNumber: document.querySelector("#reservation-id").value.trim(),
      email: document.querySelector("#reservation-email").value.trim(),
      phone: document.querySelector("#reservation-phone").value.trim(),
      status: "Pendiente",
      createdAt: new Date().toISOString()
    };

    let cloudSaved = false;
    try {
      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservation)
      });
      const result = await response.json();
      cloudSaved = response.ok && result.ok;
    } catch (error) {
      cloudSaved = false;
    }

    const reservations = load(reservationStorageKey, []);
    reservations.push(reservation);
    save(reservationStorageKey, reservations);
    reservationForm.reset();
    renderReservationCabins();
    message.textContent = cloudSaved
      ? "Solicitud registrada. Te contactaremos para confirmar la reserva."
      : "Solicitud registrada en este navegador. Falta configurar Supabase en Vercel para guardarla en la nube.";
    message.className = cloudSaved ? "message ok" : "message";
  });
}
