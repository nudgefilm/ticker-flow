"use client";

import { useState } from "react";
import { IconRefresh, IconCircleCheck } from "@tabler/icons-react";

type TriggerStatus = "idle" | "running" | "done";

const triggers = [
  { id: "filings", label: "공시 수집 (EDGAR)", desc: "SEC EDGAR에서 최신 공시를 수동으로 수집합니다." },
  { id: "news", label: "뉴스 수집 (Finnhub)", desc: "Finnhub에서 최신 뉴스를 수동으로 수집합니다." },
  { id: "translate", label: "번역 재실행", desc: "번역되지 않은 공시·뉴스를 Claude로 재번역합니다." },
  { id: "earnings", label: "실적 캘린더 갱신", desc: "Finnhub에서 실적 일정을 갱신합니다." },
];

const recentLog = [
  { trigger: "공시 수집", at: "2026-06-24 09:15", result: "1,203건 수집 완료" },
  { trigger: "뉴스 수집", at: "2026-06-24 10:30", result: "847건 수집 완료" },
  { trigger: "실적 캘린더 갱신", at: "2026-06-23 09:00", result: "갱신 완료" },
];

export default function TriggerPage() {
  const [statuses, setStatuses] = useState<Record<string, TriggerStatus>>({});

  function handleTrigger(id: string) {
    setStatuses((prev) => ({ ...prev, [id]: "running" }));
    setTimeout(() => {
      setStatuses((prev) => ({ ...prev, [id]: "done" }));
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">수동 재수집 트리거</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">데이터 수집을 수동으로 실행합니다.</p>
      </div>

      <div className="space-y-3">
        {triggers.map((trigger) => {
          const status = statuses[trigger.id] ?? "idle";
          return (
            <div key={trigger.id} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#111111] px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">{trigger.label}</p>
                <p className="mt-0.5 text-xs text-[#a6a6a6]">{trigger.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => handleTrigger(trigger.id)}
                disabled={status === "running"}
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "done" ? (
                  <>
                    <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                    완료
                  </>
                ) : (
                  <>
                    <IconRefresh
                      size={14}
                      stroke={1.5}
                      className={status === "running" ? "animate-spin" : ""}
                    />
                    {status === "running" ? "실행 중..." : "실행"}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* 실행 이력 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">최근 실행 이력</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {recentLog.map((log, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-white">{log.trigger}</p>
                <p className="text-xs text-[#a6a6a6]">{log.at}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                <span className="text-xs text-green-400">{log.result}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
