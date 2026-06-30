import type { InsiderSummary, EarningsRow } from "@/lib/insights/types";
import { SectionCard } from "./ui";

function fmtEps(n: number): string {
  if (n < 0) return `-$${Math.abs(n).toFixed(2)}`;
  return `$${n.toFixed(2)}`;
}

interface Summary {
  filings: number;
  keyEvents: number;
  insiderTrades: number;
  news: number;
  earnings: number;
}

interface Props {
  summary: Summary;
  insider: InsiderSummary;
  latestEarnings?: EarningsRow;
}

export default function ChangeSummary({ summary, insider, latestEarnings }: Props) {
  const bullets: string[] = [];

  if (summary.filings > 0) {
    bullets.push(`최근 30일 공시 ${summary.filings}건이 접수되었습니다.`);
    if (summary.keyEvents > 0) {
      bullets.push(`이 중 주요 변화 관련 공시 ${summary.keyEvents}건이 포함되었습니다.`);
    }
  } else {
    bullets.push("최근 30일 접수된 공시가 없습니다.");
  }

  if (insider.buyCount > 0 || insider.sellCount > 0) {
    bullets.push(
      `최근 180일 내부자 매수 ${insider.buyCount}건, 매도 ${insider.sellCount}건으로 집계되었습니다.`
    );
    bullets.push(`총 거래 규모 ${insider.totalVolume}이 기록되었습니다.`);
  } else {
    bullets.push("최근 180일 내부자 거래 내역이 없습니다.");
  }

  if (summary.news > 0) {
    bullets.push(`최근 90일 관련 뉴스 ${summary.news}건이 수집되었습니다.`);
  } else {
    bullets.push("최근 90일 수집된 관련 뉴스가 없습니다.");
  }

  if (latestEarnings && latestEarnings.epsActual !== null) {
    const eps = fmtEps(latestEarnings.epsActual);
    const est =
      latestEarnings.epsEstimate !== null ? fmtEps(latestEarnings.epsEstimate) : "—";
    bullets.push(`${latestEarnings.quarter} EPS ${eps} (예상치 ${est})로 집계되었습니다.`);
  }

  return (
    <SectionCard
      title="최근 주요 변화"
      description="30일 공시 · 90일 뉴스 · 180일 내부자 거래 집계"
    >
      <ul className="space-y-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#60a5fa]" />
            <p className="text-sm leading-relaxed text-[#cccccc]">{b}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
