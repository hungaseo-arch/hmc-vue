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
  /^\/community\/(news|photos|bulletin)\/[\w.-]+$/,
  /^\/admin\/(news|photos|bulletin|mission-news)(\/[\w.-]+)?$/,
]

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
    // HTML(index.html) 인데 SPA 경로가 아니면 본문·헤더는 그대로, 상태만 404.
    if (!isSpaRoute(new URL(request.url).pathname)) {
      return new Response(res.body, { status: 404, headers: res.headers })
    }
    return res
  },
}
