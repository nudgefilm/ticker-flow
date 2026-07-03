import { SectionCard } from "./ui";

export default function DataSources({
  description,
  updatedAt,
}: {
  description: string;
  updatedAt?: string | null;
}) {
  return (
    <SectionCard title="데이터 출처" description="본 페이지에 사용된 데이터 안내">
      <p className="text-sm text-[#a6a6a6]">📌 {description}</p>
      {updatedAt && (
        <p className="mt-3 text-xs text-[#a6a6a6]">마지막 업데이트: {updatedAt}</p>
      )}
    </SectionCard>
  );
}
