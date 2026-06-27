"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { IconBrandGoogle, IconX } from "@tabler/icons-react";
import { LegalModal, type LegalType } from "@/components/legal-modal";

export default function LoginPage() {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  const [legalType, setLegalType] = useState<LegalType | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    setHasError(params.get("error") === "auth");
  }, []);

  async function handleGoogleLogin() {
    const supabase = createClient();
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const redirectTo = `${base}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
        <div className="relative w-full max-w-sm rounded-xl border border-border bg-card px-8 pb-8 pt-12">
          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="닫기"
          >
            <IconX size={16} stroke={1.5} />
          </button>

          {/* 브랜드명 */}
          <div className="mb-2 text-center">
            <span className="text-3xl font-bold tracking-tight text-foreground">TickerFlow</span>
          </div>

          {/* 부제목 */}
          <p className="mb-8 text-center text-sm text-muted-foreground">
            미국 기업의 중요한 변화, 놓치지 마세요
          </p>

          {/* 오류 메시지 */}
          {hasError && (
            <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-center">
              <p className="text-xs text-red-400">로그인 중 오류가 발생했습니다. 다시 시도해 주세요.</p>
            </div>
          )}

          {/* 구글 버튼 */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
          >
            <IconBrandGoogle size={18} stroke={1.5} />
            Continue with Google
          </button>

          {/* 하단 약관 */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            로그인 시{" "}
            <button
              type="button"
              onClick={() => setLegalType("terms")}
              className="underline underline-offset-2 hover:text-foreground"
            >
              이용약관
            </button>
            {" "}및{" "}
            <button
              type="button"
              onClick={() => setLegalType("privacy")}
              className="underline underline-offset-2 hover:text-foreground"
            >
              개인정보처리방침
            </button>
            에 동의한 것으로 간주됩니다.
          </p>
        </div>
      </div>

      {mounted && legalType && createPortal(
        <LegalModal type={legalType} onClose={() => setLegalType(null)} />,
        document.body
      )}
    </>
  );
}
