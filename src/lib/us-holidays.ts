/**
 * 미국 연방 공휴일 유틸리티.
 * SEC EDGAR는 미국 연방 공휴일·주말에 공시를 접수하지 않거나 접수량이 크게 줄어든다.
 *
 * 공휴일이 토요일과 겹치면 전 금요일, 일요일과 겹치면 다음 월요일에 관측(observed)된다.
 * 실제 휴장 판단은 항상 관측일(observed date) 기준으로 하고, 원래 날짜(canonical date)는
 * 참고용으로 함께 보관한다.
 */

export interface UsHoliday {
  /** 공휴일 원래 날짜(canonical date) */
  date: Date;
  /** 실제 휴장이 적용되는 관측일(observed date) */
  observed: Date;
  name: string;
}

export interface UsHolidayCheck {
  isHoliday: boolean;
  name?: string;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** 공휴일 날짜 → 실제 관측일(Observed Date) 반환 (토요일→금요일, 일요일→월요일). */
function getObservedDate(holiday: Date): Date {
  const day = holiday.getDay();
  if (day === 6) return addDays(holiday, -1);
  if (day === 0) return addDays(holiday, 1);
  return holiday;
}

/**
 * 특정 연/월의 n번째 요일(weekday)에 해당하는 날짜를 반환한다.
 * n이 양수면 n번째, -1이면 해당 월의 마지막 요일을 반환한다.
 * month는 0(1월)~11(12월), weekday는 0(일)~6(토) 기준.
 */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  if (n > 0) {
    const first = new Date(year, month, 1);
    const day = 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7;
    return new Date(year, month, day);
  }
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const day = lastDayOfMonth.getDate() - ((lastDayOfMonth.getDay() - weekday + 7) % 7);
  return new Date(year, month, day);
}

function getUsHolidaysForYear(year: number): UsHoliday[] {
  const canonical: { date: Date; name: string }[] = [
    { date: new Date(year, 0, 1), name: "뉴이어" },
    { date: nthWeekdayOfMonth(year, 0, 1, 3), name: "MLK Day" },
    { date: nthWeekdayOfMonth(year, 1, 1, 3), name: "프레지던트 데이" },
    { date: nthWeekdayOfMonth(year, 4, 1, -1), name: "메모리얼 데이" },
    { date: new Date(year, 5, 19), name: "준틴스" },
    { date: new Date(year, 6, 4), name: "독립기념일" },
    { date: nthWeekdayOfMonth(year, 8, 1, 1), name: "레이버 데이" },
    { date: nthWeekdayOfMonth(year, 9, 1, 2), name: "콜럼버스 데이" },
    { date: new Date(year, 10, 11), name: "베테랑스 데이" },
    { date: nthWeekdayOfMonth(year, 10, 4, 4), name: "추수감사절" },
    { date: new Date(year, 11, 25), name: "크리스마스" },
  ];
  return canonical.map((h) => ({ ...h, observed: getObservedDate(h.date) }));
}

/**
 * date가 속한 연도 기준 앞뒤 1년치 공휴일을 함께 모은다.
 * 뉴이어가 토요일과 겹치면 관측일이 전년도 12/31로 넘어가는 등 연도 경계 case를 다루기 위함.
 */
function getNearbyUsHolidays(year: number): UsHoliday[] {
  return [
    ...getUsHolidaysForYear(year - 1),
    ...getUsHolidaysForYear(year),
    ...getUsHolidaysForYear(year + 1),
  ];
}

/** 주어진 날짜가 미국 연방 공휴일 관측일인지 여부와 공휴일명을 반환한다. */
export function isUsHoliday(date: Date): UsHolidayCheck {
  const holidays = getNearbyUsHolidays(date.getFullYear());
  const match = holidays.find((h) => isSameDate(h.observed, date));
  return match ? { isHoliday: true, name: match.name } : { isHoliday: false };
}

/** 주어진 날짜가 주말 또는 미국 연방 공휴일 관측일인지 여부를 반환한다. */
export function isUsMarketClosed(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  return isUsHoliday(date).isHoliday;
}

/** 주어진 날짜에 미국 시장(SEC 포함)이 열려 있는지 여부를 반환한다. */
export function isMarketOpen(date: Date): boolean {
  return !isUsMarketClosed(date);
}

/** 해당 연도에 실제로 관측되는(휴장이 적용되는) 공휴일 전체 목록을 관측일 오름차순으로 반환한다. */
export function getObservedHolidays(year: number): UsHoliday[] {
  return getNearbyUsHolidays(year)
    .filter((h) => h.observed.getFullYear() === year)
    .sort((a, b) => a.observed.getTime() - b.observed.getTime());
}

/** 주어진 날짜 다음의 가장 가까운 거래일(주말·공휴일 관측일이 아닌 날)을 반환한다. */
export function nextTradingDay(date: Date): Date {
  let next = addDays(date, 1);
  while (!isMarketOpen(next)) {
    next = addDays(next, 1);
  }
  return next;
}

/**
 * 공시 피드 상단에 표시할 안내 문구를 반환한다.
 * 우선순위: 오늘 공휴일(관측일) > 내일 공휴일(오늘이 공휴일 전날) > 주말 > 평일(null).
 */
export function getMarketStatusMessage(date: Date): string | null {
  const today = isUsHoliday(date);
  if (today.isHoliday) {
    return `오늘은 미국 ${today.name}으로 SEC 공시가 평소보다 적게 접수됩니다.`;
  }

  const tomorrow = addDays(date, 1);
  const tomorrowHoliday = isUsHoliday(tomorrow);
  if (tomorrowHoliday.isHoliday) {
    return `내일은 미국 ${tomorrowHoliday.name}으로 오늘 SEC 공시가 평소보다 적게 접수됩니다.`;
  }

  const day = date.getDay();
  if (day === 0 || day === 6) {
    return "주말에는 SEC 공시가 접수되지 않습니다.";
  }

  return null;
}
