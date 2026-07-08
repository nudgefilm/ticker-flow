"use client";

import { useState } from "react";
import { IconRefresh, IconAlertCircle, IconCopy, IconCheck } from "@tabler/icons-react";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";

// 이 화면에서 생성되는 콘텐츠는 CLAUDE.md 18항의 "어드민 전용 규제 예외
// 구간"이 아니다 — 검수 후 그대로 외부(네이버 블로그, X/Threads/LinkedIn 등)에
// 게시될 콘텐츠이므로, 일반 CLAUDE.md 원칙(6항 투자 권유 금지 표현 등)을
// 다른 사용자 노출 화면과 동일하게 준수해야 한다.

type Status = "idle" | "running" | "done" | "error";

const BODY_LENGTH_RANGE: [number, number] = [1400, 1900];

interface BlogDraft {
  title: string;
  body: string;
  bodyLength: number;
  categories: string[];
  hashtags: string[];
  imagePrompt: string;
  kstDate: string;
  snsX: string;
  snsLinkedIn: string;
}

interface DraftResult {
  ok: boolean;
  draft?: BlogDraft;
  error?: string;
}

interface DraftState {
  title: string;
  body: string;
  categories: string;
  hashtags: string;
  imagePrompt: string;
  kstDate: string;
  snsX: string;
  snsLinkedIn: string;
}

function CopyButton({ getText, label }: { getText: () => string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 실패 시 조용히 무시 — 텍스트는 화면에 그대로 남아있음
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#cccccc] transition-colors hover:bg-[#1a1a1a]"
    >
      {copied ? <IconCheck size={13} stroke={2} className="text-emerald-400" /> : <IconCopy size={13} stroke={1.5} />}
      {copied ? "복사됨" : label}
    </button>
  );
}

export default function BlogDraftPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);

  async function handleGenerate() {
    setStatus("running");
    setError(null);

    try {
      const res = await fetch("/api/admin/blog-draft");
      const data: DraftResult = await res.json();

      if (!data.ok || !data.draft) {
        setStatus("error");
        setError(data.error ?? "초안 생성에 실패했습니다.");
        return;
      }

      const d = data.draft;
      setDraft({
        title: d.title,
        body: d.body,
        categories: d.categories.join(", "),
        hashtags: d.hashtags.join(" "),
        imagePrompt: d.imagePrompt,
        kstDate: d.kstDate,
        snsX: d.snsX,
        snsLinkedIn: d.snsLinkedIn,
      });
      setStatus("done");
    } catch {
      setStatus("error");
      setError("네트워크 오류");
    }
  }

  function updateDraft(field: keyof DraftState, value: string) {
    setDraft((p) => (p ? { ...p, [field]: value } : p));
  }

  const bodyLength = draft?.body.length ?? 0;
  const [min, max] = BODY_LENGTH_RANGE;
  const inRange = bodyLength >= min && bodyLength <= max;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">블로그 초안 생성</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">
          오늘의 기업동향 TOP30·시장 변화 데이터(데일리 다이제스트와 동일한 소스)를 기반으로 &quot;오늘의 기업동향&quot; 통합 블로그 포스트
          초안과 X/Threads·LinkedIn용 SNS 요약본을 함께 생성합니다. 발행(이미지 첨부 포함)은 전체 수동으로 진행합니다.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={status === "running"}
          className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconRefresh size={14} stroke={1.5} className={status === "running" ? "animate-spin" : ""} />
          {status === "running" ? "생성 중..." : status === "done" ? "다시 생성" : "오늘의 기업동향 생성"}
        </button>
        {status === "error" && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-red-400">
            <IconAlertCircle size={13} stroke={1.5} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      {draft && (
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">오늘의 기업동향 초안 · {draft.kstDate} 기준</p>
            <CopyButton getText={() => `${draft.title}\n\n${draft.body}`} label="본문 복사" />
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                제목
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateDraft("title", e.target.value)}
                className="w-full rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                  본문
                </label>
                <span className={`text-[11px] tabular-nums ${inRange ? "text-[#a6a6a6]" : "text-amber-400"}`}>
                  {bodyLength}자 (목표 {min}~{max}자)
                </span>
              </div>
              <textarea
                value={draft.body}
                onChange={(e) => updateDraft("body", e.target.value)}
                rows={16}
                className="no-scrollbar w-full resize-y rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm leading-relaxed text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                제안 카테고리 (쉼표로 구분, 편집 가능)
              </label>
              <input
                type="text"
                value={draft.categories}
                onChange={(e) => updateDraft("categories", e.target.value)}
                className="w-full rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                  해시태그 (편집 가능)
                </label>
                <CopyButton getText={() => draft.hashtags} label="해시태그 복사" />
              </div>
              <input
                type="text"
                value={draft.hashtags}
                onChange={(e) => updateDraft("hashtags", e.target.value)}
                className="w-full rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm text-[#93c5fd] focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                  이미지 프롬프트 (코드 템플릿 생성 · 참고용)
                </label>
                <CopyButton getText={() => draft.imagePrompt} label="프롬프트 복사" />
              </div>
              <pre className="whitespace-pre-wrap rounded-[6px] border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-xs leading-relaxed text-[#a6a6a6]">
                {draft.imagePrompt}
              </pre>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                    X / Threads 요약 (편집 가능)
                  </label>
                  <CopyButton getText={() => draft.snsX} label="복사" />
                </div>
                <textarea
                  value={draft.snsX}
                  onChange={(e) => updateDraft("snsX", e.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm leading-relaxed text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <p className="mt-1 text-[11px] tabular-nums text-[#a6a6a6]">{draft.snsX.length}자</p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                    LinkedIn 요약 (편집 가능)
                  </label>
                  <CopyButton getText={() => draft.snsLinkedIn} label="복사" />
                </div>
                <textarea
                  value={draft.snsLinkedIn}
                  onChange={(e) => updateDraft("snsLinkedIn", e.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-2 text-sm leading-relaxed text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <p className="mt-1 text-[11px] tabular-nums text-[#a6a6a6]">{draft.snsLinkedIn.length}자</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <DashboardDisclaimer />
    </div>
  );
}
