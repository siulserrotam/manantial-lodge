import axios from "axios";
import * as cheerio from "cheerio";
import {
  applyProspectoFilters,
  buildAddress,
  buildDedupKey,
  buildOverpassQuery,
  buildPlaceQuery,
  getBusinessTagFilters,
  normalizeEmail,
  normalizeName,
  normalizeWebsite,
  parseCoordinate,
  uniqueValues
} from "./prospectos.utils.js";

const DEFAULT_OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];
const OVERPASS_URLS = (process.env.OVERPASS_API_URLS || process.env.OVERPASS_API_URL || DEFAULT_OVERPASS_URLS.join(","))
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const NOMINATIM_URL = process.env.NOMINATIM_API_URL || "https://nominatim.openstreetmap.org/search";
const OVERPASS_TIMEOUT_MS = Number(process.env.OVERPASS_TIMEOUT_MS || 25000);
const NOMINATIM_TIMEOUT_MS = Number(process.env.PROSPECTOS_GEOCODE_TIMEOUT_MS || 8000);
const EMAIL_TIMEOUT_MS = Number(process.env.PROSPECTOS_EMAIL_TIMEOUT_MS || 6000);
const MAX_EMAIL_PAGES = 4;
const DEFAULT_USER_AGENT = "StudioManantialProspectos/1.0 (contacto@manantiallodge.com)";

export async function buscarNegocios(query) {
  const tagFilters = getBusinessTagFilters(query.tipo);
  const bbox = await resolveSearchBoundingBox(query);
  const overpassQuery = buildOverpassQuery({
    tagFilters,
    limite: query.limite,
    bbox
  });

  let elements = [];

  elements = await fetchOverpassElements(overpassQuery);

  const prospectos = deduplicateProspectos(
    elements
      .map((element) => normalizeOverpassElement(element, query))
      .filter((prospecto) => prospecto.nombre)
  ).slice(0, query.limite);

  const enrichedProspectos = await enrichWithEmails(prospectos);
  return applyProspectoFilters(enrichedProspectos, query).slice(0, query.limite);
}

async function fetchOverpassElements(overpassQuery) {
  let lastError;

  for (const overpassUrl of OVERPASS_URLS) {
    try {
      const { data } = await axios.post(overpassUrl, new URLSearchParams({ data: overpassQuery }).toString(), {
        timeout: OVERPASS_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          "User-Agent": process.env.PROSPECTOS_USER_AGENT || DEFAULT_USER_AGENT
        }
      });
      return Array.isArray(data?.elements) ? data.elements : [];
    } catch (error) {
      lastError = error;
    }
  }

  const controlledError = new Error(lastError?.message || "Overpass request failed");
  controlledError.statusCode = 502;
  controlledError.publicMessage = "Overpass API no respondio correctamente. Intenta de nuevo en unos minutos.";
  throw controlledError;
}

async function resolveSearchBoundingBox(query) {
  try {
    const { data } = await axios.get(NOMINATIM_URL, {
      timeout: NOMINATIM_TIMEOUT_MS,
      params: {
        q: buildPlaceQuery(query),
        format: "jsonv2",
        limit: 1,
        addressdetails: 1
      },
      headers: {
        "User-Agent": process.env.PROSPECTOS_USER_AGENT || DEFAULT_USER_AGENT
      }
    });

    const firstMatch = Array.isArray(data) ? data[0] : null;
    const boundingBox = firstMatch?.boundingbox;

    if (!Array.isArray(boundingBox) || boundingBox.length !== 4) {
      const notFoundError = new Error("No bounding box found");
      notFoundError.statusCode = 404;
      notFoundError.publicMessage = "No fue posible ubicar la ciudad indicada en OpenStreetMap.";
      throw notFoundError;
    }

    const [south, north, west, east] = boundingBox.map(Number);

    return { south, west, north, east };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const controlledError = new Error(error.message);
    controlledError.statusCode = 502;
    controlledError.publicMessage = "No fue posible ubicar la ciudad indicada para consultar OpenStreetMap.";
    throw controlledError;
  }
}

function normalizeOverpassElement(element, query) {
  const tags = element.tags || {};
  const center = element.center || {};
  const latitud = parseCoordinate(element.lat || center.lat);
  const longitud = parseCoordinate(element.lon || center.lon);
  const website = normalizeWebsite(tags.website || tags["contact:website"] || tags.url);
  const ciudad = tags["addr:city"] || query.ciudad || query.departamento;

  return {
    nombre: normalizeName(tags.name || tags["official_name"] || ""),
    tipo: query.tipo,
    pais: query.pais,
    departamento: query.departamento,
    ciudad,
    direccion: buildAddress(tags),
    telefono: tags.phone || tags["contact:phone"] || tags.mobile || tags["contact:mobile"] || "",
    sitio_web: website,
    correo: website ? "" : "",
    latitud,
    longitud,
    fuente: "OpenStreetMap / Overpass API",
    estado_comercial: "Pendiente",
    _dedupKey: buildDedupKey({
      nombre: tags.name || tags["official_name"] || "",
      ciudad,
      telefono: tags.phone || tags["contact:phone"] || tags.mobile || "",
      latitud,
      longitud
    })
  };
}

function deduplicateProspectos(prospectos) {
  const seen = new Set();
  const uniqueProspectos = [];

  for (const prospecto of prospectos) {
    if (!prospecto._dedupKey || seen.has(prospecto._dedupKey)) {
      continue;
    }

    seen.add(prospecto._dedupKey);
    const { _dedupKey, ...publicProspecto } = prospecto;
    uniqueProspectos.push(publicProspecto);
  }

  return uniqueProspectos;
}

async function enrichWithEmails(prospectos) {
  const enriched = [];

  for (const prospecto of prospectos) {
    if (!prospecto.sitio_web) {
      enriched.push({ ...prospecto, correo: "" });
      continue;
    }

    const emails = await findPublicEmails(prospecto.sitio_web);
    enriched.push({
      ...prospecto,
      correo: emails.length > 0 ? emails.join(", ") : "Sin correo"
    });
  }

  return enriched;
}

async function findPublicEmails(website) {
  const urls = buildEmailSearchUrls(website);
  const foundEmails = [];

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, {
        timeout: EMAIL_TIMEOUT_MS,
        maxRedirects: 3,
        headers: {
          "User-Agent": process.env.PROSPECTOS_USER_AGENT || DEFAULT_USER_AGENT
        }
      });

      const $ = cheerio.load(data);
      const pageText = $("body").text();
      foundEmails.push(...extractEmails(pageText));
      foundEmails.push(...extractEmails($.html() || ""));
    } catch (error) {
      continue;
    }

    if (foundEmails.length > 0) {
      break;
    }
  }

  return uniqueValues(foundEmails.map(normalizeEmail).filter(Boolean));
}

function buildEmailSearchUrls(website) {
  let baseUrl;

  try {
    baseUrl = new URL(website);
  } catch (error) {
    return [];
  }

  const base = `${baseUrl.protocol}//${baseUrl.host}`;

  return uniqueValues([
    base,
    `${base}/contacto`,
    `${base}/contact`,
    `${base}/reservas`
  ]).slice(0, MAX_EMAIL_PAGES);
}

function extractEmails(text) {
  const matches = String(text || "").match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return matches || [];
}
