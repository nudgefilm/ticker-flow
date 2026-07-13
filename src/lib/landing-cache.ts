// 랜딩(/) 캐시 데이터 공통 태그.
//
// 히어로 차트(공시유형분포/트렌드/섹터활동), 통계 카운트(가입자·공시·뉴스 등),
// 최근 7일 활동이 많았던 기업(구 landing-top10.tsx, 2026-07-13 page.tsx로 병합)이
// 전부 이 태그 하나로 묶여 있다. 시간 기반 revalidate는 쓰지 않고(unstable_cache의
// tags만 사용, revalidate: false) 순수 태그 기반으로만 갱신한다 —
// /api/revalidate/landing(매일 04:00 KST 크론)이
// revalidateTag(LANDING_DATA_CACHE_TAG) 한 번으로 셋을 동시에 무효화한다.
//
// 이 태그를 쓰는 곳: src/app/page.tsx, src/app/api/revalidate/landing/route.ts.
// 새 랜딩 캐시를 추가할 때도 이 상수를 재사용할 것 — 문자열을 새로 하드코딩하지 않는다.
export const LANDING_DATA_CACHE_TAG = "landing-data";
