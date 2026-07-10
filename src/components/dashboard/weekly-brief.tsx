import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";
import { getLatestWeeklyBrief } from "@/lib/watchlist-brief";
import { BriefAccordion } from "./brief-accordion";
import {
  BriefCard,
  BriefCompanyList,
  BriefChangeBadges,
  BriefPeriodChange,
  BriefSectorList,
  BriefFilingList,
  BriefEarningsList,
  BriefSummaryText,
} from "./brief-sections";

const WEEKLY_ACCENT = "#60a5fa";
const WEEKLY_HEADER_BG = "bg-blue-500/[0.05]";

// 2026-07-11: "TOP10"/"TOP30 진입" 표현 제거(세션97 규제 리스크 점검) —
// TickerFlow 자체 스코어링 기반 순위·선정 결과를 노출하지 않도록 문구를 정리.
const WEEKLY_SECTION_TITLES = [
  "이번 주 활동이 많았던 기업",
  "이번 주 시장 요약",
  "이번 주 시장 변화",
  "이번 주 새로 활동이 확인된 기업",
  "지난주 대비 변화",
  "이번 주 섹터 동향",
  "이번 주 주요 공시",
  "이번 주 실적 하이라이트",
];

function WeeklyBriefLocked() {
  return (
    <BriefCard title="주간 BRIEF">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-[4px] bg-[#3b82f6] px-1.5 py-0.5 text-[10px] font-medium text-white">Pro</span>
        <p className="text-xs text-[#a6a6a6]">최근 7일 기업동향을 정리해서 보여드립니다.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {WEEKLY_SECTION_TITLES.map((t) => (
          <li key={t} className="flex items-center gap-2 text-sm text-[#a6a6a6]">
            <span className="h-1 w-1 shrink-0 rounded-full bg-[#555555]" />
            {t}
          </li>
        ))}
      </ul>
      <Link
        href="/billing"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#60a5fa] hover:underline"
      >
        Pro 플랜에서 전체 내용을 확인하세요
        <IconArrowRight size={14} stroke={2} />
      </Link>
    </BriefCard>
  );
}

function WeeklyBriefPending() {
  return (
    <BriefCard title="주간 BRIEF">
      <p className="text-sm text-[#a6a6a6]">매주 월요일 업데이트됩니다.</p>
    </BriefCard>
  );
}

export default async function WeeklyBrief({ isPro }: { isPro: boolean }) {
  if (!isPro) return <WeeklyBriefLocked />;

  const supabase = await createClient();
  const cache = await getLatestWeeklyBrief(supabase);

  if (!cache) return <WeeklyBriefPending />;

  const { topCompanies, marketStats, newEntrants, dropped, movers, sectors, filings, earningsHighlights, summary } =
    cache.data;

  return (
    <BriefAccordion
      title="주간 BRIEF"
      badge={`최근 7일 · ${cache.weekStart} 기준`}
      accent={WEEKLY_ACCENT}
      headerBg={WEEKLY_HEADER_BG}
    >
      {summary && (
        <BriefCard title="이번 주 시장 요약">
          <BriefSummaryText text={summary} />
        </BriefCard>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BriefCard title="이번 주 활동이 많았던 기업">
          <BriefCompanyList items={topCompanies} />
        </BriefCard>
        <BriefCard title="이번 주 시장 변화">
          <BriefChangeBadges stats={marketStats} />
        </BriefCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BriefCard title="이번 주 새로 활동이 확인된 기업">
          <BriefCompanyList items={newEntrants} />
        </BriefCard>
        <BriefCard title="이번 주 섹터 동향">
          <BriefSectorList sectors={sectors} accentColor={WEEKLY_ACCENT} />
        </BriefCard>
      </div>

      <BriefCard title="지난주 대비 변화">
        <BriefPeriodChange dropped={dropped} movers={movers} />
      </BriefCard>

      <BriefCard title="이번 주 주요 공시">
        <BriefFilingList filings={filings} />
      </BriefCard>

      <BriefCard title="이번 주 실적 하이라이트">
        <BriefEarningsList items={earningsHighlights} />
      </BriefCard>

      <p className="text-[11px] text-[#666666]">
        📌 본 콘텐츠는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 자료입니다.
        특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.
      </p>
    </BriefAccordion>
  );
}
