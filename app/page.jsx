import { LegacyPage } from "./_lib/legacyPage";

export const metadata = {
  title: "Campestre finca el Manantial | Restaurante, piscina y cabanas",
  description: "Campestre finca el Manantial ofrece restaurante campestre, pasadia en piscina y hospedaje en cabanas para familias y visitantes.",
  keywords: ["Campestre finca el Manantial", "finca campestre", "restaurante campestre", "piscina", "pasadia", "hospedaje", "cabanas"],
  openGraph: {
    title: "Campestre finca el Manantial",
    description: "Restaurante campestre, pasadia en piscina y hospedaje en cabanas.",
    type: "website",
    locale: "es_CO",
    url: "https://manantiallodge.com/"
  }
};

export default function HomePage() {
  return <LegacyPage fileName="index.html" scriptSrc="/public.js?v=next1" />;
}
