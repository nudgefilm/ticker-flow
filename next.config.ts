import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 기본 트레일링 슬래시 308 리다이렉트는 middleware보다도 먼저
  // 실행되는 저수준 라우팅 단계에서 발생해 middleware.ts에서 가로챌 수 없다.
  // Resend 등 웹훅 발신자는 3xx를 따라가지 않는 경우가 많아, 웹훅 URL에
  // 트레일링 슬래시가 붙으면(예: /api/webhooks/resend/) www로 정확히
  // 설정해도 계속 실패한다. 이를 막기 위해 기본 리다이렉트를 끄고 아래
  // redirects/rewrites로 직접 재현한다 — /api/webhooks/*는 308 대신
  // rewrite로 통과시키고, 그 외 전체 경로는 기존과 동일하게 308 유지.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: "/:path((?!api/webhooks/).*)/",
        destination: "/:path",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/webhooks/:path*/",
        destination: "/api/webhooks/:path*",
      },
    ];
  },
};

export default nextConfig;
