import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "JUKO_FACT";

export const metadata: Metadata = {
  title: `${APP_NAME} — Facturación Electrónica SRI`,
  description: "Sistema de Facturación Electrónica según normativa SRI Ecuador",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
