"use client";

import { useState } from "react";
import { IconRefresh, IconAlertCircle, IconCopy, IconCheck } from "@tabler/icons-react";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";

// 이 화면에서 생성되는 콘텐츠는 CLAUDE.md 18항의 "어드민 전용 규제 예외
// 구간"이 아니다 — 검수 후 그대로 외부(네이버 블로그 등)에 게시될
// 콘텐츠이므로, 일반 CLAUDE.md 원칙(6항 투자 권유 금지 표현 등)을
// 다른 사용자 노출 화면과 동일하게 준수해야 한다.

type Status = "idle" | "running" | "done" | "error";

interface BlogDraft {
  title: string;
  body: string;
  categories: string[];
  kstDate: string;
}

interface DraftResult {
  ok: boolean;
  draft?: BlogDraft;
  error?: string;
}

export default function BlogDraftPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categories, setCategories] = useState("");
  const [kstDate, setKstDate] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setStatus("running");
    setError("");
    setCopied(false);

    try {
      const res = await fetch("/api/admin/blog-draft");
      const data: DraftResult = await res.json();

      if (!data.ok || !data.draft) {
        setStatus("error");
        setError(data.error ?? "초안 생성에 실패했습니다.");
        return;
      }

      setTitle(data.draft.title);
      setBody(data.draft.body);
      setCategories(data.draft.categories.join(", "));
      setKstDate(data.draft.kstDate);
      setStatus("done");
    } catch {
      setStatus("error");
      setError("네트워크 오류");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 실패 시 조용히 무시 — 텍스트는 화면에 그대로 남아있음
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">블로그 초안 생성</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">
          오늘의 기업동향 TOP30·시장 변화 데이터(데일리 다이제스트와 동일한 소스)를 기반으로 블로그 포스트 초안을 생성합니다.
          발행(이미지 첨부 포함)은 전체 수동으로 진행하며, 이 화면은 초안 텍스트 생성까지만 담당합니다.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={status === "running"}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconRefresh size={14} stroke={1.5} className={status === "running" ? "animate-spin" : ""} />
          {status === "running" ? "생성 중..." : "블로그 초안 생성"}
        </button>

        {status === "error" && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
            <IconAlertCircle size={14} stroke={1.5} />
            {error}
          </p>
        )}
      </div>

      {status === "done" && (
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">생성된 초안 · {kstDate} 기준</p>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#cccccc] transition-colors hover:bg-[#1a1a1a]"
            >
              {copied ? (
                <IconCheck size={13} stroke={2} className="text-emerald-400" />
              ) : (
                <IconCopy size={13} stroke={1.5} />
              )}
              {copied ? "복사됨" : "복사하기"}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                본문
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                className="w-full resize-y rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm leading-relaxed text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                제안 카테고리 (쉼표로 구분, 편집 가능)
              </label>
              <input
                type="text"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                className="w-full rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>
        </div>
      )}

      <DashboardDisclaimer />
    </div>
  );
}
