import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeRange, fetchTopCompanies } from "@/lib/watchlist-brief";
import { LANDING_DATA_CACHE_TAG } from "@/lib/landing-cache";

// 2026-07-11: top30_daily.rank(TickerFlow 자체 스코어링 결과) 기반 "오늘의
// 기업 동향 TOP10" + "N위" 배지를 제거했다(세션97 규제 리스크 점검 — 자본시장법
// 유사투자자문업 "가치에 관한 조언" 소지 제거). 최근 7일 공시+뉴스+내부자매수
// 건수 기반(fetchTopCompanies, 주간/월간 BRIEF와 동일한 팩트 카운트 로직)으로
// 교체하고, 순위 배지 대신 실제 활동 건수를 그대로 보여준다.

// 태그 캐시(LANDING_DATA_CACHE_TAG) — 매일 04:00 KST에만 갱신(/api/revalidate/landing).
const getCachedTopCompanies = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const range = computeRange(7);
    return fetchTopCompanies(admin, range, 10);
  },
  ["landing-top-companies"],
  { revalidate: false, tags: [LANDING_DATA_CACHE_TAG] }
);

export default async function LandingTop10() {
  const companies = await getCachedTopCompanies();

  if (companies.length === 0) return null;

  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-8 text-center">
          <span className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            최근 7일
          </span>
          <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
            최근 7일 활동이 많았던 기업
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            공시·내부자 거래·관련 뉴스 건수를 합산한 기준입니다
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {companies.map((company) => {
            const tags = company.descriptions.slice(0, 3);
            return (
              <div
                key={company.ticker}
                className="rounded-[12px] border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-[4px] bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
                    ${company.ticker}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{company.activityCount}건</span>
                </div>
                <p className="mt-2 truncate text-sm font-medium text-foreground">
                  {company.name}
                </p>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          📌 본 정보는 공개된 데이터를 기반으로 한 참고용입니다.
          투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.
        </p>

      </div>
    </section>
  );
}
