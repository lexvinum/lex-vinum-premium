import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import { Playfair_Display, Inter } from "next/font/google";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Lex Vinum Premium",
  description:
    "Répertoire intelligent, scan de cartes des vins et recommandation premium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body className={`${display.variable} ${bodyFont.variable}`}>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}