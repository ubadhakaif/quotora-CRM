import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const googleSans = localFont({
  src: [
    {
      path: "../fonts/GoogleSans-VariableFont_GRAD,opsz,wght.ttf",
      style: "normal",
    },
  ],
  variable: "--font-google-sans",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Quotora — Dealership Quotation Platform",
  description:
    "Multi-tenant quotation management for automobile dealerships. Build, manage, and export vehicle quotations seamlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${googleSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
