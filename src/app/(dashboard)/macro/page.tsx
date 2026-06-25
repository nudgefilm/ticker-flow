import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function MacroSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-[6px] border border-white/[0.08] bg-[#111111]"
        />
      ))}
    </div>
  );
}

async function MacroIndicatorList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("macro_indicators")
    .select("indicator_name, value, previous_value, released_at, source")
    .order("released_at", { ascending: false })
    .limit(50);

  if (error) {
    return <p className="text-sm text-red-400">데이터를 불러오지 못했습니다.</p>;
  }

  // indicator_name 기준 최신 1건만 유지
  const seen = new Set<string>();
  const indicators = (data ?? []).filter((row) => {
    if (seen.has(row.indicator_name)) return false;
    seen.add(row.indicator_name);
    return true;
  });

  if (indicators.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-[#a6a6a6]">수집된 경제지표 데이터가 없습니다.</p>
        <p className="text-xs text-[#555555]">어드민에서 경제지표 갱신을 실행해 주세요.</p>
      </div>
    );
  }

  function fmtValue(v: number | null): string {
    if (v == null) return "—";
    return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {indicators.map((item) => {
        const releasedDate = new Date(item.released_at).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return (
          <div
            key={item.indicator_name}
            className="flex flex-col gap-3 rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-4"
          >
            {/* 지표명 + 출처 배지 */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{item.indicator_name}</p>
              {item.source && (
                <span className="shrink-0 rounded-[4px] bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#a6a6a6]">
                  {item.source}
                </span>
              )}
            </div>

            {/* 현재값 */}
            <p className="text-2xl font-semibold tabular-nums text-white">
              {fmtValue(item.value)}
            </p>

            {/* 이전값 + 발표일 */}
            <div className="flex items-center justify-between text-xs text-[#a6a6a6]">
              <span>이전 {fmtValue(item.previous_value)}</span>
              <span>{releasedDate}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MacroPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="경제지표" />

      <div className="mt-6">
        <Suspense fallback={<MacroSkeleton />}>
          <MacroIndicatorList />
        </Suspense>
      </div>

      <p className="mt-6 text-xs text-[#a6a6a6]">
        출처: FRED (미국 연방준비제도). 데이터는 매일 09:13 KST 기준으로 갱신됩니다.
      </p>

      <footer className="mt-6 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
