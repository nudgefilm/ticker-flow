// 이메일 클라이언트(특히 Gmail 앱)는 <head><style> 블록을 무시하는 경우가 있어,
// 모든 스타일을 요소별 style="" 속성에 직접 명시한다. 아래 상수는 반복되는
// 인라인 스타일 문자열을 재사용하기 위한 것일 뿐, <style> 클래스에 의존하지 않는다.
const HEADER_STYLE = "background:#111111;border-bottom:1px solid rgba(255,255,255,0.06);padding:28px 32px";
const BODY_STYLE = "padding:28px 32px";
const FOOTER_STYLE = "padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06)";
const H1_STYLE = "margin:0;font-size:20px;font-weight:600;color:#ffffff";
const P_STYLE = "margin:0 0 16px;font-size:16px;line-height:1.6;color:#a6a6a6";
const CTA_STYLE = "display:inline-block;background:#60a5fa;color:#0a0a0a;font-size:16px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px";

const DISCLAIMER = `
  <p style="margin:0 0 16px;font-size:11px;color:#666666;line-height:1.6">
    본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.<br>
    특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.<br>
    투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.
  </p>
`

const COPYRIGHT = `<p style="margin:12px 0 16px;font-size:11px;color:#666666">© 2026 언폴드랩. All rights reserved.</p>`

function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,sans-serif" bgcolor="#0a0a0a">
  <table cellpadding="0" cellspacing="0" style="width:100%;max-width:800px;margin:0 auto">
    <tr><td style="padding:24px 16px">
      <div style="background:#111111;border-radius:12px;overflow:hidden" bgcolor="#111111">${content}</div>
    </td></tr>
  </table>
</body>
</html>`
}

export function welcomeEmail(_email: string): string {
  return shell(`
    <div style="${HEADER_STYLE}">
      <h1 style="${H1_STYLE}">TickerFlow에 오신 것을 환영합니다 🎉</h1>
    </div>
    <div style="${BODY_STYLE}">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#cccccc">미국 기업의 중요한 변화를 놓치지 않도록 도와드리겠습니다.</p>
      <p style="${P_STYLE}">TickerFlow는 공시, 뉴스, 실적 일정을 한 곳에서 모니터링할 수 있는 한국 투자자를 위한 나스닥 대시보드입니다.</p>

      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#ffffff">주요 기능</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px">
        <tr>
          <td style="padding:10px 12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0;font-size:13px;color:#ffffff;font-weight:500">📋 공시 피드</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a6a6a6">SEC EDGAR 공시를 한국어 요약으로 빠르게 확인</p>
          </td>
        </tr>
        <tr><td style="height:6px;font-size:6px;line-height:6px">&nbsp;</td></tr>
        <tr>
          <td style="padding:10px 12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0;font-size:13px;color:#ffffff;font-weight:500">📰 뉴스 피드</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a6a6a6">관심 종목의 최신 뉴스를 한국어로 확인</p>
          </td>
        </tr>
        <tr><td style="height:6px;font-size:6px;line-height:6px">&nbsp;</td></tr>
        <tr>
          <td style="padding:10px 12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0;font-size:13px;color:#ffffff;font-weight:500">📅 실적 캘린더</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a6a6a6">향후 실적 발표 일정을 미리 확인</p>
          </td>
        </tr>
      </table>

      <a href="https://tickerflow.net/dashboard" style="${CTA_STYLE}">대시보드 시작하기</a>
    </div>
    <div style="${FOOTER_STYLE}">
      ${DISCLAIMER}
      ${COPYRIGHT}
    </div>
  `)
}

export function proUpgradeEmail(_email: string): string {
  return shell(`
    <div style="${HEADER_STYLE}">
      <h1 style="${H1_STYLE}">Pro 플랜이 시작되었습니다 ✨</h1>
    </div>
    <div style="${BODY_STYLE}">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#cccccc">이제 TickerFlow의 모든 기능을 이용하실 수 있습니다.</p>

      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#ffffff">Pro 전용 기능</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px">
        ${[
          ["🔍 공시 인사이트", "주요 공시의 핵심 변화를 심층 요약으로 확인"],
          ["🎙 어닝콜 요약", "실적 발표 콜 내용을 한국어로 정리"],
          ["👤 내부자 거래", "임원·대주주 매매 내역 실시간 모니터링"],
          ["🗺 섹터 히트맵", "섹터별 흐름을 한눈에 파악"],
          ["🔔 알림 설정", "관심 종목 이벤트 발생 시 즉시 알림"],
        ].map(([title, desc]) => `
          <tr>
            <td style="padding:10px 12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
              <p style="margin:0;font-size:13px;color:#ffffff;font-weight:500">${title}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#a6a6a6">${desc}</p>
            </td>
          </tr>
          <tr><td style="height:6px;font-size:6px;line-height:6px">&nbsp;</td></tr>
        `).join("")}
      </table>

      <a href="https://tickerflow.net/dashboard" style="${CTA_STYLE}">Pro 기능 확인하기</a>
    </div>
    <div style="${FOOTER_STYLE}">
      ${DISCLAIMER}
      ${COPYRIGHT}
    </div>
  `)
}

export function inboundForwardEmail(from: string, subject: string, body: string): string {
  return shell(`
    <div style="${HEADER_STYLE}">
      <h1 style="${H1_STYLE}">새 문의 이메일이 도착했습니다</h1>
    </div>
    <div style="${BODY_STYLE}">
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px">
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0 0 8px;font-size:12px;color:#a6a6a6">발신자</p>
            <p style="margin:0;font-size:13px;color:#ffffff">${escapeHtml(from)}</p>
          </td>
        </tr>
        <tr><td style="height:8px;font-size:8px;line-height:8px">&nbsp;</td></tr>
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0 0 8px;font-size:12px;color:#a6a6a6">제목</p>
            <p style="margin:0;font-size:13px;color:#ffffff">${escapeHtml(subject)}</p>
          </td>
        </tr>
        <tr><td style="height:8px;font-size:8px;line-height:8px">&nbsp;</td></tr>
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0 0 8px;font-size:12px;color:#a6a6a6">본문</p>
            <p style="margin:0;font-size:13px;color:#cccccc;white-space:pre-wrap;line-height:1.7">${escapeHtml(body)}</p>
          </td>
        </tr>
      </table>
    </div>
    <div style="${FOOTER_STYLE}">
      ${COPYRIGHT}
    </div>
  `)
}

// ─── 다이제스트 v5 타입 ───────────────────────────────────────────────────────

export type DigestTopItem = {
  ticker: string;
  name: string;
  rank: number;
  descriptions: string[];
};

export type FeaturedCompany = {
  ticker: string;
  name: string;
  descriptionKr: string;
  sparklineUrl: string | null;
};

export type NewEntrantItem = {
  ticker: string;
  name: string;
  description: string;
};

export type DroppedItem = {
  ticker: string;
  name: string;
};

export type RankMoverItem = {
  ticker: string;
  name: string;
  prevRank: number;
  currRank: number;
  delta: number; // 양수 = 순위 상승(개선)
};

export type MarketChangeCounts = {
  institutionalCount: number;
  earningsBeatCount: number;
  insiderCount: number;
  filingsCount: number;
};

export type MacroItem = {
  key: string;
  label: string;
  value: number | null;
  previousValue: number | null;
  unit: string;
};

export type DigestData = {
  kstDate: string;
  headline: {
    top30Count: number;
    newEntrantCount: number;
    institutionalCount: number;
    earningsBeatCount: number;
  };
  marketMood: string;
  top3: DigestTopItem[];
  top4to10: DigestTopItem[];
  marketChange: MarketChangeCounts;
  featured: FeaturedCompany | null;
  newEntrants: NewEntrantItem[];
  dropped: DroppedItem[];
  rankMovers: RankMoverItem[];
  marketSummary: string;
  macros: MacroItem[];
};

// ─── 일간 다이제스트 이메일 (v5) ──────────────────────────────────────────────
// 다른 이메일 템플릿과 달리 600px 너비 + 별도 다크 팔레트(#0a0a0a/#161616)를
// 사용하는 전용 레이아웃이라, 공용 shell()을 쓰지 않고 자체 래퍼를 사용한다.

const BASE_URL = "https://tickerflow.net";

const DIGEST_DISCLAIMER = `
  <p style="margin:0;font-size:11px;color:#777777;line-height:1.7">
    본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.<br>
    특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.<br>
    투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.
  </p>
`;

function digestStockLink(ticker: string, name: string): string {
  return `<a href="${BASE_URL}/stocks/${escapeHtml(ticker)}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">${escapeHtml(ticker)}</a>`
    + ` <span style="color:#8a8a8a;font-size:12px">${escapeHtml(name)}</span>`;
}

function digestSecTitle(text: string): string {
  return `<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.06em">${text}</p>`;
}

function digestSpacer(px: number): string {
  return `<div style="height:${px}px;font-size:${px}px;line-height:${px}px">&nbsp;</div>`;
}

function digestCard(inner: string): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="background:#161616;border:1px solid #2a2a2a;border-radius:10px;padding:16px" bgcolor="#161616">${inner}</td></tr></table>`;
}

// TOP3 — 큰 카드
function digestTopBigCard(item: DigestTopItem): string {
  const bullets = item.descriptions.slice(0, 3)
    .map((d) => `<p style="margin:4px 0 0;font-size:14px;color:#a6a6a6;line-height:1.5">· ${escapeHtml(d)}</p>`)
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:10px"><tr><td style="background:#161616;border:1px solid #2a2a2a;border-radius:10px;padding:16px" bgcolor="#161616">
    <p style="margin:0 0 6px;font-size:14px">
      <span style="display:inline-block;background:#242424;color:#ffffff;font-weight:700;font-size:12px;border-radius:999px;padding:2px 9px;margin-right:8px">${item.rank}위</span>
      ${digestStockLink(item.ticker, item.name)}
    </p>
    ${bullets}
  </td></tr></table>`;
}

// TOP4~10 — 컴팩트 로우
function digestTopCompactRow(item: DigestTopItem): string {
  const desc = item.descriptions[0] ? escapeHtml(item.descriptions[0]) : "최근 시장 변화 확인";
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #2a2a2a;font-size:12px;color:#666666;width:24px">${item.rank}</td>
    <td style="padding:9px 0 9px 8px;border-bottom:1px solid #2a2a2a">
      <p style="margin:0;font-size:14px">${digestStockLink(item.ticker, item.name)}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#8a8a8a">${desc}</p>
    </td>
  </tr>`;
}

const CHANGE_BADGE_SPEC: Record<keyof MarketChangeCounts, { label: string; bg: string; fg: string }> = {
  institutionalCount: { label: "기관수급", bg: "#1e3a5f", fg: "#93c5fd" },
  earningsBeatCount:  { label: "실적",     bg: "#1a3a2a", fg: "#6ee7b7" },
  insiderCount:       { label: "내부자",   bg: "#2d1f4a", fg: "#c4b5fd" },
  filingsCount:       { label: "시장변화", bg: "#3a2a10", fg: "#fcd34d" },
};

function digestChangeBadges(counts: MarketChangeCounts): string {
  const cells = (Object.keys(CHANGE_BADGE_SPEC) as (keyof MarketChangeCounts)[]).map((key) => {
    const spec = CHANGE_BADGE_SPEC[key];
    const count = counts[key];
    return `<td width="25%" style="padding:4px" align="center">
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td align="center" style="background:${spec.bg};border-radius:8px;padding:12px 4px" bgcolor="${spec.bg}">
        <p style="margin:0;font-size:18px;font-weight:700;color:${spec.fg}">${count}</p>
        <p style="margin:2px 0 0;font-size:11px;color:${spec.fg}">${spec.label}</p>
      </td></tr></table>
    </td>`;
  }).join("");
  return `<table cellpadding="0" cellspacing="0" style="width:100%"><tr>${cells}</tr></table>`;
}

function digestFeaturedSection(featured: FeaturedCompany | null): string {
  if (!featured) return "";
  const chart = featured.sparklineUrl
    ? `<img src="${featured.sparklineUrl}" width="140" height="48" alt="${escapeHtml(featured.ticker)} 최근 30일 종가 추이" style="display:block;width:140px;height:48px;border:0">`
    : `<div style="width:140px;height:48px"></div>`;
  return `
    ${digestSecTitle("이 기업")}
    ${digestCard(`
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr>
        <td valign="top">
          <p style="margin:0 0 8px;font-size:15px">${digestStockLink(featured.ticker, featured.name)}</p>
          <p style="margin:0;font-size:14px;color:#a6a6a6;line-height:1.6">${escapeHtml(featured.descriptionKr)}</p>
          <p style="margin:12px 0 0"><a href="${BASE_URL}/stocks/${escapeHtml(featured.ticker)}" style="color:#60a5fa;text-decoration:none;font-size:13px;font-weight:600">종목 스냅샷 보기 →</a></p>
        </td>
        <td valign="top" width="150" align="right" style="padding-left:12px">${chart}</td>
      </tr></table>
    `)}
    ${digestSpacer(24)}
  `;
}

function digestMacroSection(macros: MacroItem[]): string {
  if (macros.length === 0) return "";
  const cells = macros.map((m) => {
    const delta = m.value != null && m.previousValue != null ? m.value - m.previousValue : null;
    const deltaStr = delta != null
      ? `<span style="color:#8a8a8a;font-size:12px">전월 대비 ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}${escapeHtml(m.unit)}</span>`
      : "";
    return `<td width="50%" valign="top" style="padding:4px">
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="background:#161616;border:1px solid #2a2a2a;border-radius:10px;padding:14px" bgcolor="#161616">
        <p style="margin:0 0 4px;font-size:11px;color:#8a8a8a">${escapeHtml(m.label)}</p>
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff">${m.value != null ? m.value.toFixed(2) : "—"}${escapeHtml(m.unit)}</p>
        <p style="margin:4px 0 0">${deltaStr}</p>
      </td></tr></table>
    </td>`;
  }).join("");
  return `<table cellpadding="0" cellspacing="0" style="width:100%"><tr>${cells}</tr></table>`;
}

export function dailyDigestEmail(data: DigestData): string {
  const { kstDate, headline, marketMood, top3, top4to10, marketChange, featured, newEntrants, dropped, rankMovers, marketSummary, macros } = data;

  const headlineLine = `TOP30 ${headline.top30Count}건 · 신규진입 ${headline.newEntrantCount}건 · 기관편입 ${headline.institutionalCount}건 · 실적상회 ${headline.earningsBeatCount}건`;

  // ② 기업동향 TOP10
  const top3Html = top3.map(digestTopBigCard).join("");
  const top4to10Html = top4to10.length > 0
    ? `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${top4to10.map(digestTopCompactRow).join("")}</table>`
    : "";

  // ⑤ TOP30 신규 진입
  const newEntrantHtml = newEntrants.length > 0
    ? newEntrants.slice(0, 5).map((item) =>
        `<div style="padding:8px 0;border-bottom:1px solid #2a2a2a">
          <p style="margin:0;font-size:14px">${digestStockLink(item.ticker, item.name)}</p>
          <p style="margin:3px 0 0;font-size:12px;color:#8a8a8a">· ${escapeHtml(item.description)}</p>
        </div>`
      ).join("")
    : `<p style="margin:0;font-size:14px;color:#8a8a8a">어제와 동일한 기업들이 TOP30에 유지되었습니다.</p>`;

  // ⑥ 어제 대비 변화 — 이탈 + 순위 변화
  const droppedLinks = dropped.length > 0
    ? dropped.slice(0, 5)
        .map((item) => `<a href="${BASE_URL}/stocks/${escapeHtml(item.ticker)}" style="color:#8a8a8a;text-decoration:none;font-size:13px;margin-right:10px">${escapeHtml(item.ticker)}</a>`)
        .join("")
    : `<span style="font-size:13px;color:#8a8a8a">없음</span>`;

  const moverRows = rankMovers.length > 0
    ? rankMovers.slice(0, 5).map((m) => {
        const up = m.delta > 0;
        const color = up ? "#6ee7b7" : "#f87171";
        const arrow = up ? "▲" : "▼";
        return `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #2a2a2a;font-size:13px">${digestStockLink(m.ticker, m.name)}</td>
          <td style="padding:6px 0;border-bottom:1px solid #2a2a2a;font-size:12px;color:#8a8a8a;text-align:right">${m.prevRank}위 → ${m.currRank}위</td>
          <td style="padding:6px 0;border-bottom:1px solid #2a2a2a;font-size:12px;color:${color};text-align:right;width:48px">${arrow} ${Math.abs(m.delta)}</td>
        </tr>`;
      }).join("")
    : `<tr><td style="padding:6px 0;font-size:13px;color:#8a8a8a">순위 변화가 크지 않았습니다.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TickerFlow 데일리 다이제스트</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif" bgcolor="#0a0a0a">
  <table cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto">
    <tr><td style="padding:0 12px">

      <!-- 헤더 -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="padding:28px 8px 20px">
        <p style="margin:0 0 10px">
          <span style="font-size:15px;font-weight:800;color:#ffffff;letter-spacing:0.04em">TICKERFLOW</span>
          <span style="display:inline-block;margin-left:8px;background:#3b82f6;color:#ffffff;font-size:10px;font-weight:700;border-radius:4px;padding:2px 6px;vertical-align:middle">PRO</span>
        </p>
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#ffffff">데일리 다이제스트</p>
        <p style="margin:0 0 10px;font-size:12px;color:#8a8a8a">${escapeHtml(kstDate)} · KST</p>
        <p style="margin:0;font-size:13px;color:#a6a6a6">${escapeHtml(headlineLine)}</p>
      </td></tr></table>

      <!-- ① 오늘 시장 분위기 -->
      ${digestCard(`<p style="margin:0;font-size:14px;color:#cccccc;line-height:1.7">${escapeHtml(marketMood)}</p>`)}
      ${digestSpacer(24)}

      <!-- ② 기업동향 TOP10 -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="padding:0 8px">
        ${digestSecTitle("기업동향 TOP10")}
        ${top3Html}
        ${top4to10Html}
      </td></tr></table>
      ${digestSpacer(24)}

      <!-- ③ 시장에서 관측된 오늘의 주요 변화 -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="padding:0 8px">
        ${digestSecTitle("시장에서 관측된 오늘의 주요 변화")}
        ${digestChangeBadges(marketChange)}
      </td></tr></table>
      ${digestSpacer(24)}

      <!-- ④ 이 기업 -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="padding:0 8px">
        ${digestFeaturedSection(featured)}
      </td></tr></table>

      <!-- ⑤ TOP30 신규 진입 -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="padding:0 8px">
        ${digestSecTitle("TOP30 신규 진입")}
        ${digestCard(newEntrantHtml)}
      </td></tr></table>
      ${digestSpacer(24)}

      <!-- ⑥ 어제 대비 변화 -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="padding:0 8px">
        ${digestSecTitle("어제 대비 변화")}
        ${digestCard(`
          <p style="margin:0 0 6px;font-size:11px;color:#8a8a8a;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">순위 변화</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:12px">${moverRows}</table>
          <p style="margin:0 0 6px;font-size:11px;color:#8a8a8a;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">TOP30 이탈</p>
          <p style="margin:0">${droppedLinks}</p>
        `)}
      </td></tr></table>
      ${digestSpacer(24)}

      <!-- ⑦ 시장 요약 -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="padding:0 8px">
        ${digestSecTitle("시장 요약")}
        ${digestCard(`<p style="margin:0;font-size:14px;color:#cccccc;line-height:1.7">${escapeHtml(marketSummary)}</p>`)}
      </td></tr></table>
      ${digestSpacer(24)}

      <!-- ⑧ 주요 경제지표 + CTA -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="padding:0 8px">
        ${digestSecTitle("주요 경제지표")}
        ${digestMacroSection(macros)}
        ${digestSpacer(16)}
        <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td align="center">
          <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:13px;font-weight:700;padding:11px 22px;border-radius:8px;text-decoration:none">대시보드에서 더 보기</a>
        </td></tr></table>
      </td></tr></table>
      ${digestSpacer(32)}

      <!-- 푸터 -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="background:#1a1a1a;border-radius:10px;padding:24px 20px" bgcolor="#1a1a1a">
        <table cellpadding="0" cellspacing="0" style="width:100%"><tr>
          <td valign="middle">
            <span style="font-size:13px;font-weight:800;color:#ffffff;letter-spacing:0.04em">TICKERFLOW</span>
            <span style="display:inline-block;margin-left:6px;background:#3b82f6;color:#ffffff;font-size:9px;font-weight:700;border-radius:4px;padding:2px 5px;vertical-align:middle">PRO</span>
          </td>
          <td valign="middle" align="right">
            <a href="https://t.me/tickerflow_net" style="text-decoration:none">
              <svg width="20" height="20" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">
                <circle cx="120" cy="120" r="120" fill="#229ED9"/>
                <path d="M54 118 L179 70 c6-2 11 1 9 10 l-21 100c-2 8-7 10-14 6 l-38-28 -18 17c-2 2-4 4-8 4 l3-40 73-66c3-3-1-5-5-2 l-90 57 -39-12c-8-3-8-9 2-13z" fill="#ffffff"/>
              </svg>
            </a>
          </td>
        </tr></table>
        ${digestSpacer(16)}
        <p style="margin:0 0 2px;font-size:11px;color:#8a8a8a">대표: 정재우 | 사업자등록번호: 136-11-23540 | 통신판매업신고: 제 2026-서울강남-XXXX 호</p>
        <p style="margin:0 0 2px;font-size:11px;color:#8a8a8a">주소: 서울특별시 강남구 압구정로2길 46, 214-S46호</p>
        <p style="margin:0 0 14px;font-size:11px;color:#8a8a8a">연락처: 02-518-2022 | 이메일: support@tickerflow.net</p>
        ${DIGEST_DISCLAIMER}
        ${digestSpacer(12)}
        <p style="margin:0;font-size:11px;color:#666666">
          <a href="${BASE_URL}/alerts" style="color:#666666;text-decoration:underline">수신거부</a>
          <span style="margin:0 6px">·</span>
          <a href="${BASE_URL}/privacy" style="color:#666666;text-decoration:underline">개인정보처리방침</a>
        </p>
        <p style="margin:10px 0 0;font-size:11px;color:#555555">© 2026 언폴드랩(UNFOLD LAB). All rights reserved.</p>
      </td></tr></table>

    </td></tr>
  </table>
</body>
</html>`;
}

export function contactAdminNotifEmail(email: string, subject: string, message: string): string {
  return shell(`
    <div style="${HEADER_STYLE}">
      <h1 style="${H1_STYLE}">새 문의가 접수되었습니다</h1>
    </div>
    <div style="${BODY_STYLE}">
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0 0 4px;font-size:12px;color:#a6a6a6">발신자</p>
            <p style="margin:0;font-size:14px;color:#ffffff">${escapeHtml(email)}</p>
          </td>
        </tr>
        <tr><td style="height:8px;font-size:8px;line-height:8px">&nbsp;</td></tr>
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0 0 4px;font-size:12px;color:#a6a6a6">제목</p>
            <p style="margin:0;font-size:14px;color:#ffffff">${escapeHtml(subject)}</p>
          </td>
        </tr>
        <tr><td style="height:8px;font-size:8px;line-height:8px">&nbsp;</td></tr>
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0 0 4px;font-size:12px;color:#a6a6a6">내용</p>
            <p style="margin:0;font-size:13px;color:#cccccc;white-space:pre-wrap;line-height:1.7">${escapeHtml(message)}</p>
          </td>
        </tr>
      </table>
      <div style="height:20px;font-size:20px;line-height:20px">&nbsp;</div>
      <a href="https://tickerflow.net/admin/ops/reports" style="${CTA_STYLE}">관리자 페이지에서 답변하기</a>
    </div>
    <div style="${FOOTER_STYLE}">
      ${COPYRIGHT}
    </div>
  `)
}

export function contactAnswerEmail(email: string, subject: string, answer: string): string {
  return shell(`
    <div style="${HEADER_STYLE}">
      <h1 style="${H1_STYLE}">문의 답변이 도착했습니다</h1>
    </div>
    <div style="${BODY_STYLE}">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#cccccc">안녕하세요, TickerFlow 고객지원팀입니다.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0 0 4px;font-size:12px;color:#a6a6a6">문의 제목</p>
            <p style="margin:0;font-size:14px;color:#ffffff">${escapeHtml(subject)}</p>
          </td>
        </tr>
        <tr><td style="height:8px;font-size:8px;line-height:8px">&nbsp;</td></tr>
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px" bgcolor="#1a1a1a">
            <p style="margin:0 0 4px;font-size:12px;color:#a6a6a6">답변 내용</p>
            <p style="margin:0;font-size:13px;color:#cccccc;white-space:pre-wrap;line-height:1.7">${escapeHtml(answer)}</p>
          </td>
        </tr>
      </table>
      <div style="height:20px;font-size:20px;line-height:20px">&nbsp;</div>
      <p style="${P_STYLE}">추가 문의사항이 있으시면 마이페이지 문의하기를 통해 다시 연락해 주세요.</p>
      <a href="https://tickerflow.net/mypage" style="${CTA_STYLE}">마이페이지 바로가기</a>
    </div>
    <div style="${FOOTER_STYLE}">
      ${DISCLAIMER}
      ${COPYRIGHT}
    </div>
  `)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
