export interface MacroIndicator {
  seriesId: string;
  name: string;
  nameEn: string;
  desc: string;
  value: number | null;
  previousValue: number | null;
  unit: string;
  valueType?: "pct_change" | "million_to_eok" | "billion_to_jo_eok" | "thousand_to_man";
  releasedAt: string;
  source: string;
  history: { date: string; value: number }[];
  group: string;
}

export interface MacroGroup {
  key: string;
  label: string;
  indicators: MacroIndicator[];
}

export const SERIES_META: Record<
  string,
  {
    seriesId: string;
    name: string;
    nameEn: string;
    desc: string;
    unit: string;
    valueType?: "pct_change" | "million_to_eok" | "billion_to_jo_eok" | "thousand_to_man";
    group: string;
  }
> = {
  기준금리: {
    seriesId: "FEDFUNDS",
    name: "기준금리",
    nameEn: "FEDFUNDS",
    desc: "미국 연준(Federal Reserve)이 설정하는 정책금리. 모든 금리의 기준이 됩니다.",
    unit: "%",
    group: "금리",
  },
  "10년물 국채금리": {
    seriesId: "DGS10",
    name: "10년물 국채금리",
    nameEn: "DGS10",
    desc: "미국 10년 만기 국채 금리(10-Year Treasury Yield). 장기 금리의 기준입니다.",
    unit: "%",
    group: "금리",
  },
  CPI: {
    seriesId: "CPIAUCSL",
    name: "소비자물가지수",
    nameEn: "CPI",
    desc: "소비자물가지수(Consumer Price Index). 전월 대비 변화율로 표시됩니다.",
    unit: "%",
    valueType: "pct_change",
    group: "물가",
  },
  PCE: {
    seriesId: "PCEPI",
    name: "개인소비지출물가",
    nameEn: "PCE",
    desc: "개인소비지출 물가지수(PCE). 연준이 CPI보다 더 중시하는 인플레이션 지표로, 기준금리 결정의 실질 기준입니다.",
    unit: "%",
    valueType: "pct_change",
    group: "물가",
  },
  실업률: {
    seriesId: "UNRATE",
    name: "실업률",
    nameEn: "UNRATE",
    desc: "미국 실업률(Unemployment Rate). 경제활동인구 중 실업자 비율입니다.",
    unit: "%",
    group: "고용",
  },
  구인건수: {
    seriesId: "JTSJOL",
    name: "구인건수",
    nameEn: "JOLTS",
    desc: "구인건수(Job Openings). 기업이 채용 중인 일자리 수로, 실업률을 보완하는 고용 선행지표입니다.",
    unit: "",
    valueType: "thousand_to_man",
    group: "고용",
  },
  GDP: {
    seriesId: "GDP",
    name: "국내총생산",
    nameEn: "GDP",
    desc: "미국 국내총생산(Gross Domestic Product). 경제 전체 생산 규모를 나타냅니다.",
    unit: "",
    valueType: "billion_to_jo_eok",
    group: "경기",
  },
  소매판매: {
    seriesId: "RSXFS",
    name: "소매판매",
    nameEn: "RSXFS",
    desc: "미국 소매판매(Retail Sales). 소비자 지출 규모를 나타냅니다.",
    unit: "",
    valueType: "million_to_eok",
    group: "경기",
  },
  "달러 인덱스": {
    seriesId: "DTWEXBGS",
    name: "달러 인덱스",
    nameEn: "DXY",
    desc: "미국 달러의 주요국 통화 대비 강도 지수. 달러 강세는 원화 환율과 나스닥 환전 수익률에 직접 영향을 줍니다.",
    unit: "",
    group: "환율",
  },
};

export const GROUP_ORDER = ["금리", "물가", "고용", "경기", "환율"];

export const GROUP_COLORS: Record<string, string> = {
  금리: "#60a5fa",
  물가: "#fb923c",
  고용: "#a78bfa",
  경기: "#34d399",
  환율: "#fbbf24",
};

// 천 건 → 만 건 (JOLTS: 단위 thousands → 만 건 표시)
export function fmtThousandToMan(v: number): string {
  const man = Math.round(v / 10);
  return `${man.toLocaleString("ko-KR")}만 건`;
}

// 백만 달러 → 억 달러 (1백만 달러 = 0.01억 달러, 100백만 달러 = 1억 달러)
export function fmtMillionToEok(v: number): string {
  const eok = Math.round(v / 100);
  return `${eok.toLocaleString("ko-KR")}억 달러`;
}

// 십억 달러 → X조 Y,ZZZ억 달러 (1십억 달러 = 10억 달러 = 0.001조 달러)
export function fmtBillionToJoEok(v: number): string {
  const jo = Math.floor(v / 1000);
  const rem = Math.round((v % 1000) * 10); // 억 단위
  if (jo === 0) return `${rem.toLocaleString("ko-KR")}억 달러`;
  if (rem === 0) return `${jo.toLocaleString("ko-KR")}조 달러`;
  return `${jo.toLocaleString("ko-KR")}조 ${rem.toLocaleString("ko-KR")}억 달러`;
}

export function formatMainValue(ind: MacroIndicator): string {
  const { value, previousValue, unit, valueType } = ind;
  if (value == null) return "—";

  if (valueType === "pct_change") {
    if (previousValue == null || previousValue === 0) return "—";
    const change = ((value - previousValue) / previousValue) * 100;
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  }
  if (valueType === "million_to_eok") return fmtMillionToEok(value);
  if (valueType === "billion_to_jo_eok") return fmtBillionToJoEok(value);
  if (valueType === "thousand_to_man") return fmtThousandToMan(value);

  const formatted = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return unit === "%" ? `${formatted}%` : formatted;
}

export function formatPrevValue(ind: MacroIndicator): string {
  const { previousValue, unit, valueType } = ind;
  if (previousValue == null) return "—";

  if (valueType === "million_to_eok") return fmtMillionToEok(previousValue);
  if (valueType === "billion_to_jo_eok") return fmtBillionToJoEok(previousValue);
  if (valueType === "thousand_to_man") return fmtThousandToMan(previousValue);

  const formatted = previousValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return unit === "%" ? `${formatted}%` : formatted;
}
