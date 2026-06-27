import { IconCheck } from "@tabler/icons-react";
import StartButton from "@/components/landing/start-button";

const FREE_FEATURES = ["공시 피드", "뉴스 피드", "경제지표", "섹터 히트맵", "종목 스냅샷"];
const PRO_FEATURES = ["어닝콜 한국어 요약", "공시 인사이트", "내부자 거래", "와치리스트", "개인 모니터링"];

function FeatureList({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconCheck
            size={16}
            stroke={2}
            className={accent ? "text-blue-400" : "text-muted-foreground"}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-2xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">합리적인 가격</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-xl border border-border bg-muted/30 p-6">
          <p className="text-sm font-medium text-muted-foreground">Free</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">무료</p>
          <p className="mt-1 text-xs text-muted-foreground">주요 기능 무료 제공</p>
          <div className="my-6 flex-1">
            <FeatureList items={FREE_FEATURES} />
          </div>
          <StartButton label="시작하기" variant="outline" className="w-full" />
        </div>

        {/* Pro */}
        <div className="flex flex-col rounded-xl border border-blue-500/40 bg-blue-500/[0.04] p-6">
          <p className="text-sm font-medium text-blue-400">Pro</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            14,900원<span className="text-sm font-normal text-muted-foreground"> / 월</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Free의 모든 기능 포함</p>
          <div className="my-6 flex-1">
            <FeatureList items={PRO_FEATURES} accent />
          </div>
          <StartButton label="Pro 시작하기" className="w-full" />
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">연간 결제 시 2개월 무료</p>
    </section>
  );
}
