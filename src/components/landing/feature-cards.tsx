import {
  IconFileSearch,
  IconMicrophone2,
  IconUserDollar,
  IconLayoutGrid,
  IconChartLine,
  IconGridDots,
  IconEye,
  type Icon as TablerIcon,
} from "@tabler/icons-react";

interface FeatureItem {
  icon: TablerIcon;
  title: string;
  desc: string;
  pro?: boolean;
}

const FEATURES: FeatureItem[] = [
  { icon: IconFileSearch, title: "공시 인사이트", desc: "최근 공시와 기업 변화를 빠르게 확인", pro: true },
  { icon: IconMicrophone2, title: "어닝콜 요약", desc: "긴 컨퍼런스콜을 핵심만 한국어로", pro: true },
  { icon: IconUserDollar, title: "내부자 거래", desc: "경영진의 실제 매수·매도 내역 확인", pro: true },
  { icon: IconLayoutGrid, title: "종목 스냅샷", desc: "기업 정보를 한 페이지에서" },
  { icon: IconChartLine, title: "경제지표", desc: "미국 거시경제 흐름 모니터링" },
  { icon: IconGridDots, title: "섹터 히트맵", desc: "최근 활동이 많은 섹터를 한눈에" },
  { icon: IconEye, title: "와치리스트", desc: "관심 종목의 변화를 자동으로 추적", pro: true },
];

export default function FeatureCards() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">필요한 정보를 한 곳에서</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc, pro }, i) => (
          <div
            key={title}
            className={`flex flex-col gap-3 rounded-lg border border-border bg-card p-5 ${
              i === FEATURES.length - 1 ? "col-span-2 lg:col-span-1" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon size={22} stroke={1.6} className="text-blue-400" />
              {pro && (
                <span className="rounded-[4px] bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                  Pro
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
