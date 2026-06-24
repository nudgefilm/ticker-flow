const KEY_EVENTS = [
  { name: "소비자물가지수", nameEn: "CPI", release: "6/24 화 21:30 KST" },
  { name: "FOMC 금리 결정", nameEn: "FOMC Rate Decision", release: "6/25 수 03:00 KST" },
  { name: "비농업 고용지수", nameEn: "Non-Farm Payrolls", release: "6/27 금 21:30 KST" },
];

export default function MacroKeyEvents() {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-4">
      <p className="text-xs uppercase tracking-widest text-[#a6a6a6]">이번 주 핵심 이벤트</p>
      <ul className="mt-3">
        {KEY_EVENTS.map((event, i) => (
          <li
            key={event.nameEn}
            className={`flex items-center justify-between gap-4 py-2.5 ${i > 0 ? "border-t border-white/[0.06]" : ""}`}
          >
            <div className="min-w-0">
              <p className="text-sm text-white">{event.name}</p>
              <p className="truncate text-xs text-[#a6a6a6]">{event.nameEn}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-[#cccccc]">{event.release}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
