import type { ReactNode } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import NoticeBanner from "@/components/notice-banner";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="ml-60 flex min-h-screen flex-col">
        <NoticeBanner />
        <main className="flex-1 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
