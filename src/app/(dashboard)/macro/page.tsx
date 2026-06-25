import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function MacroSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-[6px] border border-white/[0.08] bg-[#111111]"
        />
      ))}
    </div>
  );
}

interface IndicatorMeta {
  unit: string;
  desc: string;
  valueType?: "pct_change" | "million_to_eok" | "billion_to_jo_eok";
}

const INDICATOR_META: Record<string, IndicatorMeta> = {
  "10년물 국채금리": {
    unit: "%",
    desc: "미국 장기 채권 금리. 금리가 오르면 주식시장에 부담이 될 수 있습니다.",
  },
  CPI: {
    unit: "%",
    desc: "소비자물가지수. 인플레이션(물가 상승) 수준을 나타냅니다.",
    valueType: "pct_change",
  },
  실업률: {
    unit: "%",
    desc: "미국 실업률. 낮을수록 고용 시장이 건강한 상태입니다.",
  },
  기준금리: {
    unit: "%",
    desc: "미국 연준(Fed)의 기준금리. 모든 금리의 기준이 됩니다.",
  },
  소매판매: {
    unit: "",
    desc: "미국 소비자 지출 규모. 경기 흐름을 파악하는 데 활용됩니다.",
    valueType: "million_to_eok",
  },
  GDP: {
    unit: "",
    desc: "미국 국내총생산. 경제 전체 규모를 나타냅니다.",
    valueType: "billion_to_jo_eok",
  },
};

// 백만 달러 → 억 달러 (÷100, 반올림)
function fmtMillionToEok(v: number): string {
  const eok = Math.round(v / 100);
  return `${eok.toLocaleString("ko-KR")}억 달러`;
}

// 십억 달러 → X조 Y,ZZZ억 달러
function fmtBillionToJoEok(v: number): string {
  const jo = Math.floor(v / 1000);
  const eok = Math.round((v % 1000) * 10);
  if (jo === 0) return `${eok.toLocaleString("ko-KR")}억 달러`;
  return `${jo}조 ${eok.toLocaleString("ko-KR")}억 달러`;
}

function formatMainValue(
  name: string,
  value: number | null,
  prevValue: number | null
): string {
  const meta = INDICATOR_META[name];
  if (value == null) return "—";

  if (meta?.valueType === "pct_change") {
    if (prevValue == null) return "—";
    const change = ((value - prevValue) / prevValue) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  }
  if (meta?.valueType === "million_to_eok") return fmtMillionToEok(value);
  if (meta?.valueType === "billion_to_jo_eok") return fmtBillionToJoEok(value);

  const formatted = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (meta?.unit === "%") return `${formatted}%`;
  if (meta?.unit) return `${formatted} ${meta.unit}`;
  return formatted;
}

function formatPrevValue(name: string, prevValue: number | null): string {
  if (prevValue == null) return "—";
  const meta = INDICATOR_META[name];
  if (meta?.valueType === "pct_change") {
    return prevValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (meta?.valueType === "million_to_eok") return fmtMillionToEok(prevValue);
  if (meta?.valueType === "billion_to_jo_eok") return fmtBillionToJoEok(prevValue);
  const formatted = prevValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (meta?.unit === "%") return `${formatted}%`;
  if (meta?.unit) return `${formatted} ${meta.unit}`;
  return formatted;
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

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {indicators.map((item) => {
        const meta = INDICATOR_META[item.indicator_name];
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.indicator_name}</p>
                {meta?.desc && (
                  <p className="mt-0.5 text-xs leading-relaxed text-[#a6a6a6]">{meta.desc}</p>
                )}
              </div>
              {item.source && (
                <span className="mt-0.5 shrink-0 rounded-[4px] bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#a6a6a6]">
                  {item.source}
                </span>
              )}
            </div>

            {/* 현재값 */}
            <p className="text-2xl font-semibold tabular-nums text-white">
              {formatMainValue(item.indicator_name, item.value, item.previous_value)}
            </p>

            {/* 이전값 + 발표일 */}
            <div className="flex items-center justify-between text-xs text-[#a6a6a6]">
              <span>이전 {formatPrevValue(item.indicator_name, item.previous_value)}</span>
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
