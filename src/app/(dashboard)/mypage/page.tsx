"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconBell,
  IconDownload,
  IconMail,
  IconMessageCircle,
  IconLogout,
  IconTrash,
  IconLock,
  IconX,
  IconAlertTriangle,
  IconChevronRight,
} from "@tabler/icons-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ContactModal from "@/components/dashboard/contact-modal";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import { useProfile } from "@/lib/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";

function SectionCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#1a1a1a]">
      <p className="border-b border-white/[0.06] bg-[#242424] px-5 py-3.5 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 last:border-0">
      <span className="text-sm text-[#a6a6a6]">{label}</span>
      <div className="text-sm text-white">{children}</div>
    </div>
  );
}

export default function MyPage() {
  const profile = useProfile();
  const router = useRouter();
  const [createdAt, setCreatedAt] = useState("—");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contactSubject, setContactSubject] = useState<string | null>(null);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.created_at) {
        setCreatedAt(
          new Date(data.user.created_at).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        );
      }
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (res.ok) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
      } else {
        setDeleting(false);
      }
    } catch {
      setDeleting(false);
    }
  }

  async function handleCsvDownload() {
    if (downloadingCsv) return;
    setDownloadingCsv(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      type WlRow = {
        ticker: string;
        added_at: string;
        tickers: { name_kr: string | null; name_en: string | null } | null;
      };
      const { data } = await supabase
        .from("watchlist")
        .select("ticker, added_at, tickers(name_kr, name_en)")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false });

      const rows = (data ?? []) as unknown as WlRow[];
      const lines = ["티커,회사명,추가일"];
      for (const row of rows) {
        const name = row.tickers?.name_kr ?? row.tickers?.name_en ?? "";
        const date = row.added_at?.slice(0, 10) ?? "";
        lines.push(`${row.ticker},"${name}",${date}`);
      }

      const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tickerflow-watchlist.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingCsv(false);
    }
  }

  if (!profile) return null;

  const isPro = profile.plan === "pro";

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="마이페이지" />

      <div className="mt-6 flex flex-col gap-4">

        {/* 1. 계정 정보 */}
        <SectionCard label="계정 정보">
          <InfoRow label="이메일">{profile.email}</InfoRow>
          <InfoRow label="가입일">{createdAt}</InfoRow>
        </SectionCard>

        {/* 2. 구독 플랜 */}
        <SectionCard label="구독 플랜">
          {isPro ? (
            <InfoRow label="현재 플랜">
              <span className="rounded-[4px] bg-[#3b82f6] px-2 py-0.5 text-xs font-medium text-white">
                Pro
              </span>
            </InfoRow>
          ) : (
            <>
              <InfoRow label="현재 플랜">Free</InfoRow>
              <div className="px-5 py-4">
                <Link
                  href="/billing"
                  className="inline-flex items-center gap-1.5 rounded-[6px] bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
                >
                  Pro로 업그레이드
                  <IconChevronRight size={14} stroke={2} />
                </Link>
              </div>
            </>
          )}
        </SectionCard>

        {/* 3. 알림 설정 */}
        <SectionCard label="알림 설정">
          {isPro ? (
            <div className="px-5 py-4">
              <Link
                href="/alerts"
                className="inline-flex items-center gap-2 text-sm text-white transition-colors hover:text-[#cccccc]"
              >
                <IconBell size={16} stroke={1.5} />
                알림 설정 바로가기
                <IconChevronRight size={14} stroke={1.5} className="text-[#a6a6a6]" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2 text-sm text-[#a6a6a6]">
                <IconLock size={16} stroke={1.5} />
                Pro 전용 기능
              </div>
              <Link
                href="/billing"
                className="rounded-[6px] bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/90"
              >
                Pro 시작하기
              </Link>
            </div>
          )}
        </SectionCard>

        {/* 4. 데이터 내보내기 */}
        <SectionCard label="데이터 내보내기">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm text-white">와치리스트 CSV 다운로드</p>
              <p className="mt-0.5 text-xs text-[#a6a6a6]">
                현재 와치리스트 종목을 CSV 파일로 내보냅니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCsvDownload}
              disabled={downloadingCsv}
              className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#cccccc] transition-colors hover:bg-[#1a1a1a] hover:text-white disabled:opacity-50"
            >
              <IconDownload size={14} stroke={1.5} />
              {downloadingCsv ? "준비 중..." : "다운로드"}
            </button>
          </div>
        </SectionCard>

        {/* 5. 문의 및 피드백 */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
            문의 및 피드백
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setContactSubject("")}
              className="flex w-full items-start gap-3 rounded-[6px] border border-white/[0.08] bg-blue-500/[0.15] p-5 text-left transition-colors hover:bg-blue-500/[0.22]"
            >
              <IconMail size={20} stroke={1.5} className="mt-0.5 shrink-0 text-[#a6a6a6]" />
              <div>
                <p className="text-sm font-medium text-white">문의하기</p>
                <p className="mt-1 text-xs leading-relaxed text-[#a6a6a6]">
                  서비스 이용 관련 문의사항을 남겨주세요.
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setContactSubject("피드백 — 기능 제안/버그 신고")}
              className="flex w-full items-start gap-3 rounded-[6px] border border-white/[0.08] bg-blue-500/[0.15] p-5 text-left transition-colors hover:bg-blue-500/[0.22]"
            >
              <IconMessageCircle size={20} stroke={1.5} className="mt-0.5 shrink-0 text-[#a6a6a6]" />
              <div>
                <p className="text-sm font-medium text-white">피드백</p>
                <p className="mt-1 text-xs leading-relaxed text-[#a6a6a6]">
                  기능 제안이나 버그 신고를 남겨주세요.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 7. 데이터 출처 안내 */}
        <SectionCard label="데이터 출처 안내">
          <div className="px-5 pb-5">
            <div className="overflow-hidden rounded-[4px] border border-white/20">
              {[
                { name: "공시 정보",   desc: "미국 증권거래위원회(SEC EDGAR) 공식 데이터베이스" },
                { name: "어닝콜",      desc: "기업 공식 실적 발표 컨퍼런스콜 기반 한국어 요약" },
                { name: "뉴스",        desc: "공개된 뉴스 매체 정보를 기반으로 제공됩니다." },
                { name: "실적 캘린더", desc: "나스닥(NASDAQ)·뉴욕증권거래소(NYSE) 상장 기업의 실적 발표 일정을 기반으로 제공됩니다." },
                { name: "내부자 거래", desc: "미국 증권거래위원회(SEC EDGAR) Form 4 공시 기반 임원·대주주 거래 내역" },
                { name: "경제지표",    desc: "미국 연방준비제도(FRED) 데이터베이스 (GDP, CPI(소비자물가지수), 금리 등)" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-start gap-3 border-b border-white/10 px-4 py-2.5 last:border-0"
                >
                  <span className="mt-0.5 w-20 shrink-0 text-xs font-medium text-white">
                    {item.name}
                  </span>
                  <span className="text-xs leading-relaxed text-[#a6a6a6]">{item.desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#a6a6a6]">
              투자 판단의 근거로 사용하기 전 원문 출처를 직접 확인하시기 바랍니다.
            </p>
          </div>
        </SectionCard>

        {/* 8. 계정 관리 */}
        <SectionCard label="계정 관리">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <p className="text-sm text-white">로그아웃</p>
              <p className="mt-0.5 text-xs text-[#a6a6a6]">현재 기기에서 로그아웃합니다.</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#cccccc] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              <IconLogout size={14} stroke={1.5} />
              로그아웃
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm text-red-400">회원 탈퇴</p>
              <p className="mt-0.5 text-xs text-[#a6a6a6]">계정 및 모든 데이터가 삭제됩니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 rounded-[6px] border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"
            >
              <IconTrash size={14} stroke={1.5} />
              회원 탈퇴
            </button>
          </div>
        </SectionCard>

      </div>

      <DashboardDisclaimer />

      {/* 문의 모달 */}
      {contactSubject !== null && profile && (
        <ContactModal
          email={profile.email}
          defaultSubject={contactSubject}
          onClose={() => setContactSubject(null)}
        />
      )}

      {/* 회원 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-md rounded-[8px] border border-white/[0.08] bg-[#1a1a1a] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <IconAlertTriangle
                size={20}
                stroke={1.5}
                className="mt-0.5 shrink-0 text-red-400"
              />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">회원 탈퇴</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#a6a6a6]">
                  와치리스트, 알림 설정, 구독 정보 등 계정 데이터가 삭제됩니다.
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
              {!deleting && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="shrink-0 text-[#a6a6a6] transition-colors hover:text-white"
                >
                  <IconX size={18} stroke={1.5} />
                </button>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-[6px] border border-white/[0.08] py-2.5 text-sm text-[#a6a6a6] transition-colors hover:bg-[#1a1a1a] hover:text-white disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-[6px] bg-red-500/90 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "처리 중..." : "탈퇴 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
