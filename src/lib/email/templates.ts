const BASE_STYLES = `
  body { margin:0; padding:0; background:#0a0a0a; font-family:-apple-system,BlinkMacSystemFont,sans-serif; }
  .wrap { max-width:600px; margin:0 auto; width:100%; }
  .card { background:#111111; border-radius:12px; overflow:hidden; }
  .header { background:#111111; border-bottom:1px solid rgba(255,255,255,0.06); padding:28px 32px; }
  .body { padding:28px 32px; }
  .footer { padding:24px 32px; border-top:1px solid rgba(255,255,255,0.06); }
  h1 { margin:0; font-size:20px; font-weight:600; color:#ffffff; }
  p { margin:0 0 16px; font-size:14px; line-height:1.6; color:#a6a6a6; }
  p:last-child { margin-bottom:0; }
  .cta { display:inline-block; background:#60a5fa; color:#0a0a0a !important; font-size:14px; font-weight:600; padding:12px 24px; border-radius:8px; text-decoration:none; margin-top:8px; }
  .badge { display:inline-block; background:#1a1a1a; color:#cccccc; font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; margin-right:6px; }
  .section-title { font-size:13px; font-weight:600; color:#ffffff; margin:0 0 12px; text-transform:uppercase; letter-spacing:0.05em; }
  .item { padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
  .item:last-child { border-bottom:none; }
  .item-headline { font-size:13px; color:#cccccc; margin:4px 0 0; }
  .item-body { font-size:12px; color:#a6a6a6; margin:4px 0 0; }
  .disclaimer { font-size:11px; color:#666666; line-height:1.6; }
  .copyright { font-size:11px; color:#666666; margin-top:12px; }
`

const DISCLAIMER = `
  <p class="disclaimer">
    본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.<br>
    특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.<br>
    투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.
  </p>
`

const COPYRIGHT = `<p class="copyright">© 2026 언폴드랩. All rights reserved.</p>`

function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${BASE_STYLES}</style>
</head>
<body>
  <table class="wrap" cellpadding="0" cellspacing="0">
    <tr><td style="padding:24px 16px">
      <div class="card">${content}</div>
    </td></tr>
  </table>
</body>
</html>`
}

export function welcomeEmail(_email: string): string {
  return shell(`
    <div class="header">
      <h1>TickerFlow에 오신 것을 환영합니다 🎉</h1>
    </div>
    <div class="body">
      <p style="color:#cccccc">미국 기업의 중요한 변화를 놓치지 않도록 도와드리겠습니다.</p>
      <p>TickerFlow는 공시, 뉴스, 실적 일정을 한 곳에서 모니터링할 수 있는 한국 투자자를 위한 나스닥 대시보드입니다.</p>

      <p style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:8px">주요 기능</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px">
        <tr>
          <td style="padding:10px 12px;background:#1a1a1a;border-radius:8px;margin-bottom:8px">
            <p style="margin:0;font-size:13px;color:#ffffff;font-weight:500">📋 공시 피드</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a6a6a6">SEC EDGAR 공시를 한국어 요약으로 빠르게 확인</p>
          </td>
        </tr>
        <tr><td style="height:6px"></td></tr>
        <tr>
          <td style="padding:10px 12px;background:#1a1a1a;border-radius:8px">
            <p style="margin:0;font-size:13px;color:#ffffff;font-weight:500">📰 뉴스 피드</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a6a6a6">관심 종목의 최신 뉴스를 한국어로 확인</p>
          </td>
        </tr>
        <tr><td style="height:6px"></td></tr>
        <tr>
          <td style="padding:10px 12px;background:#1a1a1a;border-radius:8px">
            <p style="margin:0;font-size:13px;color:#ffffff;font-weight:500">📅 실적 캘린더</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a6a6a6">향후 실적 발표 일정을 미리 확인</p>
          </td>
        </tr>
      </table>

      <a href="https://tickerflow.net/dashboard" class="cta">대시보드 시작하기</a>
    </div>
    <div class="footer">
      ${DISCLAIMER}
      ${COPYRIGHT}
    </div>
  `)
}

export function proUpgradeEmail(_email: string): string {
  return shell(`
    <div class="header">
      <h1>Pro 플랜이 시작되었습니다 ✨</h1>
    </div>
    <div class="body">
      <p style="color:#cccccc">이제 TickerFlow의 모든 기능을 이용하실 수 있습니다.</p>

      <p style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:8px">Pro 전용 기능</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px">
        ${[
          ["🔍 공시 인사이트", "주요 공시의 핵심 변화를 심층 요약으로 확인"],
          ["🎙 어닝콜 요약", "실적 발표 콜 내용을 한국어로 정리"],
          ["👤 내부자 거래", "임원·대주주 매매 내역 실시간 모니터링"],
          ["🗺 섹터 히트맵", "섹터별 흐름을 한눈에 파악"],
          ["🔔 알림 설정", "관심 종목 이벤트 발생 시 즉시 알림"],
        ].map(([title, desc]) => `
          <tr>
            <td style="padding:10px 12px;background:#1a1a1a;border-radius:8px">
              <p style="margin:0;font-size:13px;color:#ffffff;font-weight:500">${title}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#a6a6a6">${desc}</p>
            </td>
          </tr>
          <tr><td style="height:6px"></td></tr>
        `).join("")}
      </table>

      <a href="https://tickerflow.net/dashboard" class="cta">Pro 기능 확인하기</a>
    </div>
    <div class="footer">
      ${DISCLAIMER}
      ${COPYRIGHT}
    </div>
  `)
}

export function inboundForwardEmail(from: string, subject: string, body: string): string {
  return shell(`
    <div class="header">
      <h1>새 문의 이메일이 도착했습니다</h1>
    </div>
    <div class="body">
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px">
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px">
            <p style="margin:0 0 8px;font-size:12px;color:#a6a6a6">발신자</p>
            <p style="margin:0;font-size:13px;color:#ffffff">${escapeHtml(from)}</p>
          </td>
        </tr>
        <tr><td style="height:8px"></td></tr>
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px">
            <p style="margin:0 0 8px;font-size:12px;color:#a6a6a6">제목</p>
            <p style="margin:0;font-size:13px;color:#ffffff">${escapeHtml(subject)}</p>
          </td>
        </tr>
        <tr><td style="height:8px"></td></tr>
        <tr>
          <td style="padding:12px;background:#1a1a1a;border-radius:8px">
            <p style="margin:0 0 8px;font-size:12px;color:#a6a6a6">본문</p>
            <p style="margin:0;font-size:13px;color:#cccccc;white-space:pre-wrap;line-height:1.7">${escapeHtml(body)}</p>
          </td>
        </tr>
      </table>
    </div>
    <div class="footer">
      ${COPYRIGHT}
    </div>
  `)
}

export function dailyDigestEmail(
  filings: { ticker: string; form_type: string; summary_kr: string }[],
  news: { ticker: string; headline: string; summary_kr: string }[]
): string {
  const now = new Date()
  const kst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now)

  const topFilings = filings.slice(0, 5)
  const topNews = news.slice(0, 5)

  const filingsHtml = topFilings.length > 0
    ? topFilings.map(f => `
        <div class="item">
          <p style="margin:0"><span class="badge">${escapeHtml(f.ticker)}</span><span style="font-size:11px;color:#60a5fa">${escapeHtml(f.form_type)}</span></p>
          <p class="item-body">${escapeHtml(f.summary_kr)}</p>
        </div>
      `).join("")
    : `<p style="font-size:13px;color:#a6a6a6">오늘 집계된 공시가 없습니다.</p>`

  const newsHtml = topNews.length > 0
    ? topNews.map(n => `
        <div class="item">
          <p style="margin:0"><span class="badge">${escapeHtml(n.ticker)}</span></p>
          <p class="item-headline">${escapeHtml(n.headline)}</p>
          ${n.summary_kr ? `<p class="item-body">${escapeHtml(n.summary_kr)}</p>` : ""}
        </div>
      `).join("")
    : `<p style="font-size:13px;color:#a6a6a6">오늘 집계된 뉴스가 없습니다.</p>`

  return shell(`
    <div class="header">
      <h1>오늘의 주요 변화 요약</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#a6a6a6">${kst} · KST</p>
    </div>
    <div class="body">
      <p class="section-title">공시</p>
      ${filingsHtml}

      <div style="height:24px"></div>

      <p class="section-title">뉴스</p>
      ${newsHtml}

      <div style="height:24px"></div>
      <a href="https://tickerflow.net/dashboard" class="cta">전체 피드 보기</a>
    </div>
    <div class="footer">
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
