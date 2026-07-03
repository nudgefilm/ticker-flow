import { createAdminClient } from "@/lib/supabase/admin";
import { TAG_LABELS_KR } from "@/lib/collect/scoring";

type Top10Row = { ticker: string; rank: number; reason_tags: string[] | null };
type TickerRow = { ticker: string; name_kr: string | null; name_en: string | null };

export default async function LandingTop10() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: rows } = await admin
    .from("top30_daily")
    .select("ticker, rank, reason_tags")
    .eq("date", todayStr)
    .lte("rank", 10)
    .order("rank", { ascending: true });

  if (!rows || rows.length === 0) return null;

  const { data: tickerRows } = await admin
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", (rows as Top10Row[]).map(r => r.ticker));

  const nameMap = new Map<string, string>(
    ((tickerRows ?? []) as TickerRow[]).map(r => [
      r.ticker, r.name_kr ?? r.name_en ?? r.ticker,
    ])
  );

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;

  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-8 text-center">
          <span className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            TODAY
          </span>
          <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
            오늘의 기업 동향 TOP10
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {dateLabel} 기준 · 공시·내부자 거래·실적 변화가 많은 기업
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(rows as Top10Row[]).map((row) => {
            const tags = (row.reason_tags ?? []).slice(0, 3);
            return (
              <div
                key={row.ticker}
                className="rounded-[12px] border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-[4px] bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
                    ${row.ticker}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{row.rank}위</span>
                </div>
                <p className="mt-2 truncate text-sm font-medium text-foreground">
                  {nameMap.get(row.ticker) ?? row.ticker}
                </p>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {TAG_LABELS_KR[tag] ?? tag}
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
