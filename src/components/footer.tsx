"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { LegalModal } from "@/components/legal-modal";

type ModalType = "privacy" | "terms" | "data-sources" | null;

const DATA_SOURCES_SECTIONS = [
  { title: "공시 정보",   content: "미국 증권거래위원회(SEC EDGAR) 공식 데이터베이스" },
  { title: "어닝콜",      content: "기업 공식 실적 발표 컨퍼런스콜 기반 한국어 요약" },
  { title: "뉴스",        content: "공개된 뉴스 매체 정보를 기반으로 제공됩니다." },
  { title: "실적 캘린더", content: "나스닥(NASDAQ)·뉴욕증권거래소(NYSE) 상장 기업의 실적 발표 일정을 기반으로 제공됩니다." },
  { title: "내부자 거래", content: "미국 증권거래위원회(SEC EDGAR) Form 4 공시 기반 임원·대주주 거래 내역" },
  { title: "경제지표",    content: "미국 연방준비제도(FRED) 데이터베이스 (GDP, CPI(소비자물가지수), 금리 등)" },
];

function DataSourcesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-none items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">데이터 출처 안내</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">최종 업데이트: 2026년 6월 25일</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="닫기">
            <IconX size={18} stroke={1.5} />
          </button>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-5">
          {DATA_SOURCES_SECTIONS.map((section) => (
            <div key={section.title} className="flex items-baseline gap-3 border-b border-border py-3 last:border-0">
              <span className="w-20 shrink-0 text-sm font-semibold text-foreground">{section.title}</span>
              <span className="text-sm font-light text-muted-foreground">{section.content}</span>
            </div>
          ))}
          <p className="mt-5 text-xs text-muted-foreground">투자 판단의 근거로 사용하기 전 원문 출처를 직접 확인하시기 바랍니다.</p>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const [modal, setModal] = useState<ModalType>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  async function handleCopyrightClick() {
    const res = await fetch("/api/is-admin");
    const { isAdmin } = await res.json();
    if (isAdmin) router.push("/admin");
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = document.getElementById("site-content");
    if (!el) return;
    if (modal) {
      el.style.filter = "blur(6px)";
      el.style.transition = "filter 0.2s ease";
      document.body.style.overflow = "hidden";
    } else {
      el.style.filter = "";
      document.body.style.overflow = "";
    }
    return () => {
      el.style.filter = "";
      document.body.style.overflow = "";
    };
  }, [modal]);

  const handleClose = () => setModal(null);

  return (
    <>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-12">
          {/* 상단: 로고 + 링크 */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[19px] font-semibold tracking-tight text-foreground">TickerFlow</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setModal("data-sources")}
                className="transition-colors hover:text-foreground"
              >
                데이터 출처
              </button>
              <button
                type="button"
                onClick={() => setModal("privacy")}
                className="transition-colors hover:text-foreground"
              >
                개인정보처리방침
              </button>
              <button
                type="button"
                onClick={() => setModal("terms")}
                className="transition-colors hover:text-foreground"
              >
                이용약관
              </button>
            </nav>
          </div>

          {/* 하단: 사업자 정보(좌) + 면책 문구(우) */}
          <div className="mt-8 border-t border-border pt-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
              {/* 좌측: 사업자 정보 */}
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80">언폴드랩(UNFOLD LAB)</p>
                <p>대표: 정재우 | 사업자등록번호: 136-11-23540 | 통신판매업신고: 제 2026-서울강남-XXXX 호</p>
                <p>주소: 서울특별시 강남구 압구정로2길 46, 214-S46호</p>
                <p>연락처: 02-518-2022 | 이메일: support@tickerflow.net</p>
              </div>
              {/* 우측: 면책 문구 */}
              <div className="shrink-0 space-y-1 text-xs text-muted-foreground sm:pt-6 sm:text-right">
                <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
                <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
                <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
              </div>
            </div>
            {/* 저작권 */}
            <p className="mt-6 text-xs text-muted-foreground">
              <button type="button" onClick={handleCopyrightClick} className="cursor-default">©</button>{" "}2026 언폴드랩. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {mounted && modal === "data-sources" && createPortal(
        <DataSourcesModal onClose={handleClose} />,
        document.body
      )}
      {mounted && (modal === "terms" || modal === "privacy") && createPortal(
        <LegalModal type={modal} onClose={handleClose} />,
        document.body
      )}
    </>
  );
}
