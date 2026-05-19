import type { Metadata } from "next";
import { AppProvider } from "@/lib/store/AppContext";
import "./globals.css";

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
    <html lang="zh-CN" className="h-full antialiased">
      <body className="h-full overflow-hidden">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
