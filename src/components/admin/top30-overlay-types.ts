// Top 30 Ticker Overlay가 서버(top30-overlay-data.ts)와 클라이언트
// (top30-ticker-overlay.tsx) 양쪽에서 공유하는 타입·상수.
//
// "use client" 파일(top30-ticker-overlay.tsx)에 PALETTE가 있었을 때, 서버 쪽
// top30-overlay-data.ts가 그 값을 import하면 Next.js가 "use client" 모듈의
// export를 클라이언트 경계 참조로 취급해 PALETTE가 undefined로 넘어오는
// 문제가 있었다(실데이터 연동 후 라인에 stroke 색상이 아예 빠지던 버그의
// 원인). "use client"가 없는 이 파일로 분리해 양쪽 모두 안전하게 import한다.

// 색상 팔레트를 N개로 제한하고 순환시킨다 (Tableau10 계열, 10색).
export const PALETTE = [
  "#4e79a7",
  "#f28e2b",
  "#59a14f",
  "#e15759",
  "#76b7b2",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
];

export type Ticker = {
  symbol: string;
  color: string;
  status: "top30" | "dropped";
  // top30_daily.rank 그대로 사용 (top30 목록 정렬 기준). dropped 종목은
  // 탈락 전(어제) 순위를 보존값으로 담아두지만 화면에는 표시하지 않는다.
  rank: number;
  prices: number[];
};

export type DataSet = {
  tickers: Ticker[];
  dates: string[];
};
