import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { getSidebarHierarchy } from "@/lib/content/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AWS Solutions Architect Professional Study Companion",
  description: "Comprehensive SAP-C02 certification preparation with AI-powered tutoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Load sidebar hierarchy on server side
  const sidebarHierarchy = getSidebarHierarchy();

  return (
    <html lang="en">
      <body className={inter.className}>
        <AppLayout sidebarHierarchy={sidebarHierarchy}>{children}</AppLayout>
      </body>
    </html>
  );
}
