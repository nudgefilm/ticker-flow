"use client";

import { useState } from "react";
import { IconRefresh, IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

type Status = "idle" | "running" | "done" | "error";

interface TriggerResult { ok: boolean; upserted?: number; skipped?: number; error?: string; firstError?: string | null }

const BUTTONS = [
  { id: "analyst",          label: "애널리스트 추천 수집",        endpoint: "/api/collect/analyst"          },
  { id: "13f",              label: "기관투자자 보유 현황 (13F)",   endpoint: "/api/collect/13f"              },
  { id: "prices",           label: "주가 히스토리 수집",           endpoint: "/api/collect/prices"           },
  { id: "earnings-actual",  label: "실적 어닝서프라이즈 업데이트", endpoint: "/api/collect/earnings-actual"  },
] as const;

export default function AdminTriggerButtons() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [results,  setResults]  = useState<Record<string, TriggerResult>>({});

  async function run(id: string, endpoint: string) {
    setStatuses((p) => ({ ...p, [id]: "running" }));
    setResults((p) => { const n = { ...p }; delete n[id]; return n; });
    try {
      const res = await fetch(endpoint);
      const data: TriggerResult = await res.json();
      setStatuses((p) => ({ ...p, [id]: data.ok ? "done" : "error" }));
      setResults((p)  => ({ ...p, [id]: data }));
    } catch {
      setStatuses((p) => ({ ...p, [id]: "error" }));
      setResults((p)  => ({ ...p, [id]: { ok: false, error: "네트워크 오류" } }));
    }
  }

  return (
    <div className="mt-4 rounded-[6px] border border-emerald-400/50 bg-emerald-950/20 p-4 shadow shadow-emerald-400/10">
      <p className="mb-3 text-xs font-semibold text-emerald-400">수동 수집 실행</p>
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map(({ id, label, endpoint }) => {
          const status = statuses[id] ?? "idle";
          const result = results[id];
          return (
            <div key={id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => run(id, endpoint)}
                disabled={status === "running"}
                className="flex items-center gap-1.5 rounded-[4px] border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "done"    && <IconCircleCheck size={12} stroke={1.5} className="text-green-400" />}
                {status === "error"   && <IconAlertCircle size={12} stroke={1.5} className="text-red-400"   />}
                {(status === "idle" || status === "running") && (
                  <IconRefresh size={12} stroke={1.5} className={status === "running" ? "animate-spin" : ""} />
                )}
                {status === "running" ? "실행 중..." : label}
              </button>
              {result && (
                <div className="space-y-0.5">
                  <p className={`text-[10px] ${result.ok ? "text-green-400" : "text-red-400"}`}>
                    {result.ok
                      ? `저장 ${result.upserted ?? 0}건 · 스킵 ${result.skipped ?? 0}건`
                      : (result.error ?? "오류")}
                  </p>
                  {result.ok && result.firstError && (
                    <p className="text-[10px] text-yellow-500">{result.firstError}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
