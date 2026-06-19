import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Academic Copilot — Your AI-Powered Study Companion",
  description: "AI-powered study assistant, quiz generator, viva simulator, and collaborative study rooms. Study smarter with Academic Copilot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-screen" style={{ background: '#09090B', color: '#F0F2F5' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}