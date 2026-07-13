import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireCollectAuth } from "@/lib/collect/auth";
import { LANDING_DATA_CACHE_TAG } from "@/lib/landing-cache";

// 랜딩(/) 캐시 무효화 — 히어로 차트·통계 카운트·최근 7일 활동 기업(page.tsx의
// getCachedTopCompanies)을 하나의 태그로 한 번에 갱신한다. 매일 04:00 KST 크론(vercel.json)이 호출하는 내부 배관성
// 엔드포인트라 admin/system/trigger/page.tsx에는 등록하지 않는다(수동 즉시실행
// 필요 없음 — docs/scoring-engine-rules.md 3-4항과 동일하게 "완료 보고 전
// 실제 반영 확인" 원칙만 적용, 별도 크론 트리거 버튼은 불필요).
export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  // 이 Next.js 버전의 revalidateTag는 두 번째 profile 인자가 필수다. 'max'는
  // "온디맨드 무효화 전까지는 만료시키지 않는" 프로필로, unstable_cache 쪽의
  // revalidate: false(시간 기반 만료 없음)와 의미가 맞아떨어진다.
  revalidateTag(LANDING_DATA_CACHE_TAG, "max");
  return NextResponse.json({ ok: true, tag: LANDING_DATA_CACHE_TAG });
}
