import Link from "next/link";
import Logo from "@/components/logo";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* 상단: 로고 + 링크 */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-sm text-muted-foreground">언폴드랩</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="#pricing"
              className="transition-colors hover:text-foreground"
            >
              요금제
            </Link>
            <Link href="#" className="transition-colors hover:text-foreground">
              개인정보처리방침
            </Link>
            <Link href="#" className="transition-colors hover:text-foreground">
              이용약관
            </Link>
          </nav>
        </div>

        {/* 면책 문구 */}
        <div className="mt-8 space-y-1.5 border-t border-border pt-8 text-xs text-muted-foreground">
          <p>
            본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.
          </p>
          <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
          <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
          <p className="pt-2">© 2026 언폴드랩. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
