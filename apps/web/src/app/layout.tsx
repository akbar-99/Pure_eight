import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ReactQueryProvider } from "@/lib/context/query-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Pure Eight — Franchise Management",
  description: "Premium business management platform for franchise networks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} antialiased`}
        style={{
          fontFamily: "var(--font-inter, Inter, system-ui, sans-serif)",
        }}
      >
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#000000",
              color: "#FFFFFF",
              border: "none",
              fontFamily: "var(--font-inter, Inter, sans-serif)",
            },
          }}
        />
      </body>
    </html>
  );
}
