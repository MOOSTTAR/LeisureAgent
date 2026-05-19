import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProvider } from "@/lib/store/AppContext";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "LeisureAgent - 周末活动规划",
  description: "本地场景短时活动规划与执行 Agent，接受自然语言输入，输出可执行的完整方案。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`h-full antialiased ${geist.variable} ${geistMono.variable}`}>
      <body className="h-full overflow-hidden font-sans">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
