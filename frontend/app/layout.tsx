import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import SidebarNav from "@/components/sidebar-nav";
import CommandSearch from "@/components/command-search";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "RegRadar - Environmental Compliance Monitoring",
  description:
    "AI-powered environmental compliance monitoring for NC hog farm CAFOs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={dmSans.className}>
        <div className="flex h-screen">
          <SidebarNav />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <CommandSearch />
        <Toaster />
      </body>
    </html>
  );
}
