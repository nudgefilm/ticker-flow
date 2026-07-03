import Link from "next/link";
import type { ReactNode } from "react";
import type {
  BriefCompany,
  MarketChangeStats,
  RankMoverItem,
  SectorTrend,
  FilingHighlight,
  EarningsHighlight,
  MacroSnapshot,
  TagLeader,
} from "@/lib/watchlist-brief";

const BASE_URL_PATH = "/stocks";

export function BriefCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#1a1a1a]">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#242424] px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">{title}</p>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function BriefEmpty({ text = "이 기간 동안 집계된 데이터가 없습니다." }: { text?: string }) {
  return <p className="text-sm text-[#a6a6a6]">{text}</p>;
}

export function TickerLink({ ticker, name }: { ticker: string; name: string }) {
  return (
    <Link href={`${BASE_URL_PATH}/${ticker}`} className="hover:underline">
      <span className="font-semibold text-white">{ticker}</span>{" "}
      <span className="text-xs text-[#a6a6a6]">{name}</span>
    </Link>
  );
}

// ── 기업 리스트 (TOP N / 신규 진입 공용) ────────────────────────────────────────

export function BriefCompanyList({ items, rankOffset = 1 }: { items: BriefCompany[]; rankOffset?: number }) {
  if (items.length === 0) return <BriefEmpty />;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item.ticker} className="flex items-start gap-3">
          <span className="mt-0.5 w-5 shrink-0 text-xs text-[#666666]">{i + rankOffset}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <TickerLink ticker={item.ticker} name={item.name} />
            </p>
            {item.descriptions.length > 0 && (
              <p className="mt-0.5 text-xs text-[#a6a6a6]">{item.descriptions.join(" · ")}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── 시장 변화 배지 (기존 다이제스트 4색 + 추가 2종) ────────────────────────────

const CHANGE_BADGE_SPEC: {
  key: keyof MarketChangeStats;
  label: string;
  bg: string;
  fg: string;
}[] = [
  { key: "institutionalCount", label: "기관수급", bg: "#1e3a5f", fg: "#93c5fd" },
  { key: "epsBeatCount",       label: "실적",     bg: "#1a3a2a", fg: "#6ee7b7" },
  { key: "insiderBuyCount",    label: "내부자",   bg: "#2d1f4a", fg: "#c4b5fd" },
  { key: "filingsCount",       label: "시장변화", bg: "#3a2a10", fg: "#fcd34d" },
  { key: "priceTargetUpCount", label: "목표가 상향", bg: "#312e6b", fg: "#a5b4fc" },
  { key: "volumeSpikeCount",   label: "거래량 증가", bg: "#4a2e10", fg: "#fdba74" },
];

export function BriefChangeBadges({ stats }: { stats: MarketChangeStats }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {CHANGE_BADGE_SPEC.map((spec) => (
        <div
          key={spec.key}
          className="rounded-[6px] p-3 text-center"
          style={{ backgroundColor: spec.bg }}
        >
          <p className="text-lg font-semibold" style={{ color: spec.fg }}>
            {stats[spec.key]}
          </p>
          <p className="mt-0.5 text-[10px]" style={{ color: spec.fg }}>
            {spec.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── 지난 기간 대비 변화 (주간 전용) ─────────────────────────────────────────────

export function BriefPeriodChange({
  dropped,
  movers,
}: {
  dropped: { ticker: string; name: string }[];
  movers: RankMoverItem[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a6a6a6]">순위 변화</p>
        {movers.length === 0 ? (
          <BriefEmpty text="순위 변화가 크지 않았습니다." />
        ) : (
          <table className="w-full border-collapse text-sm">
            <tbody>
              {movers.map((m) => {
                const up = m.delta > 0;
                return (
                  <tr key={m.ticker} className="border-t border-white/[0.06] first:border-t-0">
                    <td className="py-1.5"><TickerLink ticker={m.ticker} name={m.name} /></td>
                    <td className="py-1.5 text-right text-xs text-[#a6a6a6]">{m.prevRank}위 → {m.currRank}위</td>
                    <td className="py-1.5 pl-3 text-right text-xs" style={{ color: up ? "#6ee7b7" : "#f87171" }}>
                      {up ? "▲" : "▼"} {Math.abs(m.delta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a6a6a6]">TOP30 이탈</p>
        {dropped.length === 0 ? (
          <BriefEmpty text="없음" />
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {dropped.map((d) => (
              <span key={d.ticker} className="text-sm">
                <TickerLink ticker={d.ticker} name={d.name} />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 섹터 동향 ──────────────────────────────────────────────────────────────────

export function BriefSectorList({ sectors }: { sectors: SectorTrend[] }) {
  if (sectors.length === 0) return <BriefEmpty />;
  const max = Math.max(...sectors.map((s) => s.total), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {sectors.map((s) => (
        <div key={s.sector}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-[#cccccc]">{s.sector}</span>
            <span className="text-xs text-[#a6a6a6]">공시 {s.filingsCount}건 · 내부자 매수 {s.insiderCount}건</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[#60a5fa]" style={{ width: `${(s.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 주요 공시 ──────────────────────────────────────────────────────────────────

const EVENT_TYPE_KR: Record<string, string> = {
  ceo_change: "CEO 교체", cfo_change: "CFO 교체", buyback: "자사주 매입",
  insider_trade: "내부자 거래", ma: "인수합병", guidance: "가이던스 변경",
  contract: "대규모 계약", dilution: "증자", bond: "전환사채",
};

export function BriefFilingList({ filings }: { filings: FilingHighlight[] }) {
  if (filings.length === 0) return <BriefEmpty />;
  return (
    <ul className="flex flex-col gap-2.5">
      {filings.map((f, i) => (
        <li key={`${f.ticker}-${f.filedAt}-${i}`} className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2.5 first:border-t-0 first:pt-0">
          <div className="min-w-0">
            <p className="text-sm"><TickerLink ticker={f.ticker} name={f.name} /></p>
            <p className="mt-0.5 text-xs text-[#a6a6a6]">
              {f.eventType ? EVENT_TYPE_KR[f.eventType] ?? f.eventType : f.formType}
            </p>
          </div>
          {f.url && (
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-[#60a5fa] hover:underline">
              원문
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── 실적 하이라이트 ────────────────────────────────────────────────────────────

export function BriefEarningsList({ items }: { items: EarningsHighlight[] }) {
  if (items.length === 0) return <BriefEmpty />;
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((e) => (
        <li key={`${e.ticker}-${e.reportDate}`} className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2.5 first:border-t-0 first:pt-0">
          <p className="text-sm"><TickerLink ticker={e.ticker} name={e.name} /></p>
          <p className="shrink-0 text-xs text-[#6ee7b7]">
            {[e.epsBeat && "EPS 상회", e.revenueBeat && "매출 상회"].filter(Boolean).join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ── 경제지표 (월간 전용) ────────────────────────────────────────────────────────

export function BriefMacroList({ items }: { items: MacroSnapshot[] }) {
  if (items.length === 0) return <BriefEmpty />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((m) => {
        const delta = m.value != null && m.previousValue != null ? m.value - m.previousValue : null;
        return (
          <div key={m.name} className="rounded-[6px] border border-white/[0.06] bg-[#111111] p-3">
            <p className="text-xs text-[#a6a6a6]">{m.name}</p>
            <p className="mt-1 text-lg font-semibold text-white">{m.value != null ? m.value.toFixed(2) : "—"}</p>
            {delta != null && (
              <p className="mt-0.5 text-xs text-[#a6a6a6]">
                전월 대비 {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 가장 많이 관측된 변화 (월간 전용) ───────────────────────────────────────────

export function BriefTagLeaders({ items }: { items: TagLeader[] }) {
  if (items.length === 0) return <BriefEmpty />;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-sm text-[#cccccc]">{item.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[#60a5fa]" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right text-xs text-[#a6a6a6]">{item.count}건</span>
        </div>
      ))}
    </div>
  );
}

// ── 시장 요약 (Haiku) ──────────────────────────────────────────────────────────

export function BriefSummaryText({ text }: { text: string }) {
  return <p className="text-sm leading-relaxed text-[#cccccc]">{text}</p>;
}
