import type { Metadata } from "next";
import { PT_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const ptMono = PT_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Angstrom",
  description: "Compress PDFs to the atomic level.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`font-sans antialiased ${ptMono.variable} ${ibmPlexSans.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
