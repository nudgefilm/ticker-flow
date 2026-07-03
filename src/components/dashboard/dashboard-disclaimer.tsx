const ITEMS = [
  "📌 본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.",
  "📌 특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.",
  "📌 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.",
];

export function DashboardDisclaimer() {
  return (
    <footer className="mt-8 rounded-lg border border-white/[0.08] bg-[#111111] p-5">
      <ul className="space-y-1.5">
        {ITEMS.map((text) => (
          <li key={text} className="flex items-start gap-2 text-xs leading-relaxed text-[#a6a6a6]">
            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[#6b6b6b]" aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>
    </footer>
  );
}
