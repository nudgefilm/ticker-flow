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
