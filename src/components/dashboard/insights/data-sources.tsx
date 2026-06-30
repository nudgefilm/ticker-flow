import { SectionCard } from "./ui";

export default function DataSources({ updatedAt }: { updatedAt?: string | null }) {
  return (
    <SectionCard title="데이터 출처" description="본 페이지에 사용된 데이터 안내">
      <p className="text-sm text-[#a6a6a6]">
        공개된 SEC 공시 및 시장 데이터를 기반으로 제공합니다.
      </p>
      {updatedAt && (
        <p className="mt-3 text-xs text-[#a6a6a6]">마지막 업데이트 {updatedAt}</p>
      )}
      <p className="mt-2 text-xs text-[#a6a6a6]">
        모든 데이터는 공개 정보를 기반으로 수집되며, 투자 자문이나 투자 권유를 목적으로 제공되지
        않습니다.
      </p>
    </SectionCard>
  );
}
