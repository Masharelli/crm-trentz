import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trentz CRM",
  description: "CRM interno para clientes, pagos, documentos y recordatorios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
