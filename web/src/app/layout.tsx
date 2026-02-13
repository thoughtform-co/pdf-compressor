import type { Metadata } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
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
        className={`font-sans antialiased ${chakraPetch.variable} ${jetbrainsMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
