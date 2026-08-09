/*
  로그인 토큰을 어디에 둘지 고르는 저장소.

  "이 기기는 제 것입니다"를 켜면 localStorage 에 둬서 브라우저를 닫아도
  로그인이 유지된다. 끄면 sessionStorage 로 옮겨서 브라우저를 닫는 순간
  사라진다. 공용 컴퓨터나 교회 사무실 PC 를 쓰는 경우를 위한 것이다.

  supabase-js 의 storage 옵션은 createClient 시점에 한 번 정해지고 나중에
  바꿀 수 없다. 그래서 고정된 저장소를 넘기는 대신, 호출될 때마다 지금
  어느 쪽을 써야 하는지 보고 넘겨주는 껍데기를 만든다.
*/

const REMEMBER_KEY = 'hmc:remember-me'

/** supabase-js 가 쓰는 키는 전부 이 접두사로 시작한다 (토큰, PKCE 검증값). */
const SB_PREFIX = 'sb-'

/** 기본값은 켜짐. 노년 사용자에게 매번 로그인을 시키지 않는 것이 우선이다. */
export function isRemembering(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== 'false'
  } catch {
    // 사생활 보호 모드 등으로 localStorage 를 못 쓰면 세션 저장소만 쓴다.
    return false
  }
}

function activeStore(): Storage {
  return isRemembering() ? localStorage : sessionStorage
}

function idleStore(): Storage {
  return isRemembering() ? sessionStorage : localStorage
}

/** 한쪽에 남아 있는 토큰을 다른 쪽으로 옮긴다. 원본은 지운다. */
function moveTokens(from: Storage, to: Storage) {
  const keys: string[] = []
  for (let i = 0; i < from.length; i++) {
    const k = from.key(i)
    if (k && k.startsWith(SB_PREFIX)) keys.push(k)
  }
  for (const k of keys) {
    const v = from.getItem(k)
    if (v !== null) to.setItem(k, v)
    from.removeItem(k)
  }
}

/**
 * 자동 로그인 켜기/끄기. 이미 로그인한 상태에서 바꿔도 토큰을 옮겨 주므로
 * 로그아웃되지 않는다. 끄면 localStorage 에서 토큰이 사라지므로 브라우저를
 * 닫는 순간 로그인도 끝난다.
 */
export function setRememberMe(next: boolean) {
  if (next === isRemembering()) return
  try {
    localStorage.setItem(REMEMBER_KEY, next ? 'true' : 'false')
    // 플래그를 먼저 바꿔야 activeStore()/idleStore() 가 새 기준으로 답한다.
    moveTokens(idleStore(), activeStore())
  } catch {
    // 저장소를 못 쓰는 환경이면 이번 세션에만 로그인이 유지된다.
  }
}

export const authStorage = {
  getItem(key: string): string | null {
    try {
      return activeStore().getItem(key)
    } catch {
      return null
    }
  },
  setItem(key: string, value: string) {
    try {
      activeStore().setItem(key, value)
    } catch {
      // 용량 초과·차단. 로그인이 이번 탭에서만 안 될 뿐 화면은 살아 있다.
    }
  },
  removeItem(key: string) {
    // 로그아웃할 때는 양쪽 다 지운다. 한쪽에 남으면 다음 방문에 되살아난다.
    try { localStorage.removeItem(key) } catch { /* 무시 */ }
    try { sessionStorage.removeItem(key) } catch { /* 무시 */ }
  },
}
