import MacroBoard from "@/components/dashboard/macro/macro-board";
import { MACRO_REFERENCE_DATE } from "@/lib/mock/macro";

export const metadata = {
  title: "경제지표 | TickerFlow",
  description: "미국 주요 경제지표의 최근 발표 현황을 한곳에서 제공합니다.",
};

export default function MacroPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <main className="mx-auto max-w-5xl px-6 py-8 md:px-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-medium text-white">경제지표</h1>
            <p className="mt-2 text-sm text-[#a6a6a6]">
              미국 주요 경제지표의 최근 발표 현황을 한곳에서 제공합니다.
            </p>
          </div>
          <span className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-1.5 text-xs tabular-nums text-[#a6a6a6]">
            기준일 {MACRO_REFERENCE_DATE}
          </span>
        </header>

        <div className="mt-6">
          <MacroBoard />
        </div>

        <footer className="mt-8 border-t border-white/[0.06] py-4 text-left text-xs leading-relaxed text-[#a6a6a6]">
          <p>· 본 서비스는 공개된 경제지표를 기반으로 정보를 제공합니다.</p>
          <p>· 경제지표 해석 및 활용은 이용자의 판단에 따라 이루어져야 합니다.</p>
          <p>· 본 서비스는 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        </footer>
      </main>
    </div>
  );
}
