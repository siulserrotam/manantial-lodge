import xlsx from "xlsx";

const HEADERS = [
  "nombre",
  "tipo",
  "pais",
  "departamento",
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

export function exportProspectosToExcel(prospectos) {
  const rows = prospectos.map((prospecto) => ({
    nombre: prospecto.nombre,
    tipo: prospecto.tipo,
    pais: prospecto.pais,
    departamento: prospecto.departamento,
    ciudad: prospecto.ciudad,
    direccion: prospecto.direccion,
    telefono: prospecto.telefono,
    sitio_web: prospecto.sitio_web,
    correo: prospecto.correo,
    latitud: prospecto.latitud,
    longitud: prospecto.longitud,
    fuente: prospecto.fuente,
    estado_comercial: prospecto.estado_comercial
  }));

  const worksheet = xlsx.utils.json_to_sheet(rows, { header: HEADERS });
  worksheet["!cols"] = HEADERS.map((header) => ({ wch: Math.max(header.length + 4, 18) }));

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Prospectos");

  return xlsx.write(workbook, {
    type: "buffer",
    bookType: "xlsx"
  });
}
