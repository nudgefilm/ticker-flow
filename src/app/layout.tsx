import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ScrollToTop from "@/components/scroll-to-top";
import TelegramFloatButton from "@/components/telegram-float-button";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "TickerFlow | 미국 주식 모니터링 대시보드",
    template: "%s | TickerFlow",
  },
  description:
    "TickerFlow는 미국 기업의 공시, 뉴스, 실적 일정을 정리해 주요 변화를 모니터링하는 정보 서비스입니다. 투자 자문이나 권유는 제공하지 않습니다.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    url: "https://tickerflow.net",
    title: "TickerFlow | 미국 주식 모니터링 대시보드",
    description:
      "TickerFlow는 미국 기업의 공시, 뉴스, 실적 일정을 정리해 주요 변화를 모니터링하는 정보 서비스입니다. 투자 자문이나 권유는 제공하지 않습니다.",
    siteName: "TickerFlow",
    images: [{ url: "https://tickerflow.net/og-image.jpeg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TickerFlow | 미국 주식 모니터링 대시보드",
    description:
      "TickerFlow는 미국 기업의 공시, 뉴스, 실적 일정을 정리해 주요 변화를 모니터링하는 정보 서비스입니다. 투자 자문이나 권유는 제공하지 않습니다.",
    images: ["https://tickerflow.net/og-image.jpeg"],
  },
  verification: {
    other: {
      "naver-site-verification": "d853939c87fb4bd413a326a490d6516b1ad74931",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} dark`}>
      <body className="min-h-full antialiased">
        <div id="site-content">{children}</div>
        <TelegramFloatButton />
        <ScrollToTop />
      </body>
    </html>
  );
}
