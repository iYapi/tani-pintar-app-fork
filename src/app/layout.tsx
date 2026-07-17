import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tani Pintar — Keputusan Cerdas Hasil Panen Maksimal",
  description: "Platform kecerdasan keputusan panen dan pasar untuk petani kecil di Indonesia.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tani Pintar",
  },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-gradient-to-br from-[#e6ede9] via-[#f4f7f5] to-[#dfeae3] flex justify-center items-start min-h-screen`}>
        <Providers>
          <div className="w-full max-w-[480px] min-h-screen bg-background text-foreground shadow-[0_0_50px_rgba(15,80,45,0.08)] relative flex flex-col border-x border-border/10">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
