import { describe, expect, it } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('Error·문자열·{message} 객체에서 메시지를 꺼낸다', () => {
    expect(errorMessage(new Error('a'))).toBe('a')
    expect(errorMessage('b')).toBe('b')
    expect(errorMessage({ message: 'c', code: '42' })).toBe('c')
  })
  it('메시지가 없으면 기본 문구', () => {
    expect(errorMessage({ message: '' }, '기본')).toBe('기본')
    expect(errorMessage(undefined)).toBe('알 수 없는 오류가 발생했습니다.')
  })
})
