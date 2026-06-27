// 어닝콜 요약 페이지(/calls) Mock 데이터 + 타입 정의
// 실제 API 연동 전까지 사용하는 임시 데이터입니다.
// 이후 earnings_calls 테이블 → 이 타입으로 매핑만 하면 동작하도록 설계합니다.

export type GuidanceDirection = "up" | "maintain" | "down";

export interface KeyStatement {
  /** 발언 요약 (한국어, 사실 서술) */
  text: string;
  /** 발언 주체 (CEO / CFO 등) */
  role: string;
}

export interface QaPair {
  question: string;
  answer: string;
}

export interface KeywordChange {
  keyword: string;
  /** 전분기 대비 언급 증감 */
  direction: "up" | "down";
}

export interface EarningsCall {
  ticker: string;
  company_name: string;
  /** 예: "Q1 FY2026" */
  quarter: string;
  /** ISO date, 예: "2026-06-24" */
  call_date: string;
  /** 상대시간 표현, 예: "3일 전" */
  relative_time: string;

  /** 이번 콜 핵심 요약 (2~3문장, 사실 서술) */
  headline_summary: string;

  // 실적 요약 (수치만)
  revenue_actual: string;
  revenue_estimate: string;
  eps_actual: string;
  eps_estimate: string;
  surprise_percent: number;

  // 가이던스
  guidance_direction: GuidanceDirection;
  /** 전분기 가이던스 방향 (전분기 대비 변화 표시용) */
  guidance_previous: GuidanceDirection;
  guidance_summary: string;

  // 핵심 키워드 (TOP 8)
  keywords: string[];

  // 경영진 핵심 발언 (3개)
  key_statements: KeyStatement[];

  // Q&A 핵심 문답 (2건)
  qa_pairs: QaPair[];

  // 전분기 대비 변화
  keyword_changes: KeywordChange[];
  /** 경영진 발언 톤 */
  tone_previous: string;
  tone_current: string;

  // 메타
  /** 실적 서프라이즈 발표 여부 (실적 발표 배지) */
  has_earnings_release: boolean;
  /** 와치리스트 등록 종목 여부 (내 종목만 필터용) */
  in_watchlist: boolean;
  source_url: string;
  transcript_url: string;
  /** 수집 시각, 예: "2026-06-27 09:32 KST" */
  summary_generated_at: string;
}

export const MOCK_EARNINGS_CALLS: EarningsCall[] = [
  {
    ticker: "NVDA",
    company_name: "NVIDIA Corporation",
    quarter: "Q1 FY2026",
    call_date: "2026-06-24",
    relative_time: "3일 전",
    headline_summary:
      "이번 어닝콜에서는 데이터센터 매출 증가와 Blackwell 공급 확대가 핵심으로 언급되었습니다. 회사는 다음 분기 가이던스를 상향 조정했으며 중국 수출 규제 영향은 제한적이라고 설명했습니다.",
    revenue_actual: "$44.1B",
    revenue_estimate: "$43.2B",
    eps_actual: "0.89",
    eps_estimate: "0.85",
    surprise_percent: 2.1,
    guidance_direction: "up",
    guidance_previous: "maintain",
    guidance_summary:
      "다음 분기 매출 가이던스를 $45~46B로 제시했습니다. 이전 가이던스($42~43B) 대비 상향 조정되었습니다.",
    keywords: ["AI", "Blackwell", "Data Center", "Cloud", "Margin", "China", "Networking", "Supply"],
    key_statements: [
      { text: "Blackwell 플랫폼 수요가 공급을 초과하고 있다고 밝혔습니다.", role: "CEO" },
      { text: "데이터센터 매출 비중이 지속적으로 증가하고 있다고 설명했습니다.", role: "CFO" },
      { text: "AI 인프라 투자 확대가 계속되고 있다고 언급했습니다.", role: "CEO" },
    ],
    qa_pairs: [
      {
        question: "중국 수출 규제 영향은?",
        answer: "규제를 준수하는 범위 내에서 대체 제품을 개발 중이라고 설명했습니다.",
      },
      {
        question: "Blackwell 공급 일정은?",
        answer: "하반기 본격 양산을 예정하고 있으며 수요 대비 공급이 타이트하다고 답했습니다.",
      },
    ],
    keyword_changes: [
      { keyword: "Gaming", direction: "down" },
      { keyword: "Blackwell", direction: "up" },
      { keyword: "Networking", direction: "up" },
    ],
    tone_previous: "신중",
    tone_current: "낙관적",
    has_earnings_release: true,
    in_watchlist: true,
    source_url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=NVDA",
    transcript_url: "https://www.example.com/transcripts/nvda-q1-fy2026",
    summary_generated_at: "2026-06-27 09:32 KST",
  },
  {
    ticker: "TSLA",
    company_name: "Tesla, Inc.",
    quarter: "Q1 FY2026",
    call_date: "2026-06-20",
    relative_time: "1주 전",
    headline_summary:
      "이번 어닝콜에서는 차량 인도량과 에너지 저장 사업 성장이 함께 언급되었습니다. 회사는 연간 인도 목표를 하향 조정했으며 사이버트럭 생산 정상화 시점을 다음 분기로 제시했습니다.",
    revenue_actual: "$25.4B",
    revenue_estimate: "$26.1B",
    eps_actual: "0.62",
    eps_estimate: "0.71",
    surprise_percent: -12.7,
    guidance_direction: "down",
    guidance_previous: "maintain",
    guidance_summary:
      "연간 차량 인도 목표를 기존 대비 약 10~15% 하향 조정했습니다. 사이버트럭 생산 차질과 일부 시장 수요 둔화를 근거로 제시했습니다.",
    keywords: ["FSD", "Cybertruck", "Energy", "Margin", "Production", "Robotaxi", "Demand", "China"],
    key_statements: [
      { text: "사이버트럭 생산 차질이 일시적이며 다음 분기 정상화를 예상한다고 밝혔습니다.", role: "CEO" },
      { text: "에너지 저장 사업 매출이 전분기 대비 증가했다고 설명했습니다.", role: "CFO" },
      { text: "FSD 구독 모델 전환을 검토하고 있다고 언급했습니다.", role: "CEO" },
    ],
    qa_pairs: [
      {
        question: "사이버트럭 생산 차질 원인은?",
        answer: "부품 공급망 이슈로 인한 일시적 지연이며 다음 분기 내 정상화를 목표한다고 답했습니다.",
      },
      {
        question: "FSD 수익화 일정은?",
        answer: "구독 모델 전환을 검토 중이며 규제 승인 일정에 따라 유동적이라고 설명했습니다.",
      },
    ],
    keyword_changes: [
      { keyword: "Production", direction: "down" },
      { keyword: "Energy", direction: "up" },
      { keyword: "Robotaxi", direction: "up" },
    ],
    tone_previous: "낙관적",
    tone_current: "신중",
    has_earnings_release: true,
    in_watchlist: true,
    source_url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=TSLA",
    transcript_url: "https://www.example.com/transcripts/tsla-q1-fy2026",
    summary_generated_at: "2026-06-27 09:32 KST",
  },
  {
    ticker: "MSFT",
    company_name: "Microsoft Corporation",
    quarter: "Q4 FY2025",
    call_date: "2026-06-12",
    relative_time: "2주 전",
    headline_summary:
      "이번 어닝콜에서는 Azure 클라우드 성장과 Copilot 도입 확대가 핵심으로 언급되었습니다. 회사는 다음 분기 가이던스를 기존 수준으로 유지했으며 자본 지출 증가 계획을 밝혔습니다.",
    revenue_actual: "$64.7B",
    revenue_estimate: "$64.1B",
    eps_actual: "3.05",
    eps_estimate: "2.94",
    surprise_percent: 3.7,
    guidance_direction: "maintain",
    guidance_previous: "up",
    guidance_summary:
      "다음 분기 매출 가이던스를 기존 범위로 유지했습니다. 클라우드 부문 성장률은 전분기와 유사한 수준을 제시했습니다.",
    keywords: ["Azure", "Copilot", "AI", "Cloud", "CapEx", "Office", "Gaming", "Margin"],
    key_statements: [
      { text: "Azure 매출 성장률이 전분기 수준을 유지했다고 밝혔습니다.", role: "CEO" },
      { text: "AI 인프라 확충을 위한 자본 지출이 증가할 것이라고 설명했습니다.", role: "CFO" },
      { text: "Copilot 상용 도입 고객 수가 확대되고 있다고 언급했습니다.", role: "CEO" },
    ],
    qa_pairs: [
      {
        question: "자본 지출 증가 폭은?",
        answer: "AI 데이터센터 수요에 맞춰 다음 분기에도 증가할 것이라고 답했습니다.",
      },
      {
        question: "Copilot 수익 기여도는?",
        answer: "현재 초기 단계이며 도입 고객 확대에 따라 점진적으로 반영된다고 설명했습니다.",
      },
    ],
    keyword_changes: [
      { keyword: "Copilot", direction: "up" },
      { keyword: "CapEx", direction: "up" },
      { keyword: "Gaming", direction: "down" },
    ],
    tone_previous: "낙관적",
    tone_current: "낙관적",
    has_earnings_release: true,
    in_watchlist: false,
    source_url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=MSFT",
    transcript_url: "https://www.example.com/transcripts/msft-q4-fy2025",
    summary_generated_at: "2026-06-27 09:32 KST",
  },
  {
    ticker: "AAPL",
    company_name: "Apple Inc.",
    quarter: "Q3 FY2025",
    call_date: "2026-05-30",
    relative_time: "4주 전",
    headline_summary:
      "이번 어닝콜에서는 서비스 부문 매출 성장과 신제품 출시 일정이 언급되었습니다. 회사는 다음 분기 가이던스를 유지했으며 환율 영향에 대해 설명했습니다.",
    revenue_actual: "$85.8B",
    revenue_estimate: "$84.5B",
    eps_actual: "1.42",
    eps_estimate: "1.39",
    surprise_percent: 2.2,
    guidance_direction: "maintain",
    guidance_previous: "maintain",
    guidance_summary:
      "다음 분기 매출 가이던스를 기존 범위로 유지했습니다. 서비스 부문은 두 자릿수 성장률을 유지할 것으로 제시했습니다.",
    keywords: ["Services", "iPhone", "Vision", "China", "FX", "Margin", "Wearables", "Mac"],
    key_statements: [
      { text: "서비스 부문 매출이 사상 최고치를 기록했다고 밝혔습니다.", role: "CEO" },
      { text: "환율 변동이 매출에 일부 영향을 미쳤다고 설명했습니다.", role: "CFO" },
      { text: "신제품 출시를 다음 분기로 계획하고 있다고 언급했습니다.", role: "CEO" },
    ],
    qa_pairs: [
      {
        question: "중국 시장 수요는?",
        answer: "전년 대비 소폭 회복되었으나 경쟁이 심화되고 있다고 답했습니다.",
      },
      {
        question: "서비스 성장 지속 가능성은?",
        answer: "구독 기반 매출 확대에 따라 두 자릿수 성장이 이어질 것이라고 설명했습니다.",
      },
    ],
    keyword_changes: [
      { keyword: "Services", direction: "up" },
      { keyword: "iPhone", direction: "down" },
      { keyword: "Vision", direction: "up" },
    ],
    tone_previous: "신중",
    tone_current: "신중",
    has_earnings_release: true,
    in_watchlist: false,
    source_url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AAPL",
    transcript_url: "https://www.example.com/transcripts/aapl-q3-fy2025",
    summary_generated_at: "2026-06-27 09:32 KST",
  },
  {
    ticker: "AMZN",
    company_name: "Amazon.com, Inc.",
    quarter: "Q1 FY2026",
    call_date: "2026-04-28",
    relative_time: "2개월 전",
    headline_summary:
      "이번 어닝콜에서는 AWS 성장 재가속과 광고 사업 확대가 언급되었습니다. 회사는 다음 분기 영업이익 가이던스를 상향했으며 물류 효율화 성과를 설명했습니다.",
    revenue_actual: "$158.2B",
    revenue_estimate: "$155.0B",
    eps_actual: "1.12",
    eps_estimate: "0.98",
    surprise_percent: 14.3,
    guidance_direction: "up",
    guidance_previous: "maintain",
    guidance_summary:
      "다음 분기 영업이익 가이던스를 상향 조정했습니다. AWS 성장 재가속과 물류 비용 절감을 근거로 제시했습니다.",
    keywords: ["AWS", "Advertising", "Logistics", "AI", "Retail", "Margin", "Prime", "CapEx"],
    key_statements: [
      { text: "AWS 매출 성장률이 다시 가속되고 있다고 밝혔습니다.", role: "CEO" },
      { text: "광고 사업 매출이 전년 대비 큰 폭으로 증가했다고 설명했습니다.", role: "CFO" },
      { text: "물류 네트워크 효율화로 배송 비용이 감소했다고 언급했습니다.", role: "CEO" },
    ],
    qa_pairs: [
      {
        question: "AWS 성장 재가속 배경은?",
        answer: "생성형 AI 워크로드 수요 증가가 주요 요인이라고 답했습니다.",
      },
      {
        question: "광고 사업 전망은?",
        answer: "프라임 비디오 광고 도입 효과가 본격 반영될 것이라고 설명했습니다.",
      },
    ],
    keyword_changes: [
      { keyword: "AWS", direction: "up" },
      { keyword: "Advertising", direction: "up" },
      { keyword: "Logistics", direction: "down" },
    ],
    tone_previous: "신중",
    tone_current: "낙관적",
    has_earnings_release: true,
    in_watchlist: true,
    source_url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AMZN",
    transcript_url: "https://www.example.com/transcripts/amzn-q1-fy2026",
    summary_generated_at: "2026-06-27 09:32 KST",
  },
  {
    ticker: "GOOGL",
    company_name: "Alphabet Inc.",
    quarter: "Q1 FY2026",
    call_date: "2026-04-22",
    relative_time: "2개월 전",
    headline_summary:
      "이번 어닝콜에서는 검색 광고 회복과 Gemini 모델 통합이 언급되었습니다. 회사는 다음 분기 가이던스를 유지했으며 클라우드 부문 수익성 개선을 설명했습니다.",
    revenue_actual: "$90.2B",
    revenue_estimate: "$89.1B",
    eps_actual: "2.18",
    eps_estimate: "2.05",
    surprise_percent: 6.3,
    guidance_direction: "maintain",
    guidance_previous: "down",
    guidance_summary:
      "다음 분기 매출 가이던스를 기존 범위로 유지했습니다. 클라우드 부문은 흑자 기조를 이어갈 것으로 제시했습니다.",
    keywords: ["Search", "Gemini", "Cloud", "YouTube", "AI", "Ads", "Margin", "CapEx"],
    key_statements: [
      { text: "검색 광고 매출이 안정적으로 회복되고 있다고 밝혔습니다.", role: "CEO" },
      { text: "클라우드 부문이 흑자 기조를 유지했다고 설명했습니다.", role: "CFO" },
      { text: "Gemini 모델을 주요 제품에 통합하고 있다고 언급했습니다.", role: "CEO" },
    ],
    qa_pairs: [
      {
        question: "AI 통합에 따른 검색 수익 영향은?",
        answer: "AI 개요 도입 후에도 광고 단가가 유지되고 있다고 답했습니다.",
      },
      {
        question: "클라우드 수익성 개선 요인은?",
        answer: "대형 고객 계약 증가와 인프라 효율화가 기여했다고 설명했습니다.",
      },
    ],
    keyword_changes: [
      { keyword: "Gemini", direction: "up" },
      { keyword: "Cloud", direction: "up" },
      { keyword: "Ads", direction: "down" },
    ],
    tone_previous: "신중",
    tone_current: "낙관적",
    has_earnings_release: true,
    in_watchlist: false,
    source_url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=GOOGL",
    transcript_url: "https://www.example.com/transcripts/googl-q1-fy2026",
    summary_generated_at: "2026-06-27 09:32 KST",
  },
];

export const CALLS_LAST_UPDATED = "2026-06-27 09:32 KST";
