export const metadata = {
  title: "Campestre finca el Manantial",
  description: "Restaurante campestre, pasadia en piscina y hospedaje en cabanas."
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
