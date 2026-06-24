"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IconX } from "@tabler/icons-react";

const PRIVACY_SECTIONS = [
  {
    title: "수집하는 개인정보",
    content: `서비스 이용 과정에서 아래와 같은 정보를 수집합니다.\n· 구글 계정 정보 (이메일, 이름, 프로필 사진)\n· 서비스 이용 기록 및 접속 로그\n· 결제 정보 (구독 플랜, 결제 일시)`,
  },
  {
    title: "개인정보 이용 목적",
    content: `수집한 개인정보는 다음 목적으로만 사용합니다.\n· 서비스 제공 및 회원 관리\n· 구독 플랜 관리 및 결제 처리\n· 서비스 개선 및 신규 기능 개발\n· 공지사항 및 서비스 관련 안내 발송`,
  },
  {
    title: "개인정보 보유 기간",
    content: `회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.`,
  },
  {
    title: "개인정보 제3자 제공",
    content: `언폴드랩은 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 결제 처리를 위해 Polar.sh에 최소한의 정보를 제공합니다.`,
  },
  {
    title: "문의",
    content: `개인정보 관련 문의사항은 아래로 연락해 주세요.\n· 운영사: 언폴드랩\n· 이메일: contact@tickerflow.net`,
  },
];

const TERMS_SECTIONS = [
  {
    title: "서비스 개요",
    content: `TickerFlow(이하 '서비스')는 언폴드랩이 운영하는 나스닥 모니터링 대시보드입니다. 본 서비스는 공개된 정보를 수집·가공·시각화하여 제공하는 정보 서비스이며, 투자 자문 서비스가 아닙니다.`,
  },
  {
    title: "이용 조건",
    content: `· 만 19세 이상이면 누구나 이용할 수 있습니다.\n· 구글 계정을 통해 가입할 수 있습니다.\n· 1인 1계정 원칙을 준수해야 합니다.`,
  },
  {
    title: "서비스 이용 제한",
    content: `아래의 경우 서비스 이용이 제한될 수 있습니다.\n· 서비스 운영을 방해하는 행위\n· 타인의 개인정보를 도용하는 행위\n· 서비스 콘텐츠를 무단으로 복제·배포하는 행위`,
  },
  {
    title: "면책 조항",
    content: `본 서비스는 공개된 정보를 기반으로 시장 흐름을 시각화한 참고용 도구입니다. 특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다. 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다. 언폴드랩은 서비스 내 정보의 정확성·완전성을 보장하지 않으며, 이로 인한 손실에 대해 법적 책임을 지지 않습니다.`,
  },
  {
    title: "구독 및 결제",
    content: `· Free 플랜은 무료로 이용할 수 있습니다.\n· Pro 플랜은 월 ₩14,900 또는 연 ₩142,800으로 이용할 수 있습니다.\n· 구독은 언제든지 해지할 수 있으며, 해지 후에도 결제 기간 만료일까지 이용 가능합니다.`,
  },
  {
    title: "약관 변경",
    content: `본 약관은 서비스 개선을 위해 변경될 수 있습니다. 변경 시 서비스 내 공지를 통해 안내합니다.`,
  },
  {
    title: "문의",
    content: `서비스 이용 관련 문의사항은 아래로 연락해 주세요.\n· 운영사: 언폴드랩\n· 이메일: contact@tickerflow.net`,
  },
];

type ModalType = "privacy" | "terms" | null;

interface ModalConfig {
  title: string;
  updated: string;
  sections: { title: string; content: string }[];
}

const MODAL_CONFIG: Record<Exclude<ModalType, null>, ModalConfig> = {
  privacy: {
    title: "개인정보처리방침",
    updated: "2026년 6월 24일",
    sections: PRIVACY_SECTIONS,
  },
  terms: {
    title: "이용약관",
    updated: "2026년 6월 24일",
    sections: TERMS_SECTIONS,
  },
};

function LegalModal({ type, onClose }: { type: Exclude<ModalType, null>; onClose: () => void }) {
  const config = MODAL_CONFIG[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 반투명 오버레이 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 패널 */}
      <div
        className="relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex flex-none items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">최종 업데이트: {config.updated}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="닫기"
          >
            <IconX size={18} stroke={1.5} />
          </button>
        </div>

        {/* 본문 */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-5">
          {config.sections.map((section) => (
            <section key={section.title} className="mb-6 last:mb-0">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{section.title}</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {section.content}
              </p>
            </section>
          ))}
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
              <span className="text-sm text-muted-foreground">언폴드랩</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#pricing" className="transition-colors hover:text-foreground">
                요금제
              </Link>
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

          {/* 면책 문구 */}
          <div className="mt-8 space-y-1.5 border-t border-border pt-8 text-xs text-muted-foreground">
            <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
            <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
            <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
            <p className="pt-2">
              <button type="button" onClick={handleCopyrightClick} className="cursor-default">©</button>{" "}2026 언폴드랩. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {mounted && modal && createPortal(
        <LegalModal type={modal} onClose={handleClose} />,
        document.body
      )}
    </>
  );
}
