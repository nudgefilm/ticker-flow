"use client";

import { useEffect, useRef, useState } from "react";
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
  updated?: number;
  skipped?: number;
  errors?: number;
  total?: number;
  tickers?: number;
  filings?: number;
  news?: number;
  summarized?: number;
  error?: string;
  firstError?: string;
  debug?: DebugInfo;
}

interface RunRecord {
  id: string;
  job_type: string;
  status: "running" | "done" | "error";
  result: TriggerResult | null;
  error_msg: string | null;
  started_at: string;
  finished_at: string | null;
}

interface Trigger {
  id: string;
  label: string;
  desc: string;
}

const TRIGGERS: Trigger[] = [
  {
    id: "watchlist-tickers",
    label: "와치리스트 종목 수집",
    desc: "와치리스트에 등록된 모든 종목의 최근 30일 공시(EDGAR)와 최근 7일 뉴스(Finnhub)를 수집합니다.",
  },
  {
    id: "seed-tickers",
    label: "티커 시드 삽입 (NASDAQ + NYSE)",
    desc: "SEC company_tickers_exchange.json에서 NASDAQ·NYSE 전체 종목을 tickers 테이블에 삽입합니다. 최초 1회 또는 종목 누락 시 실행하세요.",
  },
  {
    id: "filings",
    label: "공시 수집 (EDGAR)",
    desc: "SEC EDGAR에서 오늘자 공시(8-K, 10-K, 10-Q, Form 4 등)를 수집합니다.",
  },
  {
    id: "news",
    label: "뉴스 수집 (Finnhub)",
    desc: "Finnhub에서 최신 시장 뉴스를 수집합니다.",
  },
  {
    id: "earnings",
    label: "실적 캘린더 갱신",
    desc: "Finnhub에서 향후 30일간 실적 발표 일정을 수집합니다.",
  },
  {
    id: "macro",
    label: "경제지표 갱신",
    desc: "FRED API에서 GDP, CPI, 실업률, 기준금리, 10년물 국채금리, 소매판매 최신값을 수집합니다.",
  },
  {
    id: "insider",
    label: "내부자 거래 수집 (Finnhub)",
    desc: "와치리스트 + 최근 7일 공시 종목의 내부자 거래를 Finnhub에서 수집합니다. P(매수)/S(매도) 실거래, 파생상품 제외. 최대 10종목.",
  },
  {
    id: "prices",
    label: "주가 히스토리 수집 (Yahoo Finance)",
    desc: "와치리스트 + 최근 공시 종목의 현재가, 52주 최고/최저, 52주 수익률을 수집합니다. 최대 20종목.",
  },
  {
    id: "earnings-actual",
    label: "실적 어닝서프라이즈 업데이트 (Finnhub)",
    desc: "와치리스트 + 최근 공시 종목의 실제 EPS를 Finnhub에서 조회해 earnings 테이블을 갱신합니다. 최대 15종목.",
  },
  {
    id: "translate",
    label: "번역 재실행 (Claude Haiku)",
    desc: "summary_kr이 NULL인 공시·뉴스를 한국어로 번역합니다. 각 최대 20건씩 처리합니다.",
  },
  {
    id: "profile",
    label: "종목 프로필 수집 (Finnhub)",
    desc: "sector, industry가 없는 종목을 Finnhub에서 조회해 업데이트합니다. 최대 50종목.",
  },
  {
    id: "digest",
    label: "일보 다이제스트 발송 (Pro 유저)",
    desc: "Pro 플랜 유저에게 오늘의 주요 공시·뉴스를 이메일로 발송합니다.",
  },
  {
    id: "calls",
    label: "어닝콜 요약 수집 (FMP + Sonnet)",
    desc: "와치리스트 및 최근 90일 실적 발표 종목의 어닝콜 transcript를 FMP(Financial Modeling Prep)에서 수집하고 Claude Sonnet으로 한국어 구조화 요약을 생성합니다. 최대 10종목.",
  },
];

function resultSummary(result: TriggerResult): string {
  if (!result.ok) return result.error ?? "오류 발생";
  const parts: string[] = [];
  if (result.inserted   !== undefined) parts.push(`저장 ${result.inserted}건`);
  if (result.updated    !== undefined) parts.push(`업데이트 ${result.updated}건`);
  if (result.skipped    !== undefined) parts.push(`스킵 ${result.skipped}건`);
  if (result.errors     !== undefined && result.errors > 0) parts.push(`에러 ${result.errors}건`);
  if (result.tickers    !== undefined) parts.push(`티커 ${result.tickers}개`);
  if (result.filings    !== undefined) parts.push(`공시 ${result.filings}건`);
  if (result.news       !== undefined) parts.push(`뉴스 ${result.news}건`);
  if (result.summarized !== undefined) parts.push(`요약 ${result.summarized}건`);
  const summary = parts.join(" · ") || "완료";
  return result.firstError ? `${summary} (오류: ${result.firstError})` : summary;
}

function formatElapsed(started: string, finished: string | null): string {
  const ms = (finished ? new Date(finished) : new Date()).getTime() - new Date(started).getTime();
  return ms < 60000 ? `${Math.round(ms / 1000)}초` : `${Math.floor(ms / 60000)}분 ${Math.round((ms % 60000) / 1000)}초`;
}

export default function TriggerPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [results,  setResults]  = useState<Record<string, TriggerResult>>({});
  const [lastRuns, setLastRuns] = useState<Record<string, RunRecord>>({});
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // 페이지 진입 시 각 job의 최근 실행 결과 로드
  useEffect(() => {
    fetch("/api/admin/last-runs")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setLastRuns(d.runs ?? {}); })
      .catch(() => {});

    return () => {
      // 언마운트 시 모든 폴링 정리
      Object.values(pollRefs.current).forEach(clearInterval);
    };
  }, []);

  function startPolling(jobId: string, runId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/run-status?id=${runId}`);
        const data = await res.json();
        if (!data.ok || !data.run) return;

        const run: RunRecord = data.run;
        if (run.status === "done" || run.status === "error") {
          clearInterval(pollRefs.current[jobId]);
          delete pollRefs.current[jobId];

          const finalStatus: Status = run.status === "done" ? "done" : "error";
          setStatuses((p) => ({ ...p, [jobId]: finalStatus }));
          setResults((p)  => ({ ...p, [jobId]: run.result ?? { ok: run.status === "done" } }));
          setLastRuns((p) => ({ ...p, [jobId]: run }));
        }
      } catch {
        clearInterval(pollRefs.current[jobId]);
        delete pollRefs.current[jobId];
        setStatuses((p) => ({ ...p, [jobId]: "error" }));
      }
    }, 2000);

    pollRefs.current[jobId] = interval;

    // 최대 10분 후 자동 종료
    setTimeout(() => {
      if (pollRefs.current[jobId]) {
        clearInterval(pollRefs.current[jobId]);
        delete pollRefs.current[jobId];
        setStatuses((p) => (p[jobId] === "running" ? { ...p, [jobId]: "error" } : p));
      }
    }, 10 * 60 * 1000);
  }

  async function handleTrigger(trigger: Trigger) {
    // 기존 폴링 정리
    if (pollRefs.current[trigger.id]) {
      clearInterval(pollRefs.current[trigger.id]);
      delete pollRefs.current[trigger.id];
    }

    setStatuses((p) => ({ ...p, [trigger.id]: "running" }));
    setResults((p) => { const n = { ...p }; delete n[trigger.id]; return n; });

    try {
      // 즉시 반환 — 서버에서 독립 실행
      const res = await fetch(`/api/admin/run?job=${trigger.id}`);
      const data = await res.json();

      if (!data.ok || !data.runId) {
        setStatuses((p) => ({ ...p, [trigger.id]: "error" }));
        setResults((p)  => ({ ...p, [trigger.id]: { ok: false, error: data.error ?? "오류" } }));
        return;
      }

      // 2초 간격으로 완료 여부 폴링
      startPolling(trigger.id, data.runId);
    } catch {
      setStatuses((p) => ({ ...p, [trigger.id]: "error" }));
      setResults((p)  => ({ ...p, [trigger.id]: { ok: false, error: "네트워크 오류" } }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">수동 재수집 트리거</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">
          페이지를 이동해도 수집은 서버에서 계속 실행됩니다. 돌아오면 마지막 결과를 확인할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRIGGERS.map((trigger, index) => {
          const status   = statuses[trigger.id] ?? "idle";
          const result   = results[trigger.id];
          const lastRun  = lastRuns[trigger.id];

          // 버튼 상태: 현재 세션만 반영 (페이지 로드 시 항상 "실행")
          const displayStatus: Status = status;
          // 결과 텍스트: 현재 세션 결과 → 없으면 이전 실행 결과(참고용)
          const displayResult: TriggerResult | null = result ?? lastRun?.result ?? null;

          const isLastOdd = TRIGGERS.length % 2 !== 0 && index === TRIGGERS.length - 1;

          return (
            <div
              key={trigger.id}
              className={`rounded-xl border border-white/[0.08] bg-[#111111] px-5 py-4${isLastOdd ? " md:col-span-2" : ""}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{trigger.label}</p>
                  <p className="mt-0.5 text-xs text-[#a6a6a6]">{trigger.desc}</p>

                  {displayResult && (
                    <p
                      className={`mt-1.5 text-xs font-medium ${
                        displayResult.ok ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {resultSummary(displayResult)}
                      {lastRun && !result && (
                        <span className="ml-2 font-normal text-[#a6a6a6]">
                          · {formatElapsed(lastRun.started_at, lastRun.finished_at)} 소요 (이전 실행)
                        </span>
                      )}
                    </p>
                  )}

                  {result?.debug && (
                    <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#0a0a0a] p-3 text-[10px] leading-relaxed text-[#a6a6a6]">
                      {JSON.stringify(result.debug, null, 2)}
                    </pre>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleTrigger(trigger)}
                  disabled={status === "running"}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {displayStatus === "done" && (
                    <>
                      <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                      완료
                    </>
                  )}
                  {displayStatus === "error" && (
                    <>
                      <IconAlertCircle size={14} stroke={1.5} className="text-red-400" />
                      오류
                    </>
                  )}
                  {(displayStatus === "idle" || displayStatus === "running") && (
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
            { name: "공시 수집",           schedule: "매시간 17분",              path: "/api/collect/filings"          },
            { name: "뉴스 수집",           schedule: "매시간 23분",              path: "/api/collect/news"             },
            { name: "번역 (Claude Haiku)", schedule: "매시간 07·27·47분",        path: "/api/translate"                },
            { name: "실적 캘린더",          schedule: "매일 00:07 UTC (09:07 KST)", path: "/api/collect/earnings"       },
            { name: "경제지표",            schedule: "매일 00:13 UTC (09:13 KST)", path: "/api/collect/macro"          },
            { name: "내부자 거래",          schedule: "매일 00:20 UTC (09:20 KST)", path: "/api/collect/insider"        },
            { name: "애널리스트 추천",      schedule: "매일 00:25 UTC (09:25 KST)", path: "/api/collect/analyst"        },
            { name: "주가 히스토리",        schedule: "매일 00:30 UTC (09:30 KST)", path: "/api/collect/prices"         },
            { name: "실적 어닝서프라이즈",  schedule: "매일 00:35 UTC (09:35 KST)", path: "/api/collect/earnings-actual" },
            { name: "13F 기관 보유",        schedule: "매주 월 00:30 UTC (09:30 KST)", path: "/api/collect/13f"         },
            { name: "종목 프로필",          schedule: "매주 월 01:37 UTC (10:37 KST)", path: "/api/collect/profile"     },
            { name: "일보 다이제스트",       schedule: "매일 01:00 UTC (10:00 KST)",    path: "/api/email/digest"         },
            { name: "어닝콜 요약 수집",     schedule: "매일 02:00 UTC (11:00 KST)",    path: "/api/collect/calls"        },
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
