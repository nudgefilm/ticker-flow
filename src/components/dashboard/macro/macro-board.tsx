import {
  MACRO_GROUPS,
  MACRO_SCHEDULE,
  MACRO_RECENT_UPDATES,
  MACRO_LAST_UPDATED,
} from "@/lib/mock/macro";
import IndicatorCard from "./indicator-card";

// 그룹 묶음을 감싸는 섹션 카드 (기존 다크 테마 패턴)
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-white/[0.08] bg-[#111111] p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#a6a6a6]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatScheduleDate(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

export default function MacroBoard() {
  return (
    <div className="flex flex-col gap-8">
      {/* 1. 지표 그룹 (금리 / 물가 / 고용 / 성장) */}
      {MACRO_GROUPS.map((group) => (
        <SectionCard key={group.id} title={group.title}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.indicators.map((indicator) => (
              <IndicatorCard key={indicator.id} indicator={indicator} />
            ))}
          </div>
        </SectionCard>
      ))}

      {/* 2. 발표 예정 일정 */}
      <SectionCard title="발표 예정 일정">
        <div className="overflow-hidden rounded-[6px] border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-left text-xs text-[#a6a6a6]">
                <th className="px-4 py-2.5 font-medium">발표일</th>
                <th className="px-4 py-2.5 font-medium">경제지표</th>
                <th className="px-4 py-2.5 text-right font-medium">주기</th>
              </tr>
            </thead>
            <tbody>
              {MACRO_SCHEDULE.map((item, i) => (
                <tr
                  key={`${item.date}-${item.indicator}`}
                  className={`text-[#cccccc] ${i !== MACRO_SCHEDULE.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                >
                  <td className="px-4 py-2.5 tabular-nums text-white">{formatScheduleDate(item.date)}</td>
                  <td className="px-4 py-2.5">{item.indicator}</td>
                  <td className="px-4 py-2.5 text-right text-[#a6a6a6]">{item.frequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* 3. 최근 업데이트 */}
      <SectionCard title="최근 업데이트">
        <ol className="flex flex-col">
          {MACRO_RECENT_UPDATES.map((item, i) => (
            <li
              key={`${item.label}-${i}`}
              className="flex items-center justify-between gap-4 border-b border-white/[0.04] py-2.5 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-14 shrink-0 text-xs text-[#6f6f6f]">{item.group}</span>
                <span className="truncate text-sm text-[#cccccc]">{item.label}</span>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-[#6f6f6f]">{item.relativeTime}</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* 4. 데이터 출처 */}
      <SectionCard title="데이터 출처">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-white">FRED</p>
            <p className="mt-0.5 text-xs text-[#a6a6a6]">
              미국 연방준비제도(Federal Reserve Economic Data)
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-[#6f6f6f]">마지막 업데이트</p>
            <p className="mt-0.5 text-xs tabular-nums text-[#cccccc]">{MACRO_LAST_UPDATED}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
