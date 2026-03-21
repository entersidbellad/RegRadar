import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { LayoutDashboard, Bell, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="flex w-60 flex-col border-r bg-muted/40">
            {/* Logo */}
            <div className="flex h-14 items-center gap-2 border-b px-4">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold tracking-tight">
                RegRadar
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-3">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/alerts"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                Alerts
              </Link>
            </nav>

            {/* Footer */}
            <div className="border-t p-4">
              <Separator className="mb-3" />
              <p className="text-xs text-muted-foreground">
                NC CAFO Compliance Monitor
              </p>
              <p className="text-xs text-muted-foreground">
                Duplin &amp; Sampson Counties
              </p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
