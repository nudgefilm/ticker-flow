import type { MetadataRoute } from "next";

const baseUrl = "https://tickerflow.net";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // middleware.ts의 PROTECTED_PATHS(로그인 필수 경로)와 동일하게 유지
      disallow: [
        "/dashboard",
        "/news",
        "/earnings",
        "/macro",
        "/watchlist",
        "/stocks",
        "/analysis",
        "/calls",
        "/insider",
        "/sectors",
        "/alerts",
        "/billing",
        "/mypage",
        "/admin",
        "/api",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
