import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import SidebarNav from "@/components/sidebar-nav";
import TopBar from "@/components/top-bar";
import { TourProvider } from "@/components/tour";
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
        <TourProvider>
          <div className="flex h-screen">
            <SidebarNav />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </div>
          <Toaster />
        </TourProvider>
      </body>
    </html>
  );
}
