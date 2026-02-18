import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "RosterDNA | How Was Your Team Built?",
    template: "%s | RosterDNA",
  },
  description: "Interactive visualization of NBA trade chains. Trace how every player ended up on their current roster through trades, draft picks, and free agency.",
  keywords: ["NBA", "trade", "basketball", "visualization", "RosterDNA", "trade tree", "roster", "acquisition", "draft picks"],
  metadataBase: new URL("https://rosterdna.vercel.app"),
  openGraph: {
    title: "RosterDNA — How Was Your Team Built?",
    description: "Every roster tells a story. Trace the chain of trades, picks, and signings that built every NBA team.",
    type: "website",
    siteName: "RosterDNA",
    images: ["/api/card/stat?title=How%20Was%20Your%20Team%20Built%3F&value=30%20Teams&subtitle=Every%20trade%2C%20every%20pick%2C%20every%20signing%20%E2%80%94%20visualized"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RosterDNA — How Was Your Team Built?",
    description: "Trace the chain of trades that built every NBA roster.",
    creator: "@RosterDNA",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}
