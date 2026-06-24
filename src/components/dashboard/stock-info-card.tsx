export default function StockInfoCard({
  rows,
}: {
  rows: { label: string; value: string; link?: boolean }[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#444444]">기업 정보</p>
      <dl className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <dt className="text-sm text-[#a6a6a6]">{row.label}</dt>
            <dd className="text-sm text-white">
              {row.link ? (
                <a href="#" className="underline transition-colors hover:text-[#cccccc]">
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
