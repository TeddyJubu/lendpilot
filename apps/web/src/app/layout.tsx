import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Sidebar } from "@/components/shell/sidebar";
import { CommandBar } from "@/components/shell/command-bar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LoanPilot",
  description: "AI-Native Mortgage Broker CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground font-sans">
        <ConvexClientProvider>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
          <CommandBar />
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
