import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/layout/LayoutWrapper";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketOS — B2B Marketing Platform",
  description: "All-in-One B2B Marketing Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={geist.className}>
      <body style={{ backgroundColor: "#F8FAFC" }}>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
