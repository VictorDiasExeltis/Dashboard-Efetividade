import type { Metadata } from "next";
import "./globals.css";
import { Layout } from "@/src/components/layout/Layout";

export const metadata: Metadata = {
  title: "SFE Dashboard",
  description: "Dashboard de Efetividade de Força de Vendas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="light">
      <body className="antialiased font-sans">
        <Layout>
          {children}
        </Layout>
      </body>
    </html>
  );
}
