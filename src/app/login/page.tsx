"use client";

import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBrandGoogle, IconX } from "@tabler/icons-react";

export default function LoginPage() {
  const router = useRouter();

  async function handleGoogleLogin() {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-sm rounded-xl border border-border bg-card px-8 pb-8 pt-12"
      >
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
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            이용약관
          </Link>
          {" "}및{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            개인정보처리방침
          </Link>
          에 동의한 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
