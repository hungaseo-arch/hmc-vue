import { describe, it, expect } from 'vitest'
import { isSpaRoute, communityMeta } from './worker'
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

describe('worker communityMeta', () => {
  it('교인 전용 상세 주소에서 종류·날짜만으로 제목을 만든다', () => {
    expect(communityMeta('/community/bulletin/20260906')?.title).toBe('주보 2026년 9월 6일 | 자카르타 한마음교회')
    expect(communityMeta('/community/news/2024-09-01_999-prayer')?.title).toBe('교회소식 2024년 9월 1일 | 자카르타 한마음교회')
    expect(communityMeta('/community/mission-news/2024-06-23_001')?.title).toBe('선교소식 2024년 6월 23일 | 자카르타 한마음교회')
    expect(communityMeta('/community/photos/2025-11-16_617/')?.title).toBe('사진앨범 2025년 11월 16일 | 자카르타 한마음교회')
  })

  it('목록·다른 경로에는 손대지 않는다', () => {
    for (const p of ['/community/news', '/community/bulletin', '/worship/sunday-sermon/12', '/', '/community/news/a/b']) {
      expect(communityMeta(p), p).toBeNull()
    }
  })

  it('제목·본문 같은 교인 전용 내용은 넣지 않는다', () => {
    const m = communityMeta('/community/news/2024-09-01_999-prayer')!
    expect(m.title).not.toContain('prayer')
    expect(m.description).toContain('로그인')
  })
})
