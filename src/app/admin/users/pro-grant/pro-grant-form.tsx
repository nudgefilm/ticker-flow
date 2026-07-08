"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconShieldStar } from "@tabler/icons-react";
import { PRO_GRANT_PERIODS, type ProGrantPeriod } from "@/lib/collect/pro-expiry";

const PERIOD_LABELS: Record<ProGrantPeriod, string> = {
  "1m": "1개월",
  "3m": "3개월",
  "6m": "6개월",
  "12m": "12개월",
  "lifetime": "무기한",
};

type Status = "idle" | "loading" | "done" | "error";

export default function ProGrantForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [period, setPeriod] = useState<ProGrantPeriod>("1m");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      setStatus("error");
      setMessage("이메일을 입력하세요.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/pro-grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, period }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "부여 실패");
        return;
      }

      setStatus("done");
      setMessage(`${data.email}에 Pro 플랜을 부여했습니다.`);
      setEmail("");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("네트워크 오류");
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <label className="mb-1.5 block text-xs text-[#a6a6a6]">이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#a6a6a6] outline-none focus:border-white/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-[#a6a6a6]">기간</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as ProGrantPeriod)}
          className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
        >
          {PRO_GRANT_PERIODS.map((value) => (
            <option key={value} value={value}>
              {PERIOD_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={status === "loading"}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconShieldStar size={16} stroke={1.5} />
        {status === "loading" ? "처리 중..." : "Pro 부여"}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-400" : "text-green-400"}`}>{message}</p>
      )}
    </div>
  );
}
