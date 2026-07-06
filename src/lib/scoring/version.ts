// 현재 스코어링 모델 버전의 단일 관리 지점(Single Source of Truth).
//
// weights.ts의 SCREENER_WEIGHTS를 변경할 때는 반드시 이 값도 함께 갱신한다.
// weights.ts와 분리한 이유는 가중치만 수정하고 버전을 안 올리는 실수를
// 구조적으로 방지하기 위함이다.
//
// top30_daily·top30_entries 양쪽에 이 값을 스냅샷 저장해 어느 시점의 TOP30이
// 어떤 모델 버전으로 계산됐는지 항상 추적 가능하도록 한다 (CLAUDE.md 18항).
//
// 향후 여러 서버 인스턴스·롤백·A/B 테스트 등으로 운영 중 동적 버전 변경이
// 필요해지기 전까지는 DB 설정 테이블로 이전하지 않는다.
export const SCORING_MODEL_VERSION = "v1";
