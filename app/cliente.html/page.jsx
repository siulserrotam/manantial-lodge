import { LegacyPage } from "../_lib/legacyPage";

export const metadata = {
  title: "Mi visita - Campestre finca el Manantial"
};

export default function ClientPage() {
  return <LegacyPage fileName="cliente.html" scriptSrc="/client.js?v=next1" />;
}
