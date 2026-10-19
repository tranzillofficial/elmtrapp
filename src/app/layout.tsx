import { PwaBootstrap } from "@/components/install";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";
export const metadata: Metadata = {
  title: "Elmtr App | سيستم إدارة مكتب المحاماة",
  description:
    "إدارة القضايا والجلسات والعملاء ومستندات مكتب المحاماة في مكان واحد",
  icons: {
    icon: [
      { url: "/elmtr-icon-32-v2.png", sizes: "32x32", type: "image/png" },
      { url: "/elmtr-icon-192-v2.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/elmtr-icon-180-v2.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Elmtr App", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#087f8c",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <PwaBootstrap />
        {children}
      </body>
    </html>
  );
}
