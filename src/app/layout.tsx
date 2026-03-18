import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safekeep CRM",
  description: "Insurance Broker CRM – MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
