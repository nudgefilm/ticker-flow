// 성과 추적 기간 목록 (일 단위).
//
// 180, 365 등 임의 기간 추가 시 이 배열에 값만 추가하면 되며, 다른 파일을
// 수정할 필요가 없다 — top30.ts가 신규 Entry 생성 시 이 배열 길이만큼
// top30_outcome_results pending 행을 만들고, top30-outcomes.ts가 이 배열을
// 기준으로 만기 여부를 판정한다.
export const TRACKED_DAYS = [30, 60, 90];
