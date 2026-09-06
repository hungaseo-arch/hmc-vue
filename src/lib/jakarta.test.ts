import { describe, expect, it } from 'vitest'
import { dayLabel, fullDateTime, longDateTime, shiftYmd, shortDateTime } from './jakarta'

describe('jakarta 시각', () => {
  it('UTC 를 UTC+7 로 옮긴다', () => {
    expect(fullDateTime('2026-08-10T07:33:07Z')).toBe('2026. 08. 10. 14:33:07')
    expect(shortDateTime('2026-08-10T07:33:00Z')).toBe('8. 10. 14:33')
  })
  it('자정은 24:00 이 아니라 00:00', () => {
    expect(fullDateTime('2026-08-09T17:00:00Z')).toBe('2026. 08. 10. 00:00:00')
  })
  it('값이 없으면 -', () => {
    expect(longDateTime(null)).toBe('-')
    expect(longDateTime(undefined)).toBe('-')
  })
  it('요일 라벨', () => {
    expect(dayLabel('2026-08-10')).toBe('8. 10. (월)')
  })
  it('날짜 이동은 달·해를 넘긴다', () => {
    expect(shiftYmd('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftYmd('2026-01-01', -1)).toBe('2025-12-31')
  })
})
