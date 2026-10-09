/*
  설교·목회칼럼 상세의 검색·공유용 메타를 엣지에서 HTML 에 직접 넣는다.

  SPA 라 모든 주소가 같은 index.html 을 받아, JS 를 실행하지 않는 크롤러·메신저는
  어느 글이든 홈 메타만 본다. Worker 가 Supabase(anon)에서 한 건을 읽어 title·
  description·canonical·og·JSON-LD 를 치환한다. 클라이언트 setMeta() 는 그대로 두어
  SPA 내비게이션에서도 같은 값으로 갱신된다.

  이 파일은 wrangler 가 따로 묶으므로 '@/..' 별칭을 쓰지 않는다.
*/
import { formatPreacher } from './lib/index'

export const SITE = 'https://www.hanmaumch.id'
export const SITE_NAME = '자카르타 한마음교회'
export const OG_DEFAULT = `${SITE}/og-default.jpg`
const LOGO = `${SITE}/logo_hmc.png`

export type DetailKind = 'sermon' | 'column'
export interface DetailRef { kind: DetailKind; id: string }

/** 설교·칼럼 상세 주소면 종류와 id 를, 아니면 null. */
export function detailRef(pathname: string): DetailRef | null {
  const m = /^\/worship\/(sunday-sermon|pastoral-column)\/(\d+)\/?$/.exec(pathname)
  if (!m) return null
  return { kind: m[1] === 'sunday-sermon' ? 'sermon' : 'column', id: m[2] }
}

export interface SermonRow { id: number; title: string; preacher?: string | null; scripture?: string | null; date?: string | null; link?: string | null; summary?: string | null }
export interface ColumnRow { id: number; title: string; excerpt?: string | null; content?: string | null; created_at?: string | null }

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** SermonDetailPage.vue 의 embedUrl 과 같은 규칙: watch?v=, youtu.be/, /live/. */
export function youtubeId(link: string | null | undefined): string | null {
  if (!link) return null
  try {
    const u = new URL(link)
    let id = ''
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1)
    else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? ''
    return /^[\w-]{6,}$/.test(id) ? id : null
  } catch {
    return null
  }
}

/** PastoralColumnDetailPage.vue 의 cleanTitle/cleanContent 와 같은 규칙. */
export function cleanColumnTitle(title: string): string {
  return title.replace(/^\d{4}\.\d{1,2}\.?\s*\d{1,2}\.?\s*/, '').trim()
}
function cleanColumnContent(html: string | null | undefined): string {
  return (html ?? '').replace(/고목사의 짧은 단상\s*/g, '').trim()
}

export interface DetailMeta {
  title: string
  description: string
  canonical: string
  image: string
  headline: string
  jsonLd: object[]
}

function breadcrumb(sectionName: string, sectionPath: string, title: string, canonical: string) {
  const items = [['홈', '/'], ['예배와기도', '/worship/sunday-sermon'], [sectionName, sectionPath]] as const
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      ...items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${path === '/' ? '/' : path}` })),
      { '@type': 'ListItem', position: items.length + 1, name: title, item: canonical },
    ],
  }
}

const publisher = { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: LOGO } }

export function sermonMeta(row: SermonRow): DetailMeta {
  const preacher = formatPreacher(row.preacher)
  const canonical = `${SITE}/worship/sunday-sermon/${row.id}`
  const description = row.summary?.trim() || [row.scripture, preacher, row.date].filter(Boolean).join(' · ')
  const yt = youtubeId(row.link)
  const image = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : OG_DEFAULT
  const main = yt
    ? {
        '@context': 'https://schema.org', '@type': 'VideoObject', name: row.title, description: description || row.title,
        thumbnailUrl: [image], ...(row.date ? { uploadDate: row.date } : {}),
        embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`, publisher,
      }
    : {
        '@context': 'https://schema.org', '@type': 'Article', headline: row.title, description: description || row.title,
        ...(row.date ? { datePublished: row.date } : {}),
        ...(preacher ? { author: { '@type': 'Person', name: preacher } } : {}),
        image: [image], publisher, mainEntityOfPage: canonical,
      }
  return {
    title: `${row.title} | ${SITE_NAME}`, description, canonical, image, headline: row.title,
    jsonLd: [main, breadcrumb('주일설교', '/worship/sunday-sermon', row.title, canonical)],
  }
}

export function columnMeta(row: ColumnRow): DetailMeta {
  const title = cleanColumnTitle(row.title)
  const canonical = `${SITE}/worship/pastoral-column/${row.id}`
  const body = cleanColumnContent(row.content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  const description = (row.excerpt?.trim() || body).slice(0, 160).trim()
  return {
    title: `${title} | ${SITE_NAME}`, description, canonical, image: OG_DEFAULT, headline: title,
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'Article', headline: title, description: description || title,
        ...(row.created_at ? { datePublished: row.created_at } : {}),
        author: { '@type': 'Person', name: '고형돈 목사' },
        image: [OG_DEFAULT], publisher, mainEntityOfPage: canonical,
      },
      breadcrumb('목회칼럼', '/worship/pastoral-column', title, canonical),
    ],
  }
}

/** <script> 안에서 </script> 로 빠져나가지 못하게 < 를 이스케이프한다. */
export function ldScript(objs: object[]): string {
  return objs.map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('')
}

/** index.html 응답의 head 를 상세 메타로 치환한다. */
export function injectDetailMeta(res: Response, meta: DetailMeta): Response {
  const attr = (a: string, v: string) => ({ element(e: HTMLRewriterElement) { e.setAttribute(a, v) } })
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(meta.title) } })
    .on('meta[name="description"]', attr('content', meta.description))
    .on('link[rel="canonical"]', attr('href', meta.canonical))
    .on('meta[property="og:title"]', attr('content', meta.title))
    .on('meta[property="og:description"]', attr('content', meta.description))
    .on('meta[property="og:url"]', attr('content', meta.canonical))
    .on('meta[property="og:image"]', attr('content', meta.image))
    .on('meta[property="og:type"]', attr('content', 'article'))
    .on('meta[name="twitter:title"]', attr('content', meta.title))
    .on('meta[name="twitter:description"]', attr('content', meta.description))
    .on('meta[name="twitter:image"]', attr('content', meta.image))
    .on('head', { element(e) { e.append(ldScript(meta.jsonLd), { html: true }) } })
    .on('#app', { element(e) { e.before(`<div id="ssr-seo" hidden><h1>${esc(meta.headline)}</h1><p>${esc(meta.description)}</p></div>`, { html: true }) } })
    .transform(res)
}

export type Fetched<T> = { status: 'ok'; row: T } | { status: 'missing' } | { status: 'error' }

/** Supabase REST(anon)에서 한 건. 없으면 missing, 통신 실패는 error 로 구분한다. */
export async function fetchRow<T>(env: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string }, kind: DetailKind, id: string): Promise<Fetched<T>> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return { status: 'error' }
  const table = kind === 'sermon' ? 'sermons' : 'pastorColumn'
  try {
    // select=* : 설교 summary 컬럼(T16)이 아직 없는 DB 에서도 오류 없이 동작한다.
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(2500),
      cf: { cacheTtl: 300, cacheEverything: true },
    } as RequestInit)
    if (!r.ok) return { status: 'error' }
    const rows = (await r.json()) as T[]
    return rows.length ? { status: 'ok', row: rows[0] } : { status: 'missing' }
  } catch {
    return { status: 'error' }
  }
}
