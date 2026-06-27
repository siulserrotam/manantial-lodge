import { exportProspectosToExcel } from "./prospectos.export.js";
import { buscarNegocios } from "./prospectos.service.js";
import { buildExcelFilename, parseProspectosQuery } from "./prospectos.utils.js";

export async function buscarProspectos(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ ok: false, message: "Metodo no permitido. Usa GET." });
    return;
  }

  const query = parseProspectosQuery(request.query || {});

  if (!query.tipo || (!query.ciudad && !query.departamento)) {
    response.status(400).json({ ok: false, message: "Faltan los parametros obligatorios tipo y ciudad o departamento." });
    return;
  }

  try {
    const prospectos = await buscarNegocios(query);
    response.status(200).json({
      ok: true,
      total: prospectos.length,
      limite: query.limite,
      prospectos
    });
  } catch (error) {
    const status = error.statusCode || 500;
    response.status(status).json({
      ok: false,
      message: error.publicMessage || "No fue posible buscar prospectos en este momento."
    });
  }
}

export async function exportarProspectos(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ ok: false, message: "Metodo no permitido. Usa GET." });
    return;
  }

  const query = parseProspectosQuery(request.query || {});

  if (!query.tipo || (!query.ciudad && !query.departamento)) {
    response.status(400).json({ ok: false, message: "Faltan los parametros obligatorios tipo y ciudad o departamento." });
    return;
  }

  try {
    const prospectos = await buscarNegocios(query);
    const workbookBuffer = exportProspectosToExcel(prospectos);
    const filename = buildExcelFilename(query);

    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.status(200).send(workbookBuffer);
  } catch (error) {
    const status = error.statusCode || 500;
    response.status(status).json({
      ok: false,
      message: error.publicMessage || "No fue posible exportar prospectos en este momento."
    });
  }
}
