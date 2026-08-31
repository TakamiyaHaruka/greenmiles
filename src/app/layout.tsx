import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { UserInitializer } from "@/components/UserInitializer";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GreenMiles - 绿色里程商城",
  description: "用飞行里程兑换绿色商品，为地球减碳",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`h-full antialiased ${notoSansSC.variable}`}>
      <body className="min-h-full flex flex-col">
        <UserInitializer />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
