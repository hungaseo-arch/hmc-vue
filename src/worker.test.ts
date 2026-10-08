import { describe, it, expect } from 'vitest'
import { isSpaRoute } from './worker'
import { ROUTE_PATHS } from './lib/index'

describe('worker isSpaRoute', () => {
  it('ROUTE_PATHS 의 모든 경로를 통과시킨다', () => {
    for (const path of Object.values(ROUTE_PATHS)) {
      // ':id' 는 설교·칼럼이 숫자, 소식·사진·주보가 '2025-11-16_617' 같은 슬러그다.
      const id = path.startsWith('/community/') ? '2025-11-16_617' : '12'
      const samples = path.includes(':id') ? [path.replace(':id', id)] : [path]
      for (const s of samples) expect(isSpaRoute(s), s).toBe(true)
    }
  })

  it('옛 /admin/* 주소와 끝 슬래시를 허용한다', () => {
    expect(isSpaRoute('/admin/news')).toBe(true)
    expect(isSpaRoute('/admin/photos/2025-11-16_617')).toBe(true)
    expect(isSpaRoute('/worship/sunday-sermon/')).toBe(true)
  })

  it('모르는 경로는 거부한다', () => {
    for (const p of ['/zzz-not-exist', '/worship/sunday-sermon/abc', '/education', '/community', '/admin', '/index.html', '/worship/sunday-sermon/1/x']) {
      expect(isSpaRoute(p), p).toBe(false)
    }
  })
})
