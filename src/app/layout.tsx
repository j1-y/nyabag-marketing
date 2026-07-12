import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";



const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});



export const metadata: Metadata = {
  metadataBase: new URL("https://www.nyabag.com"),
  title: "Nyabag - Your Second Memory for Design",
  description: "Nyabag is a visual memory system for designers to save, organize, and rediscover websites, screenshots, UI references, color palettes, fonts, and creative inspiration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={`${inter.variable} ${bricolageGrotesque.variable}`}>
        {children}
      </body>
    </html>
  );
}
