// 미국 주요 거시경제지표 mock 데이터
// 주의: 본 데이터는 "최근 발표 현황"을 모니터링하기 위한 것으로,
// 경기 전망/투자 의견과는 무관합니다. 강세·약세·호재·악재 등 해석 표현은 사용하지 않습니다.

export type ChangeDirection = "up" | "down" | "flat";

export interface MacroIndicator {
  id: string;
  name: string; // 한글 지표명 (예: 미국 기준금리)
  code: string; // FRED 코드 (예: FEDFUNDS)
  codeDesc: string; // 약어 한글 설명 (예: 미국 연방기금금리)
  value: number; // 현재 값
  unit: string; // 단위 (%, 만 건, 조 달러 등)
  // 전월(또는 직전 발표) 대비 변화량 (단위는 changeUnit)
  changeValue: number;
  changeUnit: string;
  changeDirection: ChangeDirection;
  // 최근 12개월(또는 12개 발표) 추이 — 미니 라인차트용
  history: number[];
  lastReleaseDate: string; // 최근 발표일 (YYYY-MM-DD)
  nextReleaseDate: string | null; // 다음 발표 예정일, 없으면 null → "미정"
  fredUrl: string;
}

export interface MacroGroup {
  id: string;
  title: string; // 금리 / 물가 / 고용 / 성장
  indicators: MacroIndicator[];
}

export interface ScheduleItem {
  date: string; // 발표일 (YYYY-MM-DD)
  indicator: string; // 경제지표명
  frequency: string; // 주기 (월간/분기/주간)
}

export interface UpdateItem {
  group: string; // 상대 시점 그룹 (오늘/어제/이번 주)
  label: string; // 표시 문구 (예: GDP 성장률 발표)
  relativeTime: string; // 2시간 전 등
}

export const MACRO_REFERENCE_DATE = "2026-06-27";
export const MACRO_LAST_UPDATED = "2026-06-27 09:32 KST";

function fred(code: string) {
  return `https://fred.stlouisfed.org/series/${code}`;
}

export const MACRO_GROUPS: MacroGroup[] = [
  {
    id: "rates",
    title: "금리",
    indicators: [
      {
        id: "fedfunds",
        name: "미국 기준금리",
        code: "FEDFUNDS",
        codeDesc: "미국 연방기금금리",
        value: 4.5,
        unit: "%",
        changeValue: 0,
        changeUnit: "%p",
        changeDirection: "flat",
        history: [5.33, 5.33, 5.33, 5.08, 5.08, 4.83, 4.83, 4.58, 4.58, 4.5, 4.5, 4.5],
        lastReleaseDate: "2026-06-18",
        nextReleaseDate: "2026-07-29",
        fredUrl: fred("FEDFUNDS"),
      },
      {
        id: "dgs10",
        name: "미국 국채 10년물",
        code: "DGS10",
        codeDesc: "10년 만기 국채 금리",
        value: 4.28,
        unit: "%",
        changeValue: 0.06,
        changeUnit: "%p",
        changeDirection: "up",
        history: [4.02, 4.15, 4.33, 4.45, 4.58, 4.62, 4.5, 4.41, 4.35, 4.3, 4.22, 4.28],
        lastReleaseDate: "2026-06-26",
        nextReleaseDate: "2026-06-27",
        fredUrl: fred("DGS10"),
      },
      {
        id: "dgs2",
        name: "미국 국채 2년물",
        code: "DGS2",
        codeDesc: "2년 만기 국채 금리",
        value: 3.91,
        unit: "%",
        changeValue: 0.04,
        changeUnit: "%p",
        changeDirection: "down",
        history: [4.7, 4.66, 4.72, 4.68, 4.55, 4.42, 4.28, 4.15, 4.05, 3.98, 3.95, 3.91],
        lastReleaseDate: "2026-06-26",
        nextReleaseDate: "2026-06-27",
        fredUrl: fred("DGS2"),
      },
    ],
  },
  {
    id: "prices",
    title: "물가",
    indicators: [
      {
        id: "cpi",
        name: "소비자물가지수",
        code: "CPI",
        codeDesc: "소비자물가지수",
        value: 0.2,
        unit: "% (전월 대비)",
        changeValue: 0.1,
        changeUnit: "%p",
        changeDirection: "down",
        history: [0.4, 0.3, 0.4, 0.3, 0.2, 0.3, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2],
        lastReleaseDate: "2026-06-12",
        nextReleaseDate: "2026-07-11",
        fredUrl: fred("CPIAUCSL"),
      },
      {
        id: "pce",
        name: "개인소비지출물가",
        code: "PCE",
        codeDesc: "개인소비지출 물가지수",
        value: 0.1,
        unit: "% (전월 대비)",
        changeValue: 0.1,
        changeUnit: "%p",
        changeDirection: "down",
        history: [0.3, 0.3, 0.2, 0.3, 0.2, 0.2, 0.2, 0.1, 0.2, 0.2, 0.2, 0.1],
        lastReleaseDate: "2026-06-27",
        nextReleaseDate: "2026-07-31",
        fredUrl: fred("PCEPI"),
      },
      {
        id: "ppi",
        name: "생산자물가지수",
        code: "PPI",
        codeDesc: "생산자물가지수",
        value: 0.3,
        unit: "% (전월 대비)",
        changeValue: 0.2,
        changeUnit: "%p",
        changeDirection: "up",
        history: [0.2, 0.1, 0.3, 0.2, 0.1, 0.2, 0.3, 0.1, 0.2, 0.1, 0.1, 0.3],
        lastReleaseDate: "2026-06-13",
        nextReleaseDate: "2026-07-15",
        fredUrl: fred("PPIACO"),
      },
    ],
  },
  {
    id: "employment",
    title: "고용",
    indicators: [
      {
        id: "nfp",
        name: "비농업 고용",
        code: "NFP",
        codeDesc: "비농업 부문 신규 고용",
        value: 19.4,
        unit: "만 명",
        changeValue: 2.2,
        changeUnit: "만 명",
        changeDirection: "down",
        history: [25.6, 22.7, 27.2, 23.1, 18.5, 21.6, 22.7, 20.3, 17.5, 21.6, 21.6, 19.4],
        lastReleaseDate: "2026-06-06",
        nextReleaseDate: "2026-07-03",
        fredUrl: fred("PAYEMS"),
      },
      {
        id: "unrate",
        name: "실업률",
        code: "UNRATE",
        codeDesc: "미국 실업률",
        value: 4.1,
        unit: "%",
        changeValue: 0.1,
        changeUnit: "%p",
        changeDirection: "up",
        history: [3.7, 3.8, 3.9, 3.9, 4.0, 4.1, 4.0, 4.1, 4.0, 4.0, 4.0, 4.1],
        lastReleaseDate: "2026-06-06",
        nextReleaseDate: "2026-07-03",
        fredUrl: fred("UNRATE"),
      },
      {
        id: "icsa",
        name: "신규 실업수당 청구",
        code: "ICSA",
        codeDesc: "주간 신규 실업수당 청구 건수",
        value: 24.5,
        unit: "만 건",
        changeValue: 0.6,
        changeUnit: "만 건",
        changeDirection: "up",
        history: [21.2, 22.0, 21.8, 22.5, 23.1, 22.8, 23.4, 23.9, 24.1, 23.8, 23.9, 24.5],
        lastReleaseDate: "2026-06-26",
        nextReleaseDate: "2026-07-03",
        fredUrl: fred("ICSA"),
      },
    ],
  },
  {
    id: "growth",
    title: "성장",
    indicators: [
      {
        id: "gdp",
        name: "GDP 성장률",
        code: "GDP",
        codeDesc: "국내총생산 성장률 (연율, 분기)",
        value: 2.4,
        unit: "%",
        changeValue: 0.4,
        changeUnit: "%p",
        changeDirection: "down",
        history: [2.1, 2.1, 2.1, 3.4, 3.4, 3.4, 2.8, 2.8, 2.8, 2.4, 2.4, 2.4],
        lastReleaseDate: "2026-06-26",
        nextReleaseDate: "2026-07-30",
        fredUrl: fred("GDP"),
      },
      {
        id: "rsxfs",
        name: "소매판매",
        code: "RSXFS",
        codeDesc: "소매·외식 판매액 (전월 대비)",
        value: 0.4,
        unit: "% (전월 대비)",
        changeValue: 0.3,
        changeUnit: "%p",
        changeDirection: "up",
        history: [0.6, 0.3, 0.7, 0.2, 0.4, 0.1, 0.5, 0.3, 0.2, 0.1, 0.1, 0.4],
        lastReleaseDate: "2026-06-17",
        nextReleaseDate: "2026-07-16",
        fredUrl: fred("RSXFS"),
      },
      {
        id: "indpro",
        name: "산업생산",
        code: "INDPRO",
        codeDesc: "산업생산지수 (전월 대비)",
        value: 0.1,
        unit: "% (전월 대비)",
        changeValue: 0.2,
        changeUnit: "%p",
        changeDirection: "down",
        history: [0.3, 0.2, 0.4, 0.1, 0.3, 0.2, 0.1, 0.3, 0.2, 0.3, 0.3, 0.1],
        lastReleaseDate: "2026-06-17",
        nextReleaseDate: "2026-07-16",
        fredUrl: fred("INDPRO"),
      },
    ],
  },
];

// 발표 예정 일정 (시간순 정렬)
export const MACRO_SCHEDULE: ScheduleItem[] = [
  { date: "2026-07-03", indicator: "비농업 고용 (NFP)", frequency: "월간" },
  { date: "2026-07-03", indicator: "실업률 (UNRATE)", frequency: "월간" },
  { date: "2026-07-11", indicator: "소비자물가지수 (CPI)", frequency: "월간" },
  { date: "2026-07-15", indicator: "생산자물가지수 (PPI)", frequency: "월간" },
  { date: "2026-07-16", indicator: "소매판매 (RSXFS)", frequency: "월간" },
  { date: "2026-07-16", indicator: "산업생산 (INDPRO)", frequency: "월간" },
  { date: "2026-07-29", indicator: "기준금리 (FEDFUNDS)", frequency: "FOMC" },
  { date: "2026-07-30", indicator: "GDP 성장률 (GDP)", frequency: "분기" },
  { date: "2026-07-31", indicator: "개인소비지출물가 (PCE)", frequency: "월간" },
];

// 최근 업데이트된 경제지표 (최신순)
export const MACRO_RECENT_UPDATES: UpdateItem[] = [
  { group: "오늘", label: "개인소비지출물가(PCE) 발표", relativeTime: "2시간 전" },
  { group: "오늘", label: "국채 10년물 / 2년물 금리 갱신", relativeTime: "5시간 전" },
  { group: "어제", label: "GDP 성장률 발표", relativeTime: "1일 전" },
  { group: "어제", label: "신규 실업수당 청구 발표", relativeTime: "1일 전" },
  { group: "이번 주", label: "소매판매 / 산업생산 발표", relativeTime: "3일 전" },
  { group: "이번 주", label: "생산자물가지수(PPI) 발표", relativeTime: "4일 전" },
  { group: "이번 주", label: "소비자물가지수(CPI) 발표", relativeTime: "5일 전" },
];
