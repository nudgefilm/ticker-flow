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
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm">
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="absolute -right-2 -top-2 z-10 rounded-full border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="닫기"
        >
          <IconX size={16} stroke={1.5} />
        </button>

        {/* 모달 카드 */}
        <div className="rounded-lg border border-border bg-card p-8">
          {/* 로고 */}
          <div className="mb-8 flex justify-center">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          <h1 className="mb-1 text-center text-xl font-semibold text-foreground">
            시작하기
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            구글 계정으로 바로 로그인하세요
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <IconBrandGoogle size={18} stroke={1.5} />
            구글로 계속하기
          </button>

          {/* 하단 링크 */}
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
    </div>
  );
}
