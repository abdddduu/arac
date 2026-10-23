import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AracKimlik",
  description: "Araçlarınız için dijital kimlik ve QR/NFC vitrin sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
