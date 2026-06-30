import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import ProGate from "@/components/dashboard/pro-gate";
import SectorsBoard from "@/components/sectors/sectors-board";
import DataSources from "@/components/dashboard/insights/data-sources";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export default async function SectorsPage() {
  const supabase = await createClient();
  const latestFilingRes = await supabase
    .from("filings")
    .select("filed_at")
    .order("filed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dataUpdatedAt = latestFilingRes.data?.filed_at
    ? fmtDate(latestFilingRes.data.filed_at)
    : null;

  return (
    <div className="flex h-full flex-col gap-6">
      <DashboardHeader title="섹터 히트맵" badge />
      <div className="flex-1">
        <ProGate
          iconName="flame"
          title="섹터 히트맵은 Pro 전용 기능입니다"
          description="나스닥 섹터별 공시·뉴스 활동량을 한눈에 파악합니다.&#10;트리맵, Top 섹터 카드, 키워드 분석을 제공합니다."
        >
          <SectorsBoard />
        </ProGate>
      </div>
      <DataSources
        description="공개된 미국 증권거래위원회(SEC EDGAR) 공시 및 시장 데이터를 기반으로 제공됩니다."
        updatedAt={dataUpdatedAt}
      />
      <DashboardDisclaimer />
    </div>
  );
}
