import { describe, expect, it } from 'vitest'
import { nextPageNo } from './index'

describe('nextPageNo', () => {
  it('빈 목록이면 1', () => {
    expect(nextPageNo([])).toBe(1)
  })
  it('중간이 비어도 최댓값 다음을 준다', () => {
    expect(nextPageNo(['a_p01.jpg', 'a_p02.jpg', 'a_p04.jpg'])).toBe(5)
  })
  it('주보의 -pNN 형식도 읽는다', () => {
    expect(nextPageNo(['2026-08-10-p03.pdf'])).toBe(4)
  })
})
