const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const BUSINESS_TAGS = [
  { aliases: ["restaurante", "restaurantes", "restaurante campestre", "restaurantes campestres"], filters: [{ key: "amenity", value: "restaurant" }] },
  { aliases: ["hotel", "hoteles", "hotel campestre", "hoteles campestres"], filters: [{ key: "tourism", value: "hotel" }, { key: "tourism", value: "guest_house" }] },
  { aliases: ["glamping", "camping", "campamento"], filters: [{ key: "tourism", value: "camp_site" }, { key: "tourism", value: "guest_house" }] },
  { aliases: ["lavanderia", "lavanderias"], filters: [{ key: "shop", value: "laundry" }] },
  { aliases: ["veterinaria", "veterinarias", "veterinario"], filters: [{ key: "amenity", value: "veterinary" }] },
  { aliases: ["cafe", "cafes", "cafeteria", "cafeterias"], filters: [{ key: "amenity", value: "cafe" }] },
  { aliases: ["bar", "bares"], filters: [{ key: "amenity", value: "bar" }] },
  { aliases: ["spa", "spas"], filters: [{ key: "leisure", value: "spa" }] },
  { aliases: ["ferreteria", "ferreterias"], filters: [{ key: "shop", value: "hardware" }] },
  { aliases: ["panaderia", "panaderias"], filters: [{ key: "shop", value: "bakery" }] },
  { aliases: ["supermercado", "supermercados"], filters: [{ key: "shop", value: "supermarket" }] },
  { aliases: ["farmacia", "farmacias", "drogueria", "droguerias"], filters: [{ key: "amenity", value: "pharmacy" }, { key: "shop", value: "chemist" }] }
];

const ACCENT_VARIANTS = {
  a: "[aá]",
  e: "[eé]",
  i: "[ií]",
  o: "[oó]",
  u: "[uúü]",
  n: "[nñ]"
};

export function parseProspectosQuery(query) {
  const limite = Math.min(Number(query.limite || DEFAULT_LIMIT) || DEFAULT_LIMIT, MAX_LIMIT);

  return {
    tipo: String(query.tipo || "").trim(),
    pais: String(query.pais || "Colombia").trim(),
    departamento: String(query.departamento || "").trim(),
    ciudad: String(query.ciudad || "").trim(),
    soloConTelefono: parseBoolean(query.soloConTelefono),
    soloConCorreo: parseBoolean(query.soloConCorreo),
    soloConWeb: parseBoolean(query.soloConWeb),
    limite
  };
}

export function getBusinessTagFilters(tipo) {
  const normalizedType = normalizeText(tipo);
  const match = BUSINESS_TAGS.find((entry) => entry.aliases.some((alias) => normalizeText(alias) === normalizedType));

  if (match) {
    return match.filters;
  }

  return [
    { key: "name", value: tipo, isRegex: true, contains: true, elementTypes: ["node"] },
    { key: "brand", value: tipo, isRegex: true, contains: true, elementTypes: ["node"] },
    { key: "operator", value: tipo, isRegex: true, contains: true, elementTypes: ["node"] }
  ];
}

export function buildOverpassQuery({ tagFilters, limite, bbox }) {
  const filters = tagFilters.map((filter) => buildOverpassFilter(filter, bbox)).join("\n");

  return `
[out:json][timeout:25];
(
${filters}
);
out center qt ${limite};
`.trim();
}

export function buildAddress(tags) {
  const street = tags["addr:street"] || "";
  const houseNumber = tags["addr:housenumber"] || "";
  const city = tags["addr:city"] || "";
  const full = tags["addr:full"] || "";

  if (full) {
    return full;
  }

  return [street, houseNumber, city].filter(Boolean).join(" ").trim();
}

export function normalizeWebsite(value) {
  const website = String(value || "").trim();

  if (!website) {
    return "";
  }

  if (/^https?:\/\//i.test(website)) {
    return website;
  }

  return `https://${website}`;
}

export function normalizeName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function parseCoordinate(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? Number(coordinate.toFixed(7)) : "";
}

export function buildDedupKey({ nombre, ciudad, telefono, latitud, longitud }) {
  const normalizedName = normalizeText(nombre);
  const normalizedCity = normalizeText(ciudad);
  const normalizedPhone = normalizePhone(telefono);
  const coordinateKey = latitud && longitud ? `${latitud},${longitud}` : "";

  return [normalizedName, normalizedCity, normalizedPhone || coordinateKey].join("|");
}

export function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

export function buildExcelFilename({ tipo, departamento, ciudad }) {
  const safeType = normalizeText(tipo).replace(/\s+/g, "-") || "prospectos";
  const safePlace = normalizeText(ciudad || departamento).replace(/\s+/g, "-") || "lugar";
  return `prospectos-${safeType}-${safePlace}.xlsx`;
}

export function applyProspectoFilters(prospectos, query) {
  return prospectos.filter((prospecto) => {
    if (query.soloConTelefono && !prospecto.telefono) {
      return false;
    }

    if (query.soloConWeb && !prospecto.sitio_web) {
      return false;
    }

    if (query.soloConCorreo && (!prospecto.correo || prospecto.correo === "Sin correo")) {
      return false;
    }

    return true;
  });
}

export function buildPlaceQuery({ ciudad, departamento, pais }) {
  return [ciudad, departamento, pais].filter(Boolean).join(", ");
}

function buildOverpassFilter(filter, bbox) {
  const operator = filter.isRegex ? "~" : "=";
  const regexValue = filter.contains ? buildContainsRegex(filter.value) : buildNameRegex(filter.value);
  const value = filter.isRegex ? regexValue : escapeOverpassValue(filter.value);
  const tag = `["${escapeOverpassValue(filter.key)}"${operator}"${value}"${filter.isRegex ? ",i" : ""}]`;
  const areaOrBbox = bbox ? `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})` : "";

  const elementTypes = filter.elementTypes || ["node", "way", "relation"];
  return elementTypes.map((type) => `  ${type}${tag}${areaOrBbox};`).join("\n");
}

function buildNameRegex(value) {
  return escapeRegex(String(value || "").trim())
    .split("")
    .map((char) => ACCENT_VARIANTS[char.toLowerCase()] || char)
    .join("");
}

function buildContainsRegex(value) {
  return buildNameRegex(value).replace(/\s+/g, ".*");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeOverpassValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function parseBoolean(value) {
  return ["1", "true", "si", "sí", "on", "yes"].includes(normalizeText(value));
}
