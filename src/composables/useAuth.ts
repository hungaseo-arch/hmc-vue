import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { resetAllCaches } from '@/lib/cacheRegistry'
import { mustAffectRows } from '@/lib/db'
import type { User } from '@supabase/supabase-js'

/** 승인 절차. pending 은 가입 신청만 된 상태로 교인 자료를 보지 못한다. */
export type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected'

/** 0=공개, 1=교인, 2=민감(관리자). 자세한 정의는 T1 마이그레이션 머리말 참고. */
export type AccessLevel = 0 | 1 | 2

/** 클라이언트가 남길 수 있는 기록. 승인·반려는 서버 함수만 남긴다. */
export type AuditEvent = 'login' | 'logout' | 'view_sensitive' | 'access_denied'

export interface Profile {
  role: string
  name: string | null
  phone: string | null
  position: string | null
  gender: '남' | '여' | null
  family_head: string | null
  child1: string | null
  child2: string | null
  child3: string | null
  member_status: MemberStatus
  access_level: AccessLevel
  provider: string | null
  created_at: string | null
}

const PROFILE_COLUMNS =
  'role, name, phone, position, gender, family_head, child1, child2, child3, member_status, access_level, provider, created_at'

/** 카카오로 떠나기 전에 보던 경로. 돌아온 뒤 여기로 되돌린다. */
export const RETURN_TO_KEY = 'returnTo'

const NOTICE_KEY = 'hmc:auth-notice'

/**
 * 로그인 화면에 한 번만 띄울 안내 문구를 맡겨 둔다. 주소에 붙이지 않는 이유는
 * 새로고침이나 링크 공유로 옛 오류 문구가 되살아나지 않게 하기 위해서다.
 */
export function setAuthNotice(message: string) {
  try { sessionStorage.setItem(NOTICE_KEY, message) } catch { /* 무시 */ }
}

/** 맡겨 둔 문구를 꺼내면서 지운다. 없으면 빈 문자열. */
export function takeAuthNotice(): string {
  try {
    const m = sessionStorage.getItem(NOTICE_KEY)
    if (m) sessionStorage.removeItem(NOTICE_KEY)
    return m ?? ''
  } catch {
    return ''
  }
}

const user = ref<User | null>(null)
const profile = ref<Profile | null>(null)
const loading = ref(true)

let resolveReady!: () => void
export const authReady = new Promise<void>(r => { resolveReady = r })

/** 지금 profile 이 누구 것인지, 그리고 아직 오는 중인지. */
let profileUid: string | null = null
let profileInFlight: Promise<void> | null = null

function fetchProfile(uid: string): Promise<void> {
  // 다른 사람으로 바뀌는 중이면 앞사람 정보를 먼저 지운다. 아래에서 조회가
  // 실패해도 앞사람의 등급이 남아 있지 않게.
  if (profileUid !== uid) profile.value = null
  profileUid = uid
  const p = (async () => {
    // maybeSingle: 행이 없으면 오류가 아니라 data=null 로 온다. single() 은
    // 그 경우도 오류(PGRST116)로 돌려주기 때문에 아래에서 '통신 실패' 와
    // '가입 직후라 아직 행이 없음' 을 구분할 수 없다.
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', uid)
      .maybeSingle()
    // 그 사이 다른 사람으로 바뀌었다면 늦게 도착한 응답은 버린다.
    // 앞사람의 등급이 뒷사람에게 붙는 사고를 막는다.
    if (profileUid !== uid) return
    /*
      조회 자체가 실패한 것과 '행이 없다'는 것은 다르다. 통신이 잠깐 끊겼을 때
      null 로 덮어쓰면 등급이 0 으로 떨어지고, 승인된 교인이 승인 대기 화면으로
      밀려난다. 인도네시아 모바일 회선에서 실제로 일어날 수 있는 일이다.
      그래서 실패는 기록만 하고 마지막으로 알던 값을 그대로 둔다 — 화면만
      유지될 뿐, 실제 데이터는 RLS 가 막으므로 등급을 부풀리지 못한다.
    */
    if (error) {
      console.warn('[프로필] 조회 실패:', error.message)
      return
    }
    profile.value = (data as Profile | null) ?? null
  })()
  profileInFlight = p
  return p
}

/**
 * 라우터 가드용. 등급을 판단하기 전에 프로필이 확실히 도착해 있게 한다.
 * 로그인 직후에는 onAuthStateChange 가 프로필을 기다리지 않고 부르기 때문에,
 * 이걸 거치지 않으면 방금 로그인한 사람이 잠깐 '등급 0' 으로 보인다.
 */
export async function ensureProfile(): Promise<void> {
  const uid = user.value?.id
  if (!uid) {
    profile.value = null
    profileUid = null
    return
  }
  if (profileUid === uid) {
    if (profileInFlight) await profileInFlight
    return
  }
  await fetchProfile(uid)
}

/**
 * 접근 기록을 남긴다. 실패해도 화면 동작을 막지 않는다 — 기록이 안 남는 것보다
 * 사용자가 버튼을 못 누르게 되는 쪽이 더 나쁘다. 그래서 절대 던지지 않는다.
 *
 * user_id 는 서버(log_event)가 auth.uid() 로 정한다. 클라이언트가 남의 이름으로
 * 위조할 수 없다.
 *
 * 보통은 기다릴 필요가 없지만(void 로 버려도 된다), 로그아웃처럼 곧바로 세션이
 * 사라지는 자리에서는 await 해야 기록이 토큰과 함께 날아가지 않는다.
 */
export async function logEvent(
  type: AuditEvent,
  resource?: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_event', {
      p_event_type: type,
      p_resource: resource ?? null,
      p_detail: detail ?? null,
    })
    if (error) console.warn('[감사로그] 기록 실패:', error.message)
  } catch (e) {
    console.warn('[감사로그] 기록 실패:', e)
  }
}

/**
 * 저장된 refresh token 이 만료·폐기된 경우 getSession() 은 예외가 아니라
 * error 를 담아 돌려준다. 그대로 두면 이후 모든 요청이 같은 오류로 실패하므로
 * 로컬 토큰을 지워 깨끗한 로그아웃 상태로 되돌린다.
 */
async function clearBrokenSession() {
  user.value = null
  profile.value = null
  resetAllCaches()
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // 이미 세션이 없으면 무시
  }
}

supabase.auth.getSession().then(async ({ data, error }) => {
  if (error) {
    await clearBrokenSession()
  } else {
    user.value = data.session?.user ?? null
    if (user.value) await fetchProfile(user.value.id)
  }
  loading.value = false
  resolveReady()
}).catch(async () => {
  await clearBrokenSession()
  loading.value = false
  resolveReady()
})

supabase.auth.onAuthStateChange((event, session) => {
  const nextUser = session?.user ?? null
  const changedUser = nextUser?.id !== user.value?.id
  user.value = nextUser

  // TOKEN_REFRESHED 는 한 시간마다 같은 사용자로 발생한다. 프로필을 다시
  // 읽을 이유가 없고, 이 콜백 안에서 await 하면 auth 클라이언트가 잠긴다.
  if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return

  if (!nextUser) {
    profile.value = null
    // 멤버 전용 데이터와 아직 유효한 서명 URL 이 남지 않도록
    resetAllCaches()
    return
  }
  if (changedUser) void fetchProfile(nextUser.id)

  // 새로고침으로 세션이 복원될 때는 INITIAL_SESSION 이 온다. 그때까지
  // 로그인으로 세면 하루에도 수십 건이 쌓여 기록이 무의미해진다.
  // 이 콜백 안에서는 await 하지 않는다 — auth 클라이언트가 잠긴다.
  if (event === 'SIGNED_IN' && changedUser) void logEvent('login')
})

/**
 * App.vue 가 부른다. 구독은 이미 이 모듈이 읽히는 시점에 한 번만 등록되고
 * 앱이 살아 있는 동안 유지된다 — 라우터 가드가 App 마운트보다 먼저 도는데,
 * 그때 이미 세션 판정이 준비돼 있어야 하기 때문이다.
 * 그래서 여기서는 준비 완료만 기다린다. 여러 번 불러도 안전하다.
 */
export function init(): Promise<void> {
  return authReady
}

/*
  아래 파생값은 모듈 수준에 둔다. 라우터 가드는 컴포넌트 밖에서 돌기 때문에
  useAuth() 를 부를 수 없고, 같은 판단을 두 벌로 유지하면 반드시 어긋난다.
*/
const isLoggedIn = computed(() => !!user.value)
const isAdmin = computed(() => profile.value?.role === 'admin')
const displayName = computed(() => profile.value?.name ?? user.value?.email ?? '')

const memberStatus = computed<MemberStatus | null>(() => profile.value?.member_status ?? null)
const isApproved = computed(() => memberStatus.value === 'active')

/*
  role='admin' 도 함께 본다. DB 의 current_access_level() 과 같은 규칙이라야
  화면에서는 관리자인데 데이터는 못 읽는 어긋남이 생기지 않는다.
*/
const accessLevel = computed<AccessLevel>(() => {
  if (!isApproved.value) return 0
  const fromRole: AccessLevel = profile.value?.role === 'admin' ? 2 : 0
  const fromColumn = (profile.value?.access_level ?? 0) as AccessLevel
  return Math.max(fromRole, fromColumn) as AccessLevel
})

/** 가드용 읽기 전용 스냅숏. ensureProfile() 뒤에 불러야 정확하다. */
export function authSnapshot() {
  return {
    loggedIn: isLoggedIn.value,
    status: memberStatus.value,
    level: accessLevel.value,
  }
}

export function useAuth() {
  /**
   * 카카오 로그인 시작. 돌아올 곳은 반드시 해시 없는 루트여야 한다.
   * 지금은 히스토리 모드라 상관없지만, 해시 모드로 되돌아가면
   * `/#/경로?code=...` 가 되어 인가 코드가 해시 안에 갇히고 supabase-js 가
   * 찾지 못한다. 원래 보던 경로는 sessionStorage 로 따로 들고 간다.
   */
  async function signInWithKakao(returnTo?: string) {
    try {
      sessionStorage.setItem(RETURN_TO_KEY, returnTo ?? '/')
    } catch {
      // 저장 못 해도 로그인은 되고 홈으로 돌아갈 뿐이다.
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin + '/' },
    })

    // 원문 오류를 그대로 보여주지 않는다. 노년 사용자에게 영어 오류 문구는
    // 아무 도움이 안 되고, 다음에 무엇을 해야 할지도 알려주지 못한다.
    if (error) {
      console.warn('[카카오 로그인] 시작 실패:', error.message)
      throw new Error('카카오 로그인을 시작하지 못했습니다. 인터넷 연결을 확인하시고 다시 눌러 주세요.')
    }
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      user.value = data.user
      await fetchProfile(data.user.id)
    }
  }

  async function logout() {
    // 로그아웃 기록은 반드시 signOut 앞에서 '끝까지' 남긴다. 세션이 사라지고
    // 나면 auth.uid() 가 null 이라 log_event 가 아무것도 쓰지 않는다.
    await logEvent('logout')

    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    try {
      sessionStorage.removeItem(RETURN_TO_KEY)
    } catch {
      // 무시
    }
    // 로그인 상태에서 받은 멤버 전용 데이터와 서명 URL 을 즉시 폐기한다.
    resetAllCaches()
  }

  async function signUp(email: string, password: string, fields: { name: string; gender: '남' | '여'; phone: string }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      /*
        insert 가 아니라 upsert 다. 이제 auth.users 트리거(handle_new_user)가
        가입 즉시 프로필 행을 먼저 만들기 때문에, insert 로 보내면 기본키
        충돌(23505)로 회원가입이 통째로 실패한다.
        role·member_status·access_level 은 보내지 않는다 — 컬럼 권한이 없어
        보내도 거부되고, 보낼 수 있다면 스스로 관리자가 될 수 있다는 뜻이다.
      */
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        ...fields,
      })
      if (upsertError) throw upsertError
      user.value = data.user
      await fetchProfile(data.user.id)
    }
  }

  async function updateProfile(fields: Partial<Omit<Profile, 'role' | 'member_status' | 'access_level' | 'provider' | 'created_at'>>) {
    if (!user.value) throw new Error('로그인이 필요합니다.')
    // 등급 관련 컬럼은 보내지 않는다. 보내면 회원이 스스로 승급할 수 있다.
    const rows = await mustAffectRows(
      '프로필 저장',
      supabase
        .from('profiles')
        .upsert({ id: user.value.id, ...fields })
        .select(PROFILE_COLUMNS),
    )
    profile.value = rows[0] as Profile
  }

  async function refreshProfile() {
    if (!user.value) return
    await fetchProfile(user.value.id)
  }

  return {
    user, profile, loading,
    isLoggedIn, isAdmin, displayName,
    memberStatus, isApproved, accessLevel,
    login, logout, signUp, signInWithKakao, updateProfile, refreshProfile,
    logEvent,
  }
}
