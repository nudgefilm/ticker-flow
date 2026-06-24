export default function BillingCurrent() {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#444444]">현재 플랜</p>
          <p className="mt-1.5 text-2xl font-semibold text-white">Free</p>
          <p className="mt-1 text-sm text-[#a6a6a6]">기본 기능을 무료로 이용 중입니다.</p>
        </div>
        <button className="shrink-0 rounded-[6px] bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90">
          Pro로 업그레이드
        </button>
      </div>
    </div>
  );
}
