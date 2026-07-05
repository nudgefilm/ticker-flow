import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";
import {
  PRO_MONTHLY_PRICE_KRW,
  PRO_ANNUAL_PRICE_KRW,
  PRO_ANNUAL_MONTHLY_EQUIVALENT_KRW,
  PRO_ANNUAL_FREE_MONTHS,
  TAX_NOTICE_KO,
  formatKrw,
} from "@/lib/pricing";

const FREE_FEATURES = [
  "와치리스트 (최대 5종목)",
  "공시 피드",
  "뉴스 피드",
  "실적 캘린더",
  "종목 스냅샷",
  "경제지표",
];

type ProFeature = { label: string; desc?: string };

const PRO_FEATURES: ProFeature[] = [
  { label: "Free 기능 전체 포함" },
  { label: "와치리스트 종목 수 무제한" },
  { label: "공시 인사이트" },
  { label: "어닝콜 요약" },
  { label: "내부자 거래" },
  { label: "섹터 히트맵" },
  { label: "알림 설정" },
  { label: "데일리 다이제스트", desc: "매일 아침 주요 기업동향과 시장 변화를 이메일로 받아보세요." },
];

export function PricingPlans() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

      {/* Free 카드 */}
      <div className="flex flex-col overflow-hidden rounded-[12px] border border-border bg-card">
        <div className="border-b border-border px-6 py-5">
          <p className="text-base font-semibold text-foreground">Free</p>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-foreground">무료</span>
          </div>
          <ul className="mt-5 flex flex-col gap-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconCheck size={14} stroke={2} className="shrink-0 text-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">가입 후 7일간 무료 체험</p>
          <div className="mt-auto pt-6">
            <Link
              href="/login"
              className="block w-full rounded-[6px] border border-border py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </div>

      {/* Pro 카드 (월간·연간 동시 노출) */}
      <div className="flex flex-col overflow-hidden rounded-[12px] border-2 border-blue-400/60 bg-card">
        <div className="border-b border-border px-6 py-5">
          <p className="text-base font-semibold text-foreground">Pro</p>
        </div>
        <div className="flex flex-1 flex-col p-6">

          {/* 월간·연간 가격 (항상 동시 노출) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 월간 */}
            <div className="flex flex-col gap-3 rounded-[8px] border border-border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">월간</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums text-foreground">{formatKrw(PRO_MONTHLY_PRICE_KRW)}</span>
                <span className="text-xs text-muted-foreground">/ 월</span>
              </div>
              <p className="text-[11px] text-muted-foreground">VAT 포함</p>
              <Link
                href="/login"
                className="mt-auto block w-full rounded-[6px] border border-border py-2 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted/30"
              >
                월간으로 Pro 시작하기
              </Link>
            </div>

            {/* 연간 */}
            <div className="flex flex-col gap-3 rounded-[8px] border border-blue-400/40 bg-blue-500/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">연간</p>
                <span className="rounded-[3px] bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                  {PRO_ANNUAL_FREE_MONTHS}개월 무료
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums text-foreground">{formatKrw(PRO_ANNUAL_PRICE_KRW)}</span>
                <span className="text-xs text-muted-foreground">/ 년</span>
              </div>
              <p className="text-[11px] text-muted-foreground">VAT 포함 · 월 {formatKrw(PRO_ANNUAL_MONTHLY_EQUIVALENT_KRW)} 상당</p>
              <Link
                href="/login"
                className="mt-auto block w-full rounded-[6px] bg-foreground py-2 text-center text-xs font-medium text-background transition-opacity hover:opacity-90"
              >
                연간으로 Pro 시작하기
              </Link>
            </div>
          </div>

          {/* 기능 목록 */}
          <ul className="mt-5 flex flex-col gap-2">
            {PRO_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm text-muted-foreground">
                <IconCheck size={14} stroke={2} className="mt-0.5 shrink-0 text-foreground" />
                <div>
                  <p className="text-foreground">{f.label}</p>
                  {f.desc && <p className="mt-0.5 text-xs text-muted-foreground">{f.desc}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">{TAX_NOTICE_KO}</p>
    </div>
  );
}
