import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NBA Trade Tree | Trace Any Player's Origin",
  description: "Interactive visualization of NBA trade chains. See how any player ended up on their current roster through trades, picks, and transactions.",
  keywords: ["NBA", "trade", "basketball", "visualization", "Jayson Tatum", "trade tree"],
  openGraph: {
    title: "NBA Trade Tree",
    description: "Every player has an origin story. Trace the chain of trades that built championship rosters.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
