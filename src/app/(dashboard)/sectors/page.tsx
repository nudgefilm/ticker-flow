import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import SectorsBoard from "@/components/sectors/sectors-board";

export const dynamic = "force-dynamic";

export default function SectorsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <DashboardHeader title="섹터 히트맵" badge />
      <div className="flex-1">
        <SectorsBoard />
      </div>
      <DashboardDisclaimer />
    </div>
  );
}
