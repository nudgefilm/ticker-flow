// KR(KRX)·US(NYSE) 정규장 개장 상태 계산 — src/components/dashboard/market-clock.tsx
// (대시보드 우하단 고정 위젯)와 히어로 LIVE 위젯(src/components/hero/
// live-market-widget.tsx)이 이 파일을 공유한다. 로직을 두 곳에 중복
// 구현하지 않기 위해 순수 계산 부분만 이곳으로 분리했다 — 동작은 기존과
// 동일, 위치만 이동.

export type MarketId = "KRX" | "NYSE";

export interface MarketDef {
  id: MarketId;
  label: string;
  city: string;
  timeZone: string;
  open: number; // 정규장 시작 (자정 기준 분)
  close: number; // 정규장 종료 (자정 기준 분)
}

export const MARKETS: MarketDef[] = [
  { id: "KRX", label: "KR · KOSPI · KRX", city: "서울", timeZone: "Asia/Seoul", open: 9 * 60, close: 15 * 60 + 30 },
  { id: "NYSE", label: "US · S&P 500 · NYSE", city: "뉴욕", timeZone: "America/New_York", open: 9 * 60 + 30, close: 16 * 60 },
];

function getZonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const weekday = get("weekday");
  const hour = Number.parseInt(get("hour"), 10) % 24;
  const minute = Number.parseInt(get("minute"), 10);
  const second = Number.parseInt(get("second"), 10);
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  return { weekday, hour, minute, second, isWeekend };
}

export interface MarketState {
  def: MarketDef;
  hh: string;
  mm: string;
  ss: string;
  weekday: string;
  status: "OPEN" | "CLOSED" | "PRE";
}

// America/New_York 타임존을 Intl.DateTimeFormat에 넘기면 서머타임(EDT/EST)이
// 자동 반영된 현지 시각이 나오므로, 별도의 서머타임 계산 로직은 필요 없다.
export function computeState(def: MarketDef, now: Date): MarketState {
  const { hour, minute, second, weekday, isWeekend } = getZonedParts(now, def.timeZone);
  const minutesOfDay = hour * 60 + minute;
  const withinHours = minutesOfDay >= def.open && minutesOfDay < def.close;
  const isOpen = withinHours && !isWeekend;
  const status: MarketState["status"] = isOpen
    ? "OPEN"
    : !isWeekend && minutesOfDay < def.open
      ? "PRE"
      : "CLOSED";
  const pad = (n: number) => String(n).padStart(2, "0");
  return { def, hh: pad(hour), mm: pad(minute), ss: pad(second), weekday, status };
}

export const WEEKDAY_KO: Record<string, string> = {
  Mon: "월", Tue: "화", Wed: "수", Thu: "목", Fri: "금", Sat: "토", Sun: "일",
};

export function statusMeta(status: MarketState["status"]) {
  switch (status) {
    case "OPEN":
      return { text: "정규장", tone: "up" as const };
    case "PRE":
      return { text: "장전", tone: "warn" as const };
    default:
      return { text: "장마감", tone: "down" as const };
  }
}
