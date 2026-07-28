import type { Metadata, Viewport } from "next";
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
  // Absolute URLs for social/link-preview tags. Set NEXT_PUBLIC_SITE_URL in
  // production so previews don't resolve against localhost.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Pure Eight — Franchise Management",
    // Child routes set only their own title; the brand is appended here.
    template: "%s · Pure Eight",
  },
  description: "Premium business management platform for franchise networks",
  applicationName: "Pure Eight",
  // Icons themselves come from the app/icon.svg and app/apple-icon.tsx
  // file conventions — Next injects the <link> tags automatically.
  appleWebApp: {
    title: "Pure Eight",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Pure Eight — Franchise Management",
    description: "Premium business management platform for franchise networks",
    siteName: "Pure Eight",
    type: "website",
  },
};

// Colours the browser UI (mobile address bar) to match the monochrome brand.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
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
