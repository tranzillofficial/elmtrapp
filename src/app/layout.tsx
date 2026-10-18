import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";
export const metadata: Metadata = {
  title: "elmtrapp | سيستم إدارة مكتب المحاماة",
  description:
    "إدارة القضايا والجلسات والعملاء ومستندات مكتب المحاماة في مكان واحد",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "elmtrapp", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c2963c",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
