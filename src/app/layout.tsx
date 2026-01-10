import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { getSidebarHierarchy } from "@/lib/content/sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppLayout sidebarHierarchy={sidebarHierarchy}>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
