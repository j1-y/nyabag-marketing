import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";



const inter = Inter({
  subsets: ["latin"],
  variable: "--font",
  display: "swap",
});



export const metadata: Metadata = {
  title: "Nyabag — Visual Bookmark Manager",
  description:
    "Nyabag is a visual bookmark manager. Save, organise, and explore your favourite sites with colour palettes, font detection, and live previews.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
