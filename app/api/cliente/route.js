import { json, supabaseRequest } from "../../_lib/supabase";

const defaultProducts = [
  { id: "sancocho-campestre", name: "Sancocho campestre", type: "restaurante", price: 28000, image: "" },
  { id: "trucha-patacon", name: "Trucha con patacon", type: "restaurante", price: 32000, image: "" },
  { id: "limonada-natural", name: "Limonada natural", type: "bar", price: 8000, image: "" },
  { id: "cerveza-nacional", name: "Cerveza nacional", type: "bar", price: 7000, image: "" }
];

function productImage(product) {
  if (product.imagen) return product.imagen;
  if (product.categoria === "bar") {
    return "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=500&q=80";
  }
  return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get("visita") || "").trim();

  if (!token) {
    return json({ ok: false, message: "Falta token de visita." }, 400);
  }

  try {
    const clients = await supabaseRequest(`clientes?qr_token=eq.${encodeURIComponent(token)}&estado=eq.abierta&select=*`);
    const cliente = clients[0];
    if (!cliente) {
      return json({ ok: false, message: "QR no disponible." }, 404);
    }

    const products = await supabaseRequest("productos?activo=eq.true&select=id,nombre,categoria,precio,imagen,cantidad_inventario,inventario(id,nombre,cantidad,unidad)");
    const availableProducts = products
      .filter((product) => {
        const stock = Array.isArray(product.inventario) ? product.inventario[0] : product.inventario;
        return stock && Number(stock.cantidad || 0) >= Number(product.cantidad_inventario || 1);
      })
      .map((product) => ({
        id: product.id,
        name: product.nombre,
        type: product.categoria,
        price: Number(product.precio || 0),
        image: productImage(product)
      }));

    return json({
      ok: true,
      account: {
        id: cliente.id,
        qrToken: cliente.qr_token,
        customer: cliente.nombre,
        role: cliente.rol,
        cabinName: cliente.alojamiento_nombre || ""
      },
      products: availableProducts.length ? availableProducts : defaultProducts
    });
  } catch (error) {
    return json({ ok: false, message: error.message }, 500);
  }
}
