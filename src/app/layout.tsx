import type { Metadata } from "next";
import "./globals.css";
import { PrimeiroAcessoGate } from "@/src/components/conta/PrimeiroAcessoGate";

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
        {children}
        {/* Sobreposicao de primeiro acesso: aparece por cima de qualquer
            tela quando o usuario ainda nao definiu senha propria. Fica fora
            do children para nao depender de qual rota esta aberta, e some
            sozinha quando nao ha sessao (ex.: tela de login). */}
        <PrimeiroAcessoGate />
      </body>
    </html>
  );
}
