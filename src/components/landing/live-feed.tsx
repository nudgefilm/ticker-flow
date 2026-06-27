import { LIVE_FEED, type FeedBadgeColor } from "@/lib/mock/landing";

const BADGE_CLASSES: Record<FeedBadgeColor, string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function LiveFeed() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">지금 일어나고 있는 변화</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LIVE_FEED.map((item) => (
          <div
            key={`${item.ticker}-${item.badgeLabel}`}
            className="space-y-3 rounded-lg border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">
                {item.ticker}
                <span className="ml-1.5 font-normal text-muted-foreground">· {item.company}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{item.relativeTime}</span>
            </div>
            <span
              className={`inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium ${BADGE_CLASSES[item.badgeColor]}`}
            >
              {item.badgeLabel}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        지금 이 순간에도 새로운 공시와 실적 발표, 내부자 거래가 발생하고 있습니다.
      </p>
    </section>
  );
}
