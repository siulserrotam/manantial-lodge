import { buscarProspectos, exportarProspectos } from "./prospectos.controller.js";

export const prospectosRoutes = {
  buscar: buscarProspectos,
  exportar: exportarProspectos
};
