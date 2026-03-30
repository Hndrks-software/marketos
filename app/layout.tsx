import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

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
        <Sidebar />
        <div className="ml-60 min-h-screen flex flex-col">
          <TopBar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
