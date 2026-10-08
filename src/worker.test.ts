import { describe, it, expect } from 'vitest'
import { isSpaRoute, communityRef, rewriteShareMeta } from './worker'
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

describe('worker communityRef', () => {
  it('교인 전용 상세 주소에서 종류·id·대체 제목을 뽑는다', () => {
    expect(communityRef('/community/bulletin/20260906')).toEqual({ kind: 'bulletin', id: '20260906', fallbackTitle: '주보 2026년 9월 6일' })
    expect(communityRef('/community/news/2024-09-01_999-prayer')?.fallbackTitle).toBe('교회소식 2024년 9월 1일')
    expect(communityRef('/community/mission-news/2024-06-23_001')?.id).toBe('2024-06-23_001')
    expect(communityRef('/community/photos/2025-11-16_617/')?.kind).toBe('photos')
  })

  it('목록·다른 경로에는 손대지 않는다', () => {
    for (const p of ['/community/news', '/community/bulletin', '/worship/sunday-sermon/12', '/', '/community/news/a/b']) {
      expect(communityRef(p), p).toBeNull()
    }
  })
})

describe('worker rewriteShareMeta', () => {
  const html = `<head>
    <title>자카르타 한마음교회</title>
    <meta name="description" content="설명" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="자카르타 한마음교회" />
    <meta property="og:description" content="설명" />
    <meta property="og:image" content="https://x/logo.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="자카르타 한마음교회" />
    <meta name="twitter:description" content="설명" />
    <meta name="twitter:image" content="https://x/logo.png" />
  </head>`

  it('제목만 바꾸고 설명·그림 태그는 지운다', () => {
    const out = rewriteShareMeta(html, '추수감사절 "안내" & 초대')
    expect(out).toContain('<title>추수감사절 &quot;안내&quot; &amp; 초대</title>')
    expect(out).toContain('og:title" content="추수감사절 &quot;안내&quot; &amp; 초대"')
    expect(out).toContain('og:type')
    for (const gone of ['og:description', 'og:image', 'twitter:description', 'twitter:image', 'twitter:card', 'name="description"']) {
      expect(out, gone).not.toContain(gone)
    }
  })
})
