"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { CompanyTicker } from "@/components/company-ticker";

// react-simple-maps는 서버/클라이언트 렌더링 간 마커 좌표에 부동소수점
// 오차가 생겨 하이드레이션 경고를 유발하므로 클라이언트 전용으로 로드한다.
const UsGhostMap = dynamic(
  () => import("@/components/us-ghost-map").then((mod) => mod.UsGhostMap),
  { ssr: false }
);

export function CtaCard() {
  return (
    <section className="w-full max-w-6xl mx-auto">
      <div className="relative aspect-[3.4/1] w-full overflow-hidden rounded-3xl bg-[#111111]">
        {/* 배경 반투명 지도 (우측, 상하 꽉 참) */}
        <UsGhostMap className="pointer-events-none absolute -inset-y-4 right-[8%] flex w-[58%] items-center justify-center opacity-90" />

        {/* 우측 세로 흐름 티커 */}
        <CompanyTicker className="absolute inset-y-0 right-6 z-10 w-28 md:right-10 md:w-32" />

        {/* 좌측 가독성용 그라디언트 */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#111111] from-30% via-[#111111]/40 via-55% to-transparent" />

        {/* 좌측 2/5 텍스트 */}
        <div className="relative z-10 flex h-full w-full flex-col justify-center px-8 md:px-12">
          <div className="w-full max-w-[40%] min-w-[16rem] [word-break:keep-all]">
            <h2 className="text-balance text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
              미국 기업의 변화를
              <br />
              가장 빠르게 확인해 보세요.
            </h2>
            <p className="mt-4 text-pretty text-sm text-white/60 md:text-base">
              공시부터 어닝콜까지, 하나의 화면에서 모니터링할 수 있습니다.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-[#111111] transition-colors hover:bg-white/90"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
