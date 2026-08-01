import type { Metadata } from "next";
import { Inter, Oswald, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BUSINESS, getLocalBusinessJsonLd } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-url";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${BUSINESS.name} | Mechanic in Sunshine North, VIC`,
    template: `%s | ${BUSINESS.name}`,
  },
  description:
    `${BUSINESS.name} is an independent mechanic in Sunshine North, with car service, logbook service and roadworthy inspections for Melbourne's western suburbs.`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = getLocalBusinessJsonLd(getSiteUrl());

  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable} ${plexMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
