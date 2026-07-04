import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const MIN_SUBSCRIBERS = 1000;
const CHANNELS_BATCH_SIZE = 50;

const SEARCH_KEYWORDS = [
  "미국주식",
  "나스닥",
  "미국증시",
  "해외주식",
  "트레이딩뷰",
  "S&P",
  "엔비디아주가",
  "테슬라주가",
];

interface YoutubeSearchItem {
  id?: { channelId?: string };
}

interface YoutubeSearchResponse {
  items?: YoutubeSearchItem[];
}

interface YoutubeChannelItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: { high?: { url?: string }; default?: { url?: string } };
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
}

interface YoutubeChannelsResponse {
  items?: YoutubeChannelItem[];
}

async function searchChannelIds(apiKey: string, keyword: string): Promise<string[]> {
  const url = new URL(YOUTUBE_SEARCH_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "channel");
  url.searchParams.set("q", keyword);
  url.searchParams.set("maxResults", "25");
  // 국내(한국) 채널을 우선 노출하도록 지역·언어 힌트 지정
  url.searchParams.set("regionCode", "KR");
  url.searchParams.set("relevanceLanguage", "ko");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`[collect/youtube-channels] search 실패 (${keyword}): HTTP ${res.status}`);
    return [];
  }

  const data: YoutubeSearchResponse = await res.json();
  return (data.items ?? [])
    .map((item) => item.id?.channelId)
    .filter((id): id is string => Boolean(id));
}

async function fetchChannelDetails(
  apiKey: string,
  channelIds: string[]
): Promise<YoutubeChannelItem[]> {
  const details: YoutubeChannelItem[] = [];

  // channels.list는 한 번에 최대 50개 id까지 조회 가능
  for (let i = 0; i < channelIds.length; i += CHANNELS_BATCH_SIZE) {
    const batch = channelIds.slice(i, i + CHANNELS_BATCH_SIZE);
    const url = new URL(YOUTUBE_CHANNELS_URL);
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[collect/youtube-channels] channels 조회 실패: HTTP ${res.status}`);
      continue;
    }

    const data: YoutubeChannelsResponse = await res.json();
    details.push(...(data.items ?? []));
  }

  return details;
}

export async function runYoutubeChannelsCollect(): Promise<CollectResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { ok: false, error: "YOUTUBE_API_KEY not set", retryable: false };

  try {
    // 1. 키워드별 검색 → 채널 ID 중복 제거
    const channelIdSet = new Set<string>();
    for (const keyword of SEARCH_KEYWORDS) {
      const ids = await searchChannelIds(apiKey, keyword);
      for (const id of ids) channelIdSet.add(id);
    }
    const channelIds = [...channelIdSet];
    console.log(`[collect/youtube-channels] 검색된 고유 채널: ${channelIds.length}개`);

    if (channelIds.length === 0) {
      return { ok: true, searched: SEARCH_KEYWORDS.length, found: 0, inserted: 0, skipped: 0 };
    }

    // 2. 채널 상세 정보 조회 (구독자·영상 수 등)
    const details = await fetchChannelDetails(apiKey, channelIds);

    // 3. 구독자 1,000명 이상만 upsert (기존 email_sent/memo는 유지)
    const adminClient = createAdminClient();
    let inserted = 0;
    let skipped = 0;

    for (const channel of details) {
      const stats = channel.statistics;
      const subscriberCount =
        !stats || stats.hiddenSubscriberCount || !stats.subscriberCount
          ? null
          : parseInt(stats.subscriberCount, 10);

      if (!subscriberCount || subscriberCount < MIN_SUBSCRIBERS) {
        skipped++;
        continue;
      }

      const videoCount = stats?.videoCount ? parseInt(stats.videoCount, 10) : null;

      // youtube_channels는 생성된 Supabase 타입에 없는 테이블이라 any 캐스트 사용 (CLAUDE.md 16번 규칙)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminClient as any)
        .from("youtube_channels")
        .upsert(
          {
            channel_id: channel.id,
            channel_name: channel.snippet?.title ?? channel.id,
            channel_url: `https://www.youtube.com/channel/${channel.id}`,
            description: channel.snippet?.description || null,
            subscriber_count: subscriberCount,
            video_count: videoCount,
            thumbnail_url:
              channel.snippet?.thumbnails?.high?.url ??
              channel.snippet?.thumbnails?.default?.url ??
              null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "channel_id" }
        );

      if (error) {
        console.error("[collect/youtube-channels] upsert:", error.message);
        skipped++;
      } else {
        inserted++;
      }
    }

    return {
      ok: true,
      searched: SEARCH_KEYWORDS.length,
      found: channelIds.length,
      inserted,
      skipped,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/youtube-channels]", message);
    return { ok: false, error: message };
  }
}
