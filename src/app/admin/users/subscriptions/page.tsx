const subscriptions = [
  { email: "kim***@gmail.com", plan: "Pro 연간", startedAt: "2026-05-12", renewsAt: "2027-05-12", amount: "₩142,800" },
  { email: "cho***@gmail.com", plan: "Pro 월간", startedAt: "2026-06-01", renewsAt: "2026-07-01", amount: "₩14,900" },
  { email: "shin***@gmail.com", plan: "Pro 연간", startedAt: "2026-03-14", renewsAt: "2027-03-14", amount: "₩142,800" },
  { email: "bae***@gmail.com", plan: "Pro 월간", startedAt: "2026-06-15", renewsAt: "2026-07-15", amount: "₩14,900" },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">구독 현황</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">유료 구독 및 결제 내역</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Free 유저", value: "116명" },
          { label: "Pro 유저", value: "11명", highlight: true },
          { label: "이번 달 예상 매출", value: "₩1,328,100" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold ${card.highlight ? "text-green-400" : "text-white"}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* 구독 테이블 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">Pro 구독자 목록</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">이메일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">플랜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">시작일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">갱신일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">결제금액</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{sub.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-[4px] bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                    {sub.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#a6a6a6]">{sub.startedAt}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{sub.renewsAt}</td>
                <td className="px-4 py-3 text-white font-medium">{sub.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#a6a6a6]">실제 결제 데이터는 Polar.sh 연동 후 표시됩니다.</p>
    </div>
  );
}
