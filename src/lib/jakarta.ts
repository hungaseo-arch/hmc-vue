/*
  자카르타 기준 시각 표기. 교회가 거기 있고 관리자도 거기서 본다.
  자카르타는 UTC+7 고정이다 - 서머타임이 없어 오프셋을 상수로 박아도 안전하다.

  포맷터를 모듈 수준에 한 번만 만든다. Date#toLocaleString 은 부를 때마다
  Intl.DateTimeFormat 을 새로 짓는데, 접속 기록은 목록 50줄 · CSV 5,000줄을
  한 번에 훑는다. 행마다 포맷터를 새로 짓는 비용이 그대로 대기 시간이 된다.
*/

/** 날짜 문자열을 자카르타 시각으로 해석할 때 붙이는 오프셋. */
export const WIB = '+07:00'

const TZ = 'Asia/Jakarta'

/** 2026. 08. 10. 14:33:07 - 기록 목록·CSV 처럼 초까지 필요한 자리. */
const fullFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
})

/** 8. 10. 14:33 - 곁들이는 정보라 짧게. */
const shortFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TZ, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/** 2026년 8월 10일 오후 02:33 - 사람이 읽는 명부용. */
const longFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TZ,
  year: 'numeric', month: 'long', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

/** 8. 10. (월) - 날짜별 막대 눈금. */
const dayFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TZ, month: 'numeric', day: 'numeric', weekday: 'short',
})

/** YYYY-MM-DD. en-CA 는 이 순서를 그대로 준다. */
const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })

export function fullDateTime(iso: string): string {
  return fullFmt.format(new Date(iso))
}

export function shortDateTime(iso: string): string {
  return shortFmt.format(new Date(iso))
}

/** 값이 없으면 '-'. 명부에는 신청일이 비어 있는 옛 행이 있다. */
export function longDateTime(iso: string | null | undefined): string {
  return iso ? longFmt.format(new Date(iso)) : '-'
}

/** 'YYYY-MM-DD' 를 자카르타 자정으로 읽어 요일까지 붙인다. */
export function dayLabel(ymd: string): string {
  return dayFmt.format(new Date(`${ymd}T00:00:00${WIB}`))
}

/** 자카르타 기준 오늘. 'YYYY-MM-DD'. */
export function todayYmd(): string {
  return ymdFmt.format(new Date())
}

/** 'YYYY-MM-DD' 에서 delta 일 만큼 옮긴 날짜. */
export function shiftYmd(ymd: string, delta: number): string {
  const d = new Date(`${ymd}T00:00:00${WIB}`)
  d.setUTCDate(d.getUTCDate() + delta)
  return ymdFmt.format(d)
}

/** 파일 이름에 쓰는 20260810 꼴. */
export function todayCompact(): string {
  return todayYmd().replace(/-/g, '')
}
