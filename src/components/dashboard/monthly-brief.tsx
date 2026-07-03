import { createClient } from "@/lib/supabase/server";
import { getLatestMonthlyBrief } from "@/lib/watchlist-brief";
import {
  BriefCard,
  BriefCompanyList,
  BriefChangeBadges,
  BriefSectorList,
  BriefFilingList,
  BriefEarningsList,
  BriefMacroList,
  BriefTagLeaders,
  BriefSummaryText,
} from "./brief-sections";

function MonthlyBriefPending() {
  return (
    <BriefCard title="월간 BRIEF">
      <p className="text-sm text-[#a6a6a6]">데이터 준비 중입니다.</p>
    </BriefCard>
  );
}

export default async function MonthlyBrief() {
  const supabase = await createClient();
  const cache = await getLatestMonthlyBrief(supabase);

  if (!cache) return <MonthlyBriefPending />;

  const { topCompanies, marketStats, newEntrants, sectors, tagLeaders, filings, earningsHighlights, macro, summary } =
    cache.data;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-white">
        월간 BRIEF <span className="ml-1 text-xs font-normal text-[#a6a6a6]">최근 30일 · {cache.monthStart} 기준</span>
      </p>

      {summary && (
        <BriefCard title="이번 달 시장 요약">
          <BriefSummaryText text={summary} />
        </BriefCard>
      )}

      <BriefCard title="이번 달 기업동향 TOP20">
        <BriefCompanyList items={topCompanies} />
      </BriefCard>

      <BriefCard title="이번 달 시장 변화">
        <BriefChangeBadges stats={marketStats} />
      </BriefCard>

      <BriefCard title="이번 달 섹터 동향">
        <BriefSectorList sectors={sectors} />
      </BriefCard>

      <BriefCard title="이번 달 처음 TOP30 진입 기업">
        <BriefCompanyList items={newEntrants} />
      </BriefCard>

      <BriefCard title="이번 달 가장 많이 관측된 변화">
        <BriefTagLeaders items={tagLeaders} />
      </BriefCard>

      <BriefCard title="이번 달 주요 공시">
        <BriefFilingList filings={filings} />
      </BriefCard>

      <BriefCard title="이번 달 실적 하이라이트">
        <BriefEarningsList items={earningsHighlights} />
      </BriefCard>

      <BriefCard title="이번 달 경제지표">
        <BriefMacroList items={macro} />
      </BriefCard>

      <p className="text-[11px] text-[#666666]">
        본 콘텐츠는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 자료입니다.
        특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.
      </p>
    </div>
  );
}
