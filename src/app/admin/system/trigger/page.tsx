"use client";

import { useState } from "react";
import { IconRefresh, IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

type Status = "idle" | "running" | "done" | "error";

interface DebugInfo {
  cikMapSize?: number;
  tickerDbCount?: number;
  skipNoDisplayNames?: number;
  skipNoCikMatch?: number;
  skipTickerErr?: number;
  skipFilingErr?: number;
  firstError?: string | null;
  sampleSource?: Record<string, unknown> | null;
}

interface TriggerResult {
  ok: boolean;
  inserted?: number;
  skipped?: number;
  total?: number;
  tickers?: number;
  summarized?: number;
  error?: string;
  firstError?: string;
  debug?: DebugInfo;
}

interface Trigger {
  id: string;
  label: string;
  desc: string;
  endpoint: string;
}

const TRIGGERS: Trigger[] = [
  {
    id: "seed-tickers",
    label: "티커 시드 삽입 (NASDAQ + NYSE)",
    desc: "SEC company_tickers_exchange.json에서 NASDAQ·NYSE 전체 종목을 tickers 테이블에 삽입합니다. 최초 1회 또는 종목 누락 시 실행하세요.",
    endpoint: "/api/seed/tickers",
  },
  {
    id: "filings",
    label: "공시 수집 (EDGAR)",
    desc: "SEC EDGAR에서 오늘자 공시(8-K, 10-K, 10-Q, Form 4 등)를 수집합니다.",
    endpoint: "/api/collect/filings",
  },
  {
    id: "news",
    label: "뉴스 수집 (Finnhub)",
    desc: "Finnhub에서 최신 시장 뉴스를 수집합니다.",
    endpoint: "/api/collect/news",
  },
  {
    id: "earnings",
    label: "실적 캘린더 갱신",
    desc: "Finnhub에서 향후 30일간 실적 발표 일정을 수집합니다.",
    endpoint: "/api/collect/earnings",
  },
  {
    id: "macro",
    label: "경제지표 갱신",
    desc: "Finnhub에서 경제지표 일정 및 실제 발표값을 수집합니다.",
    endpoint: "/api/collect/macro",
  },
  {
    id: "insider",
    label: "내부자 거래 수집 (Finnhub)",
    desc: "DB에 등록된 모든 티커의 내부자 거래 내역을 수집합니다. 시간이 걸릴 수 있습니다.",
    endpoint: "/api/collect/insider",
  },
  {
    id: "translate",
    label: "번역 재실행 (Claude Haiku)",
    desc: "summary_kr이 NULL인 공시·뉴스를 한국어로 번역합니다. 각 최대 20건씩 처리합니다.",
    endpoint: "/api/translate",
  },
];

function resultSummary(result: TriggerResult): string {
  if (!result.ok) return result.error ?? "오류 발생";
  const parts: string[] = [];
  if (result.inserted !== undefined) parts.push(`저장 ${result.inserted}건`);
  if (result.skipped !== undefined) parts.push(`스킵 ${result.skipped}건`);
  if (result.tickers !== undefined) parts.push(`티커 ${result.tickers}개`);
  if (result.summarized !== undefined) parts.push(`요약 ${result.summarized}건`);
  const summary = parts.join(" · ") || "완료";
  return result.firstError ? `${summary} (오류: ${result.firstError})` : summary;
}

export default function TriggerPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [results, setResults] = useState<Record<string, TriggerResult>>({});

  async function handleTrigger(trigger: Trigger) {
    setStatuses((prev) => ({ ...prev, [trigger.id]: "running" }));
    setResults((prev) => {
      const next = { ...prev };
      delete next[trigger.id];
      return next;
    });

    try {
      const res = await fetch(trigger.endpoint);
      const data: TriggerResult = await res.json();
      setStatuses((prev) => ({ ...prev, [trigger.id]: data.ok ? "done" : "error" }));
      setResults((prev) => ({ ...prev, [trigger.id]: data }));
    } catch {
      setStatuses((prev) => ({ ...prev, [trigger.id]: "error" }));
      setResults((prev) => ({
        ...prev,
        [trigger.id]: { ok: false, error: "네트워크 오류" },
      }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">수동 재수집 트리거</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">
          데이터 수집을 수동으로 실행합니다. Vercel Cron이 자동 수집하지 못한 경우 사용하세요.
        </p>
      </div>

      <div className="space-y-3">
        {TRIGGERS.map((trigger) => {
          const status = statuses[trigger.id] ?? "idle";
          const result = results[trigger.id];

          return (
            <div
              key={trigger.id}
              className="rounded-xl border border-white/[0.08] bg-[#111111] px-5 py-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{trigger.label}</p>
                  <p className="mt-0.5 text-xs text-[#a6a6a6]">{trigger.desc}</p>
                  {result && (
                    <>
                      <p
                        className={`mt-1.5 text-xs font-medium ${
                          result.ok ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {resultSummary(result)}
                      </p>
                      {result.debug && (
                        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#0a0a0a] p-3 text-[10px] leading-relaxed text-[#a6a6a6]">
                          {JSON.stringify(result.debug, null, 2)}
                        </pre>
                      )}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleTrigger(trigger)}
                  disabled={status === "running"}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "done" && (
                    <>
                      <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                      완료
                    </>
                  )}
                  {status === "error" && (
                    <>
                      <IconAlertCircle size={14} stroke={1.5} className="text-red-400" />
                      오류
                    </>
                  )}
                  {(status === "idle" || status === "running") && (
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
            </div>
          );
        })}
      </div>

      {/* Cron 스케줄 안내 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-medium text-white">Vercel Cron 스케줄</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {[
            { name: "공시 수집", schedule: "매시간 17분", path: "/api/collect/filings" },
            { name: "뉴스 수집", schedule: "매시간 23분", path: "/api/collect/news" },
            { name: "실적 캘린더", schedule: "매일 00:07 UTC (09:07 KST)", path: "/api/collect/earnings" },
            { name: "경제지표", schedule: "매일 00:13 UTC (09:13 KST)", path: "/api/collect/macro" },
          ].map((cron) => (
            <div key={cron.path} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-white">{cron.name}</p>
                <p className="text-xs text-[#a6a6a6]">{cron.path}</p>
              </div>
              <span className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#a6a6a6]">
                {cron.schedule}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
