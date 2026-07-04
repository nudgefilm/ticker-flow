export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { IconBrandYoutube } from "@tabler/icons-react";
import { YoutubeChannelsTable, type YoutubeChannel } from "@/components/admin/youtube-channels-table";

export default async function YoutubeChannelsPage() {
  const admin = createAdminClient();

  // youtube_channels는 생성된 Supabase 타입에 없는 테이블이라 any 캐스트 사용 (CLAUDE.md 16번 규칙)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("youtube_channels")
    .select(
      "id, channel_id, channel_name, channel_url, description, subscriber_count, video_count, thumbnail_url, email_sent, memo, created_at"
    )
    .order("subscriber_count", { ascending: false });

  const channels = (data ?? []) as YoutubeChannel[];
  const emailSentCount = channels.filter((c) => c.email_sent).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">유튜브 채널 협업 관리</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">
          미국주식·나스닥 관련 키워드로 수집된 유튜브 채널 목록입니다. 수집은 "시스템 &gt; 수동 재수집"
          페이지의 "유튜브 채널 수집" 버튼으로 실행합니다.
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#111111] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-red-500/10 text-red-400">
          <IconBrandYoutube size={18} stroke={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            총 {channels.length}개 채널 · 발송 완료 {emailSentCount}개
          </p>
          <p className="text-xs text-[#a6a6a6]">구독자 수 기준 내림차순 정렬</p>
        </div>
      </div>

      <YoutubeChannelsTable channels={channels} />
    </div>
  );
}
