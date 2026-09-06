/**
 * 페이지별 <title> / meta / og 태그 관리.
 *
 * SPA 라 index.html 의 정적 태그는 어느 경로로 들어와도 똑같다. 크롤러 중
 * JS 를 실행하는 쪽(구글, 카카오톡 일부)은 여기서 갱신한 값을 읽고,
 * 실행하지 않는 쪽은 index.html 의 기본값을 읽는다. 그래서 index.html 에는
 * 홈 기준 값을, 여기에는 경로별 값을 둔다.
 */

// vite.config.ts 가 빌드 시 주입한다. 커스텀 도메인을 붙이면 거기만 고치면 된다.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://www.hanmaumch.id').replace(/\/$/, '')
export const SITE_NAME = '자카르타 한마음교회'
export const DEFAULT_DESCRIPTION =
  '인도네시아 자카르타 한마음교회 공식 홈페이지 - 삼위일체 하나님을 예배하고, 기도하며, 말씀을 배우고 행하는 공동체'
export const DEFAULT_IMAGE = `${SITE_URL}/logo_hmc.png`

export interface Meta {
  /** 사이트 이름은 자동으로 뒤에 붙는다. 비우면 사이트 이름만 쓴다. */
  title?: string
  description?: string
  /** 절대 URL 로 바뀐다. */
  image?: string
  /** '/worship/sunday-sermon/12' 처럼. 비우면 현재 주소. */
  path?: string
  type?: 'website' | 'article'
  /** 검색엔진에서 빼야 하는 회원 전용/인증 페이지. */
  noindex?: boolean
}

function absolute(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

function setTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function setMeta(meta: Meta = {}) {
  const title = meta.title ? `${meta.title} | ${SITE_NAME}` : `${SITE_NAME} (Jakarta Hanmaeum Church)`
  const description = meta.description || DEFAULT_DESCRIPTION
  const image = absolute(meta.image || DEFAULT_IMAGE)
  const url = absolute(meta.path || window.location.pathname)

  document.title = title
  setTag('name', 'description', description)
  setTag('property', 'og:title', title)
  setTag('property', 'og:description', description)
  setTag('property', 'og:image', image)
  setTag('property', 'og:url', url)
  setTag('property', 'og:type', meta.type || 'website')
  setTag('name', 'twitter:card', 'summary_large_image')
  setTag('name', 'twitter:title', title)
  setTag('name', 'twitter:description', description)
  setTag('name', 'twitter:image', image)
  setLink('canonical', url)

  // 회원 전용 페이지는 색인에서 뺀다. 서명 URL 이 검색에 걸리는 일도 막는다.
  const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (meta.noindex) setTag('name', 'robots', 'noindex, nofollow')
  else robots?.remove()
}
