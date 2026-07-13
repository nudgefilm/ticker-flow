import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import ScrollToTop from "@/components/scroll-to-top";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// 히어로 파티클 캔버스(TickerFlow 워드마크)와 LIVE 위젯 전용 — 사이트 전역
// --font-sans/--font-mono 매핑은 그대로 두고 이 두 폰트만 별도 CSS 변수로
// 병행 추가한다(globals.css의 --font-widget-mono 참고).
const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-chakra-petch",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "TickerFlow | 미국 주식 모니터링 대시보드",
    template: "%s | TickerFlow",
  },
  description:
    "미국 기업의 공시·뉴스·실적 일정을 한눈에 모니터링하는 정보 서비스, TickerFlow. 투자 자문이나 권유는 제공하지 않습니다.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "https://tickerflow.net",
    title: "TickerFlow | 미국 주식 모니터링 대시보드",
    description:
      "미국 기업의 공시·뉴스·실적 일정을 한눈에 모니터링하는 정보 서비스, TickerFlow. 투자 자문이나 권유는 제공하지 않습니다.",
    siteName: "TickerFlow",
    images: [{ url: "https://tickerflow.net/og-image.jpeg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TickerFlow | 미국 주식 모니터링 대시보드",
    description:
      "미국 기업의 공시·뉴스·실적 일정을 한눈에 모니터링하는 정보 서비스, TickerFlow. 투자 자문이나 권유는 제공하지 않습니다.",
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
    <html lang="ko" className={`${inter.variable} ${chakraPetch.variable} ${ibmPlexMono.variable} dark`}>
      <body className="min-h-full antialiased">
        <div id="site-content">{children}</div>
        <ScrollToTop />
      </body>
    </html>
  );
}
