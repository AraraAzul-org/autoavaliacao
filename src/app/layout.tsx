import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autoavaliação de Adultos",
  description: "Autoavaliação dos adultos do grupo escoteiro",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
