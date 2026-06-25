export const dynamic = "force-dynamic";

import { IconBell } from "@tabler/icons-react";

export default function NoticesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">공지사항 관리</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">유저에게 전달할 공지사항을 작성하고 관리합니다.</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#111111] py-16 text-center">
        <IconBell size={32} stroke={1.5} className="text-[#a6a6a6]" />
        <p className="mt-3 text-sm text-[#a6a6a6]">공지사항 기능은 준비 중입니다.</p>
      </div>
    </div>
  );
}
