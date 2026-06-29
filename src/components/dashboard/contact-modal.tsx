"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";

interface Props {
  email: string;
  defaultSubject?: string;
  onClose: () => void;
}

export default function ContactModal({ email, defaultSubject = "", onClose }: Props) {
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as { error?: string }).error ?? "오류가 발생했습니다.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg rounded-[8px] border border-white/[0.08] bg-[#1a1a1a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">문의하기</h2>
            <p className="mt-0.5 text-xs text-[#a6a6a6]">
              서비스 이용 관련 문의사항을 남겨주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#a6a6a6] transition-colors hover:text-white"
          >
            <IconX size={18} stroke={1.5} />
          </button>
        </div>

        {status === "success" ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#cccccc]">문의가 접수되었습니다.</p>
            <p className="mt-1.5 text-xs text-[#a6a6a6]">
              담당자 확인 후 이메일로 답변드리겠습니다.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-[6px] bg-white px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 (읽기 전용) */}
            <div>
              <label className="mb-1.5 block text-xs text-[#a6a6a6]">이메일</label>
              <input
                type="text"
                value={email}
                readOnly
                className="w-full rounded-[6px] border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-[#666] outline-none"
              />
            </div>

            {/* 제목 */}
            <div>
              <label className="mb-1.5 block text-xs text-[#a6a6a6]">제목 *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
                placeholder="문의 제목을 입력하세요"
                className="w-full rounded-[6px] border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-[#555] outline-none focus:border-white/20"
              />
            </div>

            {/* 내용 */}
            <div>
              <label className="mb-1.5 block text-xs text-[#a6a6a6]">내용 *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                maxLength={2000}
                placeholder="문의 내용을 입력하세요"
                className="w-full resize-none rounded-[6px] border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-[#555] outline-none focus:border-white/20"
              />
            </div>

            {status === "error" && (
              <p className="text-xs text-red-400">{errorMsg}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[6px] border border-white/[0.08] py-2.5 text-sm text-[#a6a6a6] transition-colors hover:bg-[#242424] hover:text-white"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex-1 rounded-[6px] bg-white py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {status === "submitting" ? "전송 중..." : "문의 제출"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
