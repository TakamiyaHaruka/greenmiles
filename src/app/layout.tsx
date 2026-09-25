import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import Script from "next/script";
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

const appearanceInitScript = `
  try {
    var mode = localStorage.getItem('greenmiles-appearance');
    document.documentElement.dataset.glassMode = mode === 'standard' ? 'standard' : 'glass';
  } catch (error) {
    document.documentElement.dataset.glassMode = 'glass';
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`h-full antialiased ${notoSansSC.variable}`}
      data-glass-mode="glass"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <UserInitializer />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Toaster
          position="top-center"
          richColors
          offset={{ top: 72 }}
          containerAriaLabel="通知"
          toastOptions={{
            className: 'journey-toast',
            closeButtonAriaLabel: '关闭通知',
          }}
        />
        <Script id="greenmiles-appearance" strategy="beforeInteractive">
          {appearanceInitScript}
        </Script>
      </body>
    </html>
  );
}
