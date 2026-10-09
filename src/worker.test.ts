import { describe, it, expect } from 'vitest'
import { isSpaRoute, communityRef, rewriteShareMeta } from './worker'
import { legacyRedirect } from './legacy'
import { detailRef, youtubeId, sermonMeta, columnMeta, ldScript, OG_DEFAULT } from './seoEdge'
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

describe('legacyRedirect', () => {
  const to = (u: string) => legacyRedirect(new URL(u))
  it('옛 www 주소를 새 경로로 보낸다', () => {
    expect(to('https://www.hanmaumch.id/main/main.html')).toBe('/')
    expect(to('https://www.hanmaumch.id/main/sub.html?mstrCode=2')).toBe('/worship/sunday-sermon')
    expect(to('https://www.hanmaumch.id/main/sub.html?pageCode=6')).toBe('/worship/sunday-sermon')
    expect(to('https://www.hanmaumch.id/main/sub.html?pageCode=6&num=468&page=')).toBe('/worship/sunday-sermon')
    expect(to('https://www.hanmaumch.id/main/sub.html?pageCode=7&num=1')).toBe('/worship/pastoral-column')
    expect(to('https://www.hanmaumch.id/main/sub.html?pageCode=29')).toBe('/worship/church-video')
    expect(to('https://www.hanmaumch.id/main/sub.html?pageCode=19')).toBe('/community/photos')
    expect(to('https://www.hanmaumch.id/main/sub.html?pageCode=22')).toBe('/community/bulletin')
    expect(to('https://www.hanmaumch.id/main/sub.html?pageCode=3')).toBe('/introduction/welcome')
    expect(to('https://www.hanmaumch.id/main/sub.html?pageCode=99')).toBe('/')
    expect(to('https://www.hanmaumch.id/core/anyboard/content.html?num=1')).toBe('/')
  })
  it('모바일 m. 주소', () => {
    expect(to('https://m.hanmaumch.id/core/mobile/main/subMain.html?mstrCode=3')).toBe('/education/j-angels')
    expect(to('https://m.hanmaumch.id/core/mobile/main/login.html')).toBe('/login')
    expect(to('https://m.hanmaumch.id/core/mobile/member/register.html')).toBe('/signup')
    expect(to('https://m.hanmaumch.id/')).toBe('/')
  })
  it('새 주소는 건드리지 않는다', () => {
    for (const p of ['/', '/worship/sunday-sermon', '/worship/sunday-sermon/150', '/main']) expect(to(`https://www.hanmaumch.id${p}`), p).toBeNull()
  })
})

describe('seoEdge', () => {
  it('상세 주소 판별', () => {
    expect(detailRef('/worship/sunday-sermon/150')).toEqual({ kind: 'sermon', id: '150' })
    expect(detailRef('/worship/pastoral-column/10/')).toEqual({ kind: 'column', id: '10' })
    expect(detailRef('/worship/sunday-sermon')).toBeNull()
  })
  it('유튜브 id', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=abcDEF12345')).toBe('abcDEF12345')
    expect(youtubeId('https://youtu.be/abcDEF12345')).toBe('abcDEF12345')
    expect(youtubeId('https://www.youtube.com/live/abcDEF12345')).toBe('abcDEF12345')
    expect(youtubeId(null)).toBeNull()
  })
  it('설교 메타: 유튜브 있으면 VideoObject, 없으면 Article', () => {
    const a = sermonMeta({ id: 1, title: '제목', preacher: '고형돈목사', scripture: '요 3:16', date: '2026-01-04', link: 'https://youtu.be/abcDEF12345' })
    expect(a.image).toBe('https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg')
    expect(a.description).toBe('요 3:16 · 고형돈 목사 · 2026-01-04')
    expect(a.jsonLd.map(o => (o as { '@type': string })['@type'])).toEqual(['VideoObject', 'BreadcrumbList'])
    const b = sermonMeta({ id: 2, title: '제목', summary: '요약 문장', link: null })
    expect(b.description).toBe('요약 문장')
    expect(b.image).toBe(OG_DEFAULT)
    expect((b.jsonLd[0] as { '@type': string })['@type']).toBe('Article')
  })
  it('칼럼 메타: 제목 앞 날짜 제거, 본문에서 설명', () => {
    const m = columnMeta({ id: 3, title: '2026.10.4 감사', content: '고목사의 짧은 단상 <b>본문</b> 입니다' })
    expect(m.headline).toBe('감사')
    expect(m.description).toBe('본문 입니다')
  })
  it('JSON-LD 는 </script> 로 빠져나가지 못한다', () => {
    expect(ldScript([{ a: '</script><b>' }])).not.toContain('</script><b>')
  })
})
