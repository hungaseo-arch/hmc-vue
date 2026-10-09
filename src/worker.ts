/*
  정적 자산 앞단 Worker.

  wrangler.toml 의 not_found_handling = "single-page-application" 은 없는 경로에도
  index.html 을 200 으로 돌려준다. 라우터가 404 화면은 그리지만 상태코드가 200 이라
  검색엔진·모니터링이 정상 페이지로 본다. 여기서 알려진 SPA 경로만 200 으로
  통과시키고, 모르는 경로는 같은 index.html 을 404 상태로 돌려준다.

  경로 목록은 src/lib/index.ts 의 ROUTE_PATHS 와 같이 고친다 - worker.test.ts 가
  둘이 어긋나면 실패한다. (이 파일은 Vite 번들이 아니라 wrangler 가 따로 묶으므로
  '@/..' 별칭을 쓰지 않는다.)
*/

import { legacyRedirect } from './legacy'
import { detailRef, fetchRow, sermonMeta, columnMeta, injectDetailMeta } from './seoEdge'
import type { SermonRow, ColumnRow } from './seoEdge'

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
  2026-10 요청: 카드에 소식 제목만, 설명과 그림은 없이. 제목은 Supabase 의
  community_share_title() (T17, anon 허용, 제목 한 열만)로 받고, 못 받으면
  주소에서 알 수 있는 종류·날짜로 만든다. 본문·사진은 어떤 경우에도 넣지 않는다.
*/
const COMMUNITY_KIND: Record<string, string> = {
  news: '교회소식', 'mission-news': '선교소식', bulletin: '주보', photos: '사진앨범',
}

function koreanDate(y: string, m: string, d: string): string {
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

export interface CommunityRef { kind: string; id: string; fallbackTitle: string }

/** 주소가 교인 전용 상세면 종류·id·대체 제목을 돌려준다. */
export function communityRef(pathname: string): CommunityRef | null {
  const m = /^\/community\/(news|mission-news|bulletin|photos)\/([\w.-]+)\/?$/.exec(pathname)
  if (!m) return null
  const kind = m[1]
  const id = m[2]
  // 주보는 YYYYMMDD, 나머지는 YYYY-MM-DD_… 로 시작한다.
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(id) ?? /^(\d{4})-(\d{2})-(\d{2})_/.exec(id)
  const label = COMMUNITY_KIND[kind]
  return { kind, id, fallbackTitle: date ? `${label} ${koreanDate(date[1], date[2], date[3])}` : label }
}

const TITLE_CACHE_SEC = 600
const TITLE_TIMEOUT_MS = 2500

/** Supabase 에서 제목만 받는다. 실패·없음이면 null. 엣지 캐시 10분. */
async function fetchShareTitle(ref: CommunityRef, env: Env): Promise<string | null> {
  if (ref.kind === 'bulletin' || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null
  const cacheKey = new Request(`https://share-title.local/${ref.kind}/${encodeURIComponent(ref.id)}`)
  // caches.default 는 Workers 전용이라 DOM 타입에 없다.
  const cache = (caches as unknown as { default: Cache }).default
  const hit = await cache.match(cacheKey)
  if (hit) return (await hit.text()) || null
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/community_share_title`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kind: ref.kind, item_id: ref.id }),
      signal: AbortSignal.timeout(TITLE_TIMEOUT_MS),
    })
    if (!r.ok) return null
    const raw = (await r.text()).trim()
    // PostgREST 는 스칼라를 JSON 문자열("…") 또는 null 로 준다.
    const title = raw === 'null' || raw === '' ? '' : String(JSON.parse(raw)).trim()
    await cache.put(cacheKey, new Response(title, { headers: { 'Cache-Control': `max-age=${TITLE_CACHE_SEC}` } }))
    return title || null
  } catch {
    return null
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * index.html 의 제목 태그를 바꾸고 설명·그림 태그는 지운다(카드에 제목만 뜨게).
 * og:type·og:site_name·og:url 은 남는다.
 */
export function rewriteShareMeta(html: string, title: string): string {
  const t = escapeAttr(title)
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/[ \t]*<meta (?:name|property)="(?:description|og:description|og:image|twitter:description|twitter:image|twitter:card)" content="[^"]*" \/>\n?/g, '')
}

export function isSpaRoute(pathname: string): boolean {
  const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return EXACT.has(p) || DYNAMIC.some(r => r.test(p))
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  // 공유 카드 제목 조회용. wrangler secret 으로 넣는다(anon 키는 클라이언트에도 있는 공개 키).
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 옛 사이트 주소(www 의 /main/…, m.hanmaumch.id)는 자산을 보기 전에 301.
    const reqUrl = new URL(request.url)
    const legacy = legacyRedirect(reqUrl)
    if (legacy) return Response.redirect(`https://www.hanmaumch.id${legacy}`, 301)

    const res = await env.ASSETS.fetch(request)
    // 실제 파일(js/css/이미지/bible/sitemap 등)과 오류 응답은 그대로 둔다.
    const isHtml = res.headers.get('content-type')?.includes('text/html') ?? false
    if (res.status !== 200 || !isHtml) return res
    const pathname = new URL(request.url).pathname
    // HTML(index.html) 인데 SPA 경로가 아니면 본문·헤더는 그대로, 상태만 404.
    if (!isSpaRoute(pathname)) {
      return new Response(res.body, { status: 404, headers: res.headers })
    }
    // 설교·칼럼 상세(공개): 글 제목·설명·썸네일·JSON-LD 를 HTML 에 넣는다. 없는 글은 404.
    const dref = detailRef(pathname)
    if (dref) {
      const got = dref.kind === 'sermon' ? await fetchRow<SermonRow>(env, 'sermon', dref.id) : await fetchRow<ColumnRow>(env, 'column', dref.id)
      if (got.status === 'missing') return new Response(res.body, { status: 404, headers: res.headers })
      if (got.status === 'ok') {
        const meta = dref.kind === 'sermon' ? sermonMeta(got.row as SermonRow) : columnMeta(got.row as ColumnRow)
        const out = injectDetailMeta(res, meta)
        const headers = new Headers(out.headers)
        headers.set('Cache-Control', 'public, max-age=600, s-maxage=3600')
        return new Response(out.body, { status: 200, headers })
      }
      return res // Supabase 통신 실패: 기본 index.html 로(검색 메타만 홈 값)
    }
    // 교인 전용 상세 페이지는 미리보기 카드에 소식 제목만 보이게 바꿔 준다.
    const ref = communityRef(pathname)
    if (ref) {
      const title = (await fetchShareTitle(ref, env)) ?? ref.fallbackTitle
      const html = rewriteShareMeta(await res.text(), title)
      const headers = new Headers(res.headers)
      headers.delete('content-length')
      return new Response(html, { status: 200, headers })
    }
    return res
  },
}
