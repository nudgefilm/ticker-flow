import type { ReactNode } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import NoticeBanner from "@/components/notice-banner";
import { SidebarProvider } from "@/lib/sidebar-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        {/* PC: ml-60(사이드바 너비만큼 여백) / 모바일: ml-0(전체 너비 사용) */}
        <div className="flex min-h-screen flex-col md:ml-60">
          <NoticeBanner />
          {/* PC: px-10 py-8 / 모바일: px-4 py-5 */}
          <main className="flex-1 px-4 py-5 md:px-10 md:py-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
