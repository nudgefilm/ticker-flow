import { createClient } from "@/lib/supabase/server";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금"] as const;

// getDay(): 0=일, 1=월, ..., 6=토. 일요일이면 이번 주 월요일은 6일 전.
function getThisWeekRange(now: Date): { monday: Date; friday: Date } {
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diffToMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { monday, friday };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function EarningsFilterBar() {
  const supabase = await createClient();
  const { monday, friday } = getThisWeekRange(new Date());

  const { data } = await supabase
    .from("earnings")
    .select("ticker, report_date")
    .gte("report_date", toIsoDate(monday))
    .lte("report_date", toIsoDate(friday))
    .order("report_date", { ascending: true });

  const tickersByDay: Record<string, string[]> = { 월: [], 화: [], 수: [], 목: [], 금: [] };
  for (const row of (data ?? []) as { ticker: string; report_date: string }[]) {
    // report_date는 시각 없는 날짜 문자열 — 로컬 자정으로 파싱해 요일 계산.
    const weekdayIndex = new Date(`${row.report_date}T00:00:00`).getDay() - 1; // 1(월)~5(금) → 0~4
    const label = WEEKDAY_LABELS[weekdayIndex];
    if (label && !tickersByDay[label].includes(row.ticker)) {
      tickersByDay[label].push(row.ticker);
    }
  }

  const weekDays = WEEKDAY_LABELS.map((day) => ({
    day,
    tickers: tickersByDay[day],
    count: tickersByDay[day].length,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* 상단 행: 뷰 탭 */}
      <div className="flex items-center rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-1">
        <button
          type="button"
          className="rounded-[4px] bg-[#262626] px-3 py-1.5 text-sm text-white"
        >
          캘린더 뷰
        </button>
      </div>

      {/* 주간 캘린더 바 */}
      <div className="rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-4">
        <div className="grid grid-cols-5 gap-2">
          {weekDays.map((d) => (
            <div
              key={d.day}
              className="flex flex-col items-center gap-1 rounded-[4px] border border-white/[0.08] bg-blue-500/[0.15] px-2 py-3 text-center"
            >
              <span className="text-xs text-[#a6a6a6]">{d.day}</span>
              <span className="text-lg font-semibold text-white">{d.count}건</span>
              <div className="flex flex-wrap justify-center gap-1">
                {d.tickers.map((t) => (
                  <span
                    key={t}
                    className="rounded-[4px] bg-[#262626] px-1.5 py-0.5 text-[10px] text-[#cccccc]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
