import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import MacroBoard from "@/components/macro/macro-board";
import { createClient } from "@/lib/supabase/server";
import {
  SERIES_META,
  GROUP_ORDER,
  type MacroIndicator,
  type MacroGroup,
} from "@/lib/macro";

export const dynamic = "force-dynamic";

export default async function MacroPage() {
  const supabase = await createClient();

  // 전체 히스토리 조회 — 동일 indicator_name에 복수 행이 있으면 스파크라인에 사용
  const { data, error } = await supabase
    .from("macro_indicators")
    .select("indicator_name, value, previous_value, released_at, source")
    .order("released_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];

  // indicator_name 기준으로 그룹핑 (DESC 순)
  const byName: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!byName[row.indicator_name]) byName[row.indicator_name] = [];
    byName[row.indicator_name].push(row);
  }

  // MacroIndicator 배열 생성
  const indicators: MacroIndicator[] = [];
  for (const [name, records] of Object.entries(byName)) {
    const meta = SERIES_META[name];
    if (!meta) continue;

    const latest = records[0];

    // 최근 13개 → 오름차순으로 뒤집어 스파크라인 데이터로 사용
    const history = records
      .slice(0, 13)
      .reverse()
      .filter((r) => r.value != null)
      .map((r) => ({ date: r.released_at.slice(0, 10), value: r.value! }));

    indicators.push({
      seriesId: meta.seriesId,
      name: meta.name,
      nameEn: meta.nameEn,
      desc: meta.desc,
      value: latest.value,
      previousValue: latest.previous_value,
      unit: meta.unit,
      valueType: meta.valueType,
      releasedAt: latest.released_at,
      source: latest.source ?? meta.seriesId,
      history,
      group: meta.group,
    });
  }

  // 그룹별 분류
  const groupMap: Record<string, MacroIndicator[]> = {};
  for (const ind of indicators) {
    if (!groupMap[ind.group]) groupMap[ind.group] = [];
    groupMap[ind.group].push(ind);
  }

  const groups: MacroGroup[] = GROUP_ORDER.filter(
    (g) => (groupMap[g]?.length ?? 0) > 0
  ).map((g) => ({
    key: g,
    label: g,
    indicators: groupMap[g],
  }));

  // 기준일: 전체 중 가장 최근 released_at
  const latestAt = rows[0]?.released_at ?? "";
  const referenceDate = latestAt
    ? new Date(latestAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="flex h-full flex-col gap-6">
      <DashboardHeader title="경제지표" />

      {error && (
        <p className="text-sm text-red-400">
          데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      <p className="text-sm text-[#a6a6a6]">
        미국 주요 경제지표를 한눈에 확인합니다.
        출처: FRED(미국 연방준비제도). 데이터는 매일 오전 갱신됩니다.
      </p>

      <MacroBoard groups={groups} referenceDate={referenceDate} />

      <DashboardDisclaimer />
    </div>
  );
}
