import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Renew CRM",
  description: "CRM för försäkringsmäklare – MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
