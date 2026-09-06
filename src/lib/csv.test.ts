import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from './csv'

describe('csvCell', () => {
  it('큰따옴표로 감싸고 안쪽 따옴표는 두 개로', () => {
    expect(csvCell('a"b')).toBe('"a""b"')
  })
  it('null·undefined 는 빈 칸', () => {
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
  })
  it('수식으로 읽힐 수 있는 칸은 작은따옴표로 고정', () => {
    for (const c of ['=', '+', '-', '@']) expect(csvCell(`${c}1`)).toBe(`"'${c}1"`)
  })
  it('전화번호처럼 0 으로 시작해도 그대로', () => {
    expect(csvCell('0812-1234')).toBe('"0812-1234"')
  })
})

describe('toCsv', () => {
  it('CRLF 로 줄을 나눈다', () => {
    expect(toCsv(['a', 'b'], [[1, 2], ['x', null]])).toBe('"a","b"\r\n"1","2"\r\n"x",""')
  })
})
