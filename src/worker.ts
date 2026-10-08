/*
  정적 자산 앞단 Worker.

  wrangler.toml 의 not_found_handling = "single-page-application" 은 없는 경로에도
  index.html 을 200 으로 돌려준다. 라우터가 404 화면은 그리지만 상태코드가 200 이라
  검색엔진·모니터링이 정상 페이지로 본다. 여기서 알려진 SPA 경로만 200 으로
  통과시키고, 모르는 경로는 같은 index.html 을 404 상태로 돌려준다.

  경로 목록은 src/lib/index.ts 의 ROUTE_PATHS 와 같이 고친다 — worker.test.ts 가
  둘이 어긋나면 실패한다. (이 파일은 Vite 번들이 아니라 wrangler 가 따로 묶으므로
  '@/..' 별칭을 쓰지 않는다.)
*/

// 정확히 일치해야 하는 경로
const EXACT = new Set<string>([
  '/', '/login', '/signup', '/profile', '/pending', '/no-access',
  '/introduction/welcome', '/introduction/greeting', '/introduction/history',
  '/introduction/staff', '/introduction/worship-guide', '/introduction/directions',
  '/worship/sunday-sermon', '/worship/pastoral-column', '/worship/church-video',
  '/education/j-angels', '/education/j-kids', '/education/ja-yu', '/education/youth', '/education/adult',
  '/community/news', '/community/photos', '/community/bulletin', '/community/mission-news',
  '/admin/members', '/admin/audit-log',
])

// id 가 붙는 경로. 설교·칼럼은 숫자 id, 소식·사진·주보는 '2025-11-16_617' 같은 슬러그.
// /admin/* 는 라우터가 /community/* 로 넘기는 옛 주소라 함께 통과시킨다.
const DYNAMIC: RegExp[] = [
  /^\/worship\/sunday-sermon\/\d+$/,
  /^\/worship\/pastoral-column\/\d+$/,
  /^\/community\/(news|photos|bulletin|mission-news)\/[\w.-]+$/,
  /^\/admin\/(news|photos|bulletin|mission-news)(\/[\w.-]+)?$/,
]

/*
  교인 전용 상세 페이지(소식·선교소식·주보·사진첩)의 미리보기 카드.

  카카오톡·WhatsApp 은 링크의 HTML 에 적힌 og 태그로 카드를 만드는데, SPA 라 모든
  주소가 같은 index.html 을 주니 어느 소식을 보내도 "자카르타 한마음교회"로만 뜬다.
  내용(제목·본문·사진)은 승인 교인만 보는 자료라 로그인 없는 크롤러에게 줄 수 없다.
  그래서 주소만 보고 알 수 있는 것 — 종류와 날짜 — 로 제목을 만든다.
*/
const COMMUNITY_KIND: Record<string, string> = {
  news: '교회소식', 'mission-news': '선교소식', bulletin: '주보', photos: '사진앨범',
}

function koreanDate(y: string, m: string, d: string): string {
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

export function communityMeta(pathname: string): { title: string; description: string } | null {
  const m = /^\/community\/(news|mission-news|bulletin|photos)\/([\w.-]+)\/?$/.exec(pathname)
  if (!m) return null
  const kind = COMMUNITY_KIND[m[1]]
  const id = m[2]
  // 주보는 YYYYMMDD, 나머지는 YYYY-MM-DD_… 로 시작한다.
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(id) ?? /^(\d{4})-(\d{2})-(\d{2})_/.exec(id)
  const title = date ? `${kind} ${koreanDate(date[1], date[2], date[3])}` : kind
  return {
    title: `${title} | 자카르타 한마음교회`,
    description: `자카르타 한마음교회 교인 전용 ${kind}입니다. 로그인(승인 교인) 후 볼 수 있습니다.`,
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** index.html 의 제목·설명 태그만 바꿔 돌려준다. og:image(로고)는 그대로. */
function rewriteMeta(html: string, meta: { title: string; description: string }): string {
  const t = escapeAttr(meta.title)
  const d = escapeAttr(meta.description)
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
}

export function isSpaRoute(pathname: string): boolean {
  const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return EXACT.has(p) || DYNAMIC.some(r => r.test(p))
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const res = await env.ASSETS.fetch(request)
    // 실제 파일(js/css/이미지/bible/sitemap 등)과 오류 응답은 그대로 둔다.
    const isHtml = res.headers.get('content-type')?.includes('text/html') ?? false
    if (res.status !== 200 || !isHtml) return res
    const pathname = new URL(request.url).pathname
    // HTML(index.html) 인데 SPA 경로가 아니면 본문·헤더는 그대로, 상태만 404.
    if (!isSpaRoute(pathname)) {
      return new Response(res.body, { status: 404, headers: res.headers })
    }
    // 교인 전용 상세 페이지는 미리보기 카드용 제목·설명을 바꿔 준다.
    const meta = communityMeta(pathname)
    if (meta) {
      const html = rewriteMeta(await res.text(), meta)
      const headers = new Headers(res.headers)
      headers.delete('content-length')
      return new Response(html, { status: 200, headers })
    }
    return res
  },
}
