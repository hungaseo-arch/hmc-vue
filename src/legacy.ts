/*
  옛 사이트(그누보드형 /main/sub.html?pageCode=…, 모바일 m.hanmaumch.id) 주소를
  새 주소로 보내는 규칙. 순수 함수라 worker.test.ts 에서 그대로 검증한다.

  옛 글 번호(num) ↔ 새 id 대응은 데이터(Supabase 행·이관 파일)에 남아 있지 않아
  추측으로 상세에 연결하지 않고 목록으로 보낸다(작업지시서 SEO v3, 절대 준수 5).
  대응표가 생기면 아래 LEGACY_NUM 만 채우면 된다.
*/

export const LEGACY_NUM: { sermon: Record<string, number>; column: Record<string, number> } = {
  sermon: {},
  column: {},
}

const BY_MSTR: Record<string, string> = {
  '1': '/',
  '2': '/worship/sunday-sermon',
  '3': '/education/j-angels',
  '4': '/community/news',
  '5': '/',
}

/** 옛 주소면 새 경로(도메인 제외)를, 아니면 null. */
export function legacyRedirect(url: URL): string | null {
  const host = url.hostname
  const p = url.pathname
  const q = url.searchParams

  if (host === 'm.hanmaumch.id') {
    if (/login\.html$/.test(p)) return '/login'
    if (/register\.html$/.test(p)) return '/signup'
    if (/subMain\.html$/.test(p)) return BY_MSTR[q.get('mstrCode') ?? ''] ?? '/'
    return '/'
  }

  if (p === '/main/main.html') return '/'
  if (p === '/main/sub.html') {
    const mstr = q.get('mstrCode')
    if (mstr) return BY_MSTR[mstr] ?? '/'
    const pc = q.get('pageCode')
    const num = q.get('num')
    if (pc === '6') return num && LEGACY_NUM.sermon[num] ? `/worship/sunday-sermon/${LEGACY_NUM.sermon[num]}` : '/worship/sunday-sermon'
    if (pc === '7') return num && LEGACY_NUM.column[num] ? `/worship/pastoral-column/${LEGACY_NUM.column[num]}` : '/worship/pastoral-column'
    if (pc === '29') return '/worship/church-video'
    if (pc === '19') return '/community/photos'
    if (pc === '22') return '/community/bulletin'
    if (pc === '3' || pc === '11') return '/introduction/welcome'
    return '/'
  }
  if (/^\/(main|core)\//.test(p)) return '/'
  return null
}
