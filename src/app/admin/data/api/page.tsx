import { IconCircleCheck, IconAlertCircle, IconCircleDashed } from "@tabler/icons-react";

export const dynamic = "force-dynamic";

type ApiEntry = {
  name: string;
  keyEnvVar: string;
  hasKey: boolean;
  ok: boolean | null;
  status: string;
  latencyMs: number | null;
};

async function ping(
  url: string,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; status: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    return {
      ok: res.ok,
      status: res.ok ? "정상" : `HTTP ${res.status}`,
      latencyMs: Date.now() - start,
    };
  } catch {
    return { ok: false, status: "연결 실패", latencyMs: Date.now() - start };
  }
}

export default async function ApiStatusPage() {
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const fredKey = process.env.FRED_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const [finnhubCheck, edgarCheck, fredCheck] = await Promise.all([
    finnhubKey
      ? ping(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${finnhubKey}`)
      : null,
    ping("https://efts.sec.gov/LATEST/search-index?q=AAPL&hits.hits=1", {
      "User-Agent": "TickerFlow contact@tickerflow.net",
    }),
    fredKey
      ? ping(
          `https://api.stlouisfed.org/fred/series?series_id=FEDFUNDS&api_key=${fredKey}&file_type=json`,
        )
      : null,
  ]);

  const apis: ApiEntry[] = [
    {
      name: "Finnhub",
      keyEnvVar: "FINNHUB_API_KEY",
      hasKey: !!finnhubKey,
      ok: finnhubCheck ? finnhubCheck.ok : null,
      status: finnhubCheck ? finnhubCheck.status : "키 미등록",
      latencyMs: finnhubCheck ? finnhubCheck.latencyMs : null,
    },
    {
      name: "SEC EDGAR",
      keyEnvVar: "— (키 불필요)",
      hasKey: true,
      ok: edgarCheck.ok,
      status: edgarCheck.status,
      latencyMs: edgarCheck.latencyMs,
    },
    {
      name: "FRED",
      keyEnvVar: "FRED_API_KEY",
      hasKey: !!fredKey,
      ok: fredCheck ? fredCheck.ok : null,
      status: fredCheck ? fredCheck.status : "키 미등록",
      latencyMs: fredCheck ? fredCheck.latencyMs : null,
    },
    {
      name: "Anthropic",
      keyEnvVar: "ANTHROPIC_API_KEY",
      hasKey: !!anthropicKey,
      ok: anthropicKey ? true : null,
      status: anthropicKey ? "키 등록됨" : "키 미등록",
      latencyMs: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">API 상태</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">외부 API 연결 상태 및 환경변수 등록 여부</p>
      </div>

      <div className="space-y-3">
        {apis.map((api) => {
          const statusColor =
            api.ok === null
              ? "text-[#a6a6a6]"
              : api.ok
                ? "text-green-400"
                : "text-red-400";

          return (
            <div
              key={api.name}
              className="rounded-xl border border-white/[0.08] bg-[#111111] px-5 py-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{api.name}</span>
                  <div className="flex items-center gap-1.5">
                    {api.ok === null ? (
                      <IconCircleDashed size={14} stroke={1.5} className="text-[#a6a6a6]" />
                    ) : api.ok ? (
                      <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                    ) : (
                      <IconAlertCircle size={14} stroke={1.5} className="text-red-400" />
                    )}
                    <span className={`text-xs ${statusColor}`}>{api.status}</span>
                  </div>
                </div>
                {api.latencyMs !== null && (
                  <span className="text-xs text-[#a6a6a6]">응답 {api.latencyMs}ms</span>
                )}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-xs text-[#a6a6a6]">
                  환경변수:{" "}
                  <code className="font-mono text-[#cccccc]">{api.keyEnvVar}</code>
                </span>
                <span
                  className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium ${
                    api.hasKey
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {api.hasKey ? "등록됨" : "미등록"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#a6a6a6]">
        Anthropic API는 비용 절약을 위해 키 등록 여부만 확인합니다. 실제 호출 테스트는 생략합니다.
      </p>
    </div>
  );
}
