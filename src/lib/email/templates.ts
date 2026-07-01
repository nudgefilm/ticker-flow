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

// ─── 다이제스트 타입 ──────────────────────────────────────────────────────────

export type Top30Item = {
  ticker: string;
  name: string;
  descriptions: string[];
};

export type MarketStats = {
  filingCount: number;
  epsBeatCount: number;
  institutionalCount: number;
  insiderBuyCount: number;
  interpretation: string;
};

export type NewEntrantItem = {
  ticker: string;
  name: string;
  description: string;
};

export type DigestData = {
  kstDate: string;
  top10: Top30Item[];
  top3: Top30Item[];
  marketStats: MarketStats;
  marketSummary: string;
  newEntrants: NewEntrantItem[];
  dropped: { ticker: string; name: string }[];
};

// ─── 일간 다이제스트 이메일 ───────────────────────────────────────────────────

export function dailyDigestEmail(data: DigestData): string {
  const { kstDate, top10, top3, marketStats, marketSummary, newEntrants, dropped } = data;
  const BASE = "https://tickerflow.net";

  function tickerTag(ticker: string, name: string): string {
    return `<a href="${BASE}/stocks/${escapeHtml(ticker)}" style="color:#60a5fa;text-decoration:none;font-weight:600;font-size:17px">${escapeHtml(ticker)}</a>`
      + ` <span style="color:#a6a6a6;font-size:12px">${escapeHtml(name)}</span>`;
  }

  function secTitle(text: string): string {
    return `<p style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;letter-spacing:0.03em">${text}</p>`;
  }

  // ① TOP10 — 2열 테이블 레이아웃 (5행 x 2열, PC/모바일 동일)
  function top10Cell(item: Top30Item, idx: number): string {
    const bullets = item.descriptions.slice(0, 2)
      .map(d => `<p style="margin:4px 0 0;font-size:15px;color:#a6a6a6">· ${escapeHtml(d)}</p>`)
      .join("");
    return `<td width="50%" valign="top" style="width:50%;vertical-align:top;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.04)">
      <p style="margin:0 0 4px;font-size:13px">
        <span style="color:#555555;font-size:11px;margin-right:8px">${idx + 1}</span>
        ${tickerTag(item.ticker, item.name)}
      </p>
      ${bullets}
    </td>`;
  }

  const top10Html = top10.length > 0
    ? (() => {
        const rows: string[] = [];
        for (let i = 0; i < top10.length; i += 2) {
          const left = top10Cell(top10[i], i);
          const right = top10[i + 1]
            ? top10Cell(top10[i + 1], i + 1)
            : `<td width="50%" valign="top" style="width:50%;border-bottom:1px solid rgba(255,255,255,0.04)">&nbsp;</td>`;
          rows.push(`<tr>${left}${right}</tr>`);
        }
        return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${rows.join("")}</table>`;
      })()
    : `<p style="margin:0;font-size:15px;color:#a6a6a6">오늘 기업동향 데이터가 없습니다.</p>`;

  // ② 시장 변화 통계
  const statRows = [
    marketStats.filingCount > 0
      ? `<tr><td style="padding:4px 0;font-size:15px;color:#a6a6a6">집계 공시</td><td style="padding:4px 0;font-size:15px;color:#ffffff;text-align:right;font-weight:600">${marketStats.filingCount}건</td></tr>`
      : "",
    marketStats.epsBeatCount > 0
      ? `<tr><td style="padding:4px 0;font-size:15px;color:#a6a6a6">EPS 예상치 상회</td><td style="padding:4px 0;font-size:15px;color:#ffffff;text-align:right;font-weight:600">${marketStats.epsBeatCount}건</td></tr>`
      : "",
    marketStats.institutionalCount > 0
      ? `<tr><td style="padding:4px 0;font-size:15px;color:#a6a6a6">기관 신규 편입</td><td style="padding:4px 0;font-size:15px;color:#ffffff;text-align:right;font-weight:600">${marketStats.institutionalCount}건</td></tr>`
      : "",
    marketStats.insiderBuyCount > 0
      ? `<tr><td style="padding:4px 0;font-size:15px;color:#a6a6a6">내부자 매수</td><td style="padding:4px 0;font-size:15px;color:#ffffff;text-align:right;font-weight:600">${marketStats.insiderBuyCount}건</td></tr>`
      : "",
  ].filter(Boolean).join("");

  const statsBlock = statRows.length > 0
    ? `<table cellpadding="0" cellspacing="0" style="width:100%">${statRows}</table>`
    : `<p style="margin:0;font-size:15px;color:#a6a6a6">기관 수급 및 거래량 변화 중심으로 시장 변화가 관측되었습니다.</p>`;

  // ③ TOP3 카드
  const top3Html = top3.map((item, idx) => {
    const bullets = item.descriptions
      .map(d => `<p style="margin:3px 0 0;font-size:15px;color:#aaaaaa">· ${escapeHtml(d)}</p>`)
      .join("");
    return `<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:8px"><tr><td bgcolor="#2d2d2d" style="background:#2d2d2d;border-radius:8px;padding:14px 16px">
      <p style="margin:0 0 8px;font-size:13px">
        <span style="color:#60a5fa;font-weight:700;margin-right:8px">${idx + 1}위</span>
        ${tickerTag(item.ticker, item.name)}
      </p>
      ${bullets}
    </td></tr></table>`;
  }).join("");

  // ⑤ 신규 진입
  const entrantHtml = newEntrants.length > 0
    ? newEntrants.slice(0, 5).map(item =>
        `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <p style="margin:0;font-size:13px">${tickerTag(item.ticker, item.name)}</p>
          <p style="margin:3px 0 0;font-size:15px;color:#a6a6a6">· ${escapeHtml(item.description)}</p>
        </div>`
      ).join("")
    : `<p style="margin:0;font-size:15px;color:#a6a6a6">어제와 동일한 기업들이 TOP30에 유지되었습니다.</p>`;

  // ⑥ 어제 대비 변화 링크
  const newLinks = newEntrants.length > 0
    ? newEntrants.slice(0, 5)
        .map(item => `<a href="${BASE}/stocks/${escapeHtml(item.ticker)}" style="color:#60a5fa;text-decoration:none;font-size:15px;font-weight:600;margin-right:10px">${escapeHtml(item.ticker)}</a>`)
        .join("")
    : `<span style="font-size:15px;color:#a6a6a6">없음</span>`;

  const droppedLinks = dropped.length > 0
    ? dropped.slice(0, 5)
        .map(item => `<a href="${BASE}/stocks/${escapeHtml(item.ticker)}" style="color:#a6a6a6;text-decoration:none;font-size:15px;margin-right:10px">${escapeHtml(item.ticker)}</a>`)
        .join("")
    : `<span style="font-size:15px;color:#a6a6a6">없음</span>`;

  return shell(`
    <div style="${HEADER_STYLE}">
      <h1 style="${H1_STYLE}">오늘의 기업동향 TOP10</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#a6a6a6">${escapeHtml(kstDate)} · KST</p>
    </div>
    <div style="${BODY_STYLE}">

      ${secTitle("기업동향 TOP10")}
      ${top10Html}

      <div style="height:28px;font-size:28px;line-height:28px">&nbsp;</div>

      ${secTitle("📈 오늘 시장 변화")}
      <div style="background:#1a1a1a;border-radius:8px;padding:14px 16px" bgcolor="#1a1a1a">
        ${statsBlock}
        <p style="margin:12px 0 0;font-size:15px;color:#cccccc;font-style:italic">${escapeHtml(marketStats.interpretation)}</p>
      </div>

      <div style="height:28px;font-size:28px;line-height:28px">&nbsp;</div>

      ${secTitle("TOP3 상세")}
      ${top3Html}

      <div style="height:28px;font-size:28px;line-height:28px">&nbsp;</div>

      ${secTitle("💡 오늘 시장 요약")}
      <div style="background:#1a1a1a;border-radius:8px;padding:14px 16px" bgcolor="#1a1a1a">
        <p style="margin:0;font-size:15px;color:#cccccc;line-height:1.7">${escapeHtml(marketSummary)}</p>
      </div>

      <div style="height:28px;font-size:28px;line-height:28px">&nbsp;</div>

      ${secTitle("🆕 오늘 처음 TOP30에 진입")}
      ${entrantHtml}

      <div style="height:28px;font-size:28px;line-height:28px">&nbsp;</div>

      ${secTitle("어제 대비 변화")}
      <div style="background:#1a1a1a;border-radius:8px;padding:14px 16px" bgcolor="#1a1a1a">
        <p style="margin:0 0 6px;font-size:11px;color:#a6a6a6;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">새로 진입</p>
        <p style="margin:0 0 16px">${newLinks}</p>
        <p style="margin:0 0 6px;font-size:11px;color:#a6a6a6;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">빠진 기업</p>
        <p style="margin:0">${droppedLinks}</p>
      </div>

    </div>
    <div style="${FOOTER_STYLE}">
      ${DISCLAIMER}
      ${COPYRIGHT}
    </div>
  `);
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
