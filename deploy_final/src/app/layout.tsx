import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Pharmanalytics Pro",
  description: "Pharmaceutical Insights & AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${outfit.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
