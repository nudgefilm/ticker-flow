import { createAdminClient } from "@/lib/supabase/admin";
import { TRACKED_DAYS } from "@/lib/outcomes/config";

// 티커플로우 스크리너 2.5단계 — TOP30 Entry/Outcome 조회 뷰. 어드민 전용
// 규제 예외 구간(CLAUDE.md 18항)이며, 사용자 노출 화면·API에는 절대 포함하지 않는다.

type EntryRow = {
  id: string;
  ticker: string;
  selected_date: string;
  rank_snapshot: number | null;
  final_score_snapshot: number | null;
  reason_tags_snapshot: string[] | null;
  model_version: string;
};

type OutcomeRow = {
  entry_id: string;
  days_after: number;
  return_pct: number | null;
  status: string;
};

const MAX_ENTRIES = 30;

export default async function OutcomesSection() {
  const admin = createAdminClient();
  // top30_entries/top30_outcome_results는 생성된 Supabase 타입에 없는 신규 테이블
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const { data: entriesRaw } = await adminAny
    .from("top30_entries")
    .select("id, ticker, selected_date, rank_snapshot, final_score_snapshot, reason_tags_snapshot, model_version")
    .order("selected_date", { ascending: false })
    .order("rank_snapshot", { ascending: true })
    .limit(MAX_ENTRIES);

  const entries = (entriesRaw ?? []) as EntryRow[];

  if (entries.length === 0) {
    return (
      <p className="text-sm text-[#a6a6a6]">
        아직 기록된 Entry가 없습니다. TOP30 선정이 실행되어 신규 진입 종목이 발생하면 여기 표시됩니다.
      </p>
    );
  }

  // outcome_results는 entry_id 기준 — entries.id 목록으로 in() 조회
  const { data: outcomesRaw } = await adminAny
    .from("top30_outcome_results")
    .select("entry_id, days_after, return_pct, status")
    .in("entry_id", entries.map((e) => e.id));
  const outcomesByEntry = new Map<string, OutcomeRow[]>();
  for (const o of (outcomesRaw ?? []) as OutcomeRow[]) {
    const arr = outcomesByEntry.get(o.entry_id) ?? [];
    arr.push(o);
    outcomesByEntry.set(o.entry_id, arr);
  }

  function fmtReturn(outcomes: OutcomeRow[] | undefined, days: number): string {
    const row = outcomes?.find((o) => o.days_after === days);
    if (!row) return "—";
    if (row.status !== "complete" || row.return_pct == null) return "대기";
    const sign = row.return_pct > 0 ? "+" : "";
    return `${sign}${row.return_pct.toFixed(1)}%`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-white/[0.08] text-[#a6a6a6]">
            <th className="py-2 pr-3 font-medium">티커</th>
            <th className="py-2 pr-3 font-medium">진입일</th>
            <th className="py-2 pr-3 font-medium">순위</th>
            <th className="py-2 pr-3 font-medium">태그</th>
            <th className="py-2 pr-3 font-medium">모델버전</th>
            {TRACKED_DAYS.map((d) => (
              <th key={d} className="py-2 pr-3 font-medium">{d}일 후</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-white/[0.04]">
              <td className="py-2 pr-3 font-medium text-white">{e.ticker}</td>
              <td className="py-2 pr-3 text-[#cccccc]">{e.selected_date}</td>
              <td className="py-2 pr-3 text-[#cccccc]">{e.rank_snapshot ?? "—"}</td>
              <td className="py-2 pr-3 text-[#cccccc]">
                {(e.reason_tags_snapshot ?? []).slice(0, 3).join(", ") || "—"}
              </td>
              <td className="py-2 pr-3 text-[#999999]">{e.model_version}</td>
              {TRACKED_DAYS.map((d) => (
                <td key={d} className="py-2 pr-3 text-[#cccccc]">
                  {fmtReturn(outcomesByEntry.get(e.id), d)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
