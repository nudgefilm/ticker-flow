const reports = [
  { id: 1, type: "문의", subject: "Pro 플랜 결제가 안 됩니다", email: "user***@gmail.com", date: "2026-06-24", status: "미처리" },
  { id: 2, type: "신고", subject: "잘못된 공시 정보가 표시됩니다", email: "trade***@naver.com", date: "2026-06-23", status: "확인중" },
  { id: 3, type: "문의", subject: "와치리스트 동기화가 안 됩니다", email: "inv***@kakao.com", date: "2026-06-22", status: "처리완료" },
  { id: 4, type: "문의", subject: "EDGAR 공시 링크가 열리지 않습니다", email: "stock***@gmail.com", date: "2026-06-21", status: "처리완료" },
];

const statusColor: Record<string, string> = {
  "미처리": "text-red-400",
  "확인중": "text-yellow-400",
  "처리완료": "text-green-400",
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">문의·신고 목록</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">유저 문의 및 신고 접수 현황</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "미처리", value: "1건", color: "text-red-400" },
          { label: "확인중", value: "1건", color: "text-yellow-400" },
          { label: "처리완료", value: "2건", color: "text-green-400" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">유형</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">제목</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">이메일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">날짜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">처리</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((row) => (
              <tr key={row.id} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3">
                  <span className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${row.type === "신고" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-white max-w-xs truncate">{row.subject}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.email}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.date}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${statusColor[row.status]}`}>{row.status}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-[4px] border border-white/[0.08] px-2 py-1 text-xs text-[#a6a6a6] hover:text-white hover:border-white/20 transition-colors"
                  >
                    답변
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
