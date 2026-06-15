import { LegacyPage } from "../_lib/legacyPage";

export const metadata = {
  title: "Funcionarios - Finca Campestre"
};

export default function AdminPage() {
  return <LegacyPage fileName="admin.html" scriptSrc="/app.js?v=next1" />;
}
