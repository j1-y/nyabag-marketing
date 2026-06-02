import type { Metadata } from "next";
import Script from "next/script";
import { LandingPage } from "@/app/LandingPage";

export const metadata: Metadata = {
  title: "Nyabag Early Access — Your Second Memory for Design",
  description:
    "Join Nyabag early access, a visual memory system for designers to save, organize, and rediscover websites, screenshots, UI references, color palettes, fonts, and creative inspiration.",
  keywords: [
    "Nyabag",
    "design inspiration",
    "visual memory system",
    "design memory system",
    "visual bookmark manager",
    "bookmark manager for designers",
    "UI inspiration",
    "UX inspiration",
    "website inspiration",
    "design reference library",
    "creative inspiration",
    "color palette organizer",
    "font inspiration",
    "screenshot organizer",
    "creative library",
    "early access design tool",
    "design inspiration memory",
    "design waitlist",
  ],
  alternates: {
    canonical: "https://www.nyabag.com/",
  },
  openGraph: {
    title: "Nyabag Early Access — Your Second Memory for Design",
    description:
      "Join early access to save, organize, and rediscover design inspiration in one searchable visual workspace.",
    url: "https://www.nyabag.com/",
    siteName: "Nyabag",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Nyabag Early Access — Your Second Memory for Design",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nyabag Early Access — Your Second Memory for Design",
    description:
      "Join early access to save, organize, and rediscover design inspiration in one searchable visual workspace.",
    images: ["/opengraph-image.png"],
  },
  metadataBase: new URL("https://www.nyabag.com"),
};

export default function LandingRoute() {
  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-8HCPSGZSPE"
        strategy="afterInteractive"
      />
      <Script id="nyabag-google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-8HCPSGZSPE');
        `}
      </Script>
      <LandingPage />
    </>
  );
}
