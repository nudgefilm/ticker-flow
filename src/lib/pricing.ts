export const PRO_MONTHLY_PRICE_KRW = 14900;
export const PRO_ANNUAL_PRICE_KRW = 142800;

export const PRO_ANNUAL_MONTHLY_EQUIVALENT_KRW = Math.round(PRO_ANNUAL_PRICE_KRW / 12);

export const PRO_ANNUAL_FREE_MONTHS = Math.round(
  (PRO_MONTHLY_PRICE_KRW * 12 - PRO_ANNUAL_PRICE_KRW) / PRO_MONTHLY_PRICE_KRW
);

export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

export const TAX_NOTICE_KO = "표시된 가격은 부가가치세(VAT) 등 세금이 포함된 금액입니다.";

// 결제 연동 완료 전까지 무통장입금 + 수동 확인으로 Pro 전환을 지원하기 위한 계좌 정보.
// 계좌 변경 시 이 상수만 수정하면 된다.
export const BANK_TRANSFER_INFO = {
  bank: "카카오뱅크",
  accountNumber: "3333-36-5175112",
  accountHolder: "언폴드랩(UNFOLD LAB)",
};
