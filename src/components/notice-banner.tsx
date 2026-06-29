"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconX, IconArrowRight } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

interface Notice {
  id: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  type: string;
}

const TYPE_STYLES = {
  info: {
    wrapper: "bg-blue-500/10 border-blue-500/20",
    text:    "text-blue-200",
    sub:     "text-blue-300/70",
    btn:     "bg-blue-500/20 hover:bg-blue-500/30 text-blue-200",
    close:   "text-blue-300/60 hover:text-blue-200",
  },
  warning: {
    wrapper: "bg-amber-500/10 border-amber-500/20",
    text:    "text-amber-200",
    sub:     "text-amber-300/70",
    btn:     "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200",
    close:   "text-amber-300/60 hover:text-amber-200",
  },
  success: {
    wrapper: "bg-green-500/10 border-green-500/20",
    text:    "text-green-200",
    sub:     "text-green-300/70",
    btn:     "bg-green-500/20 hover:bg-green-500/30 text-green-200",
    close:   "text-green-300/60 hover:text-green-200",
  },
} as const;

const STORAGE_PREFIX = "notice_dismissed_";

export default function NoticeBanner() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from("notices")
          .select("id, message, link_text, link_url, type")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!data) return;
        if (localStorage.getItem(STORAGE_PREFIX + data.id)) return;
        setNotice(data as Notice);
      } catch {
        // 테이블 미생성 등 조용히 처리
      }
    }
    load();
  }, []);

  function dismiss() {
    if (!notice) return;
    localStorage.setItem(STORAGE_PREFIX + notice.id, "1");
    setNotice(null);
  }

  if (!notice) return null;

  const style =
    TYPE_STYLES[notice.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.info;

  return (
    <div
      className={`flex items-center justify-between gap-4 border-b px-5 py-2.5 ${style.wrapper}`}
    >
      <p className={`flex-1 text-sm ${style.text}`}>{notice.message}</p>

      <div className="flex shrink-0 items-center gap-3">
        {notice.link_url && notice.link_text && (
          <Link
            href={notice.link_url}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${style.btn}`}
          >
            {notice.link_text}
            <IconArrowRight size={12} stroke={2} />
          </Link>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="공지 닫기"
          className={`transition-colors ${style.close}`}
        >
          <IconX size={15} stroke={2} />
        </button>
      </div>
    </div>
  );
}
