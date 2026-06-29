interface SplitRow {
  id: string;
  split_date: string | null;
  numerator: number | null;
  denominator: number | null;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const currentYear = new Date().getFullYear().toString();
  if (y === currentYear) return `${parseInt(m)}월 ${parseInt(d)}일`;
  return `${y}. ${parseInt(m)}. ${parseInt(d)}`;
}

function splitLabel(num: number | null, den: number | null): string {
  if (num == null || den == null) return "주식 분할";
  const isReverse = den > num;
  const ratio = `${num}:${den}`;
  return isReverse ? `${ratio} 역분할(Reverse Split)` : `${ratio} 주식 분할`;
}

export function StockSplits({ splits }: { splits: SplitRow[] }) {
  if (splits.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-5 py-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
        주식 분할 이력
      </p>
      <div className="flex flex-col gap-2">
        {splits.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#60a5fa]" />
            <span className="text-sm text-[#cccccc]">
              {s.split_date ? fmtDate(s.split_date) : "—"}
            </span>
            <span className="text-[#a6a6a6]">·</span>
            <span className="text-sm text-white">
              {splitLabel(s.numerator, s.denominator)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
