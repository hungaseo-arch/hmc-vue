import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { resetAllCaches } from '@/lib/cacheRegistry'
import { mustAffectRows } from '@/lib/db'
import type { User } from '@supabase/supabase-js'

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
}

const user = ref<User | null>(null)
const profile = ref<Profile | null>(null)
const loading = ref(true)

let resolveReady!: () => void
export const authReady = new Promise<void>(r => { resolveReady = r })

async function fetchProfile(uid: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role, name, phone, position, gender, family_head, child1, child2, child3')
    .eq('id', uid)
    .single()
  profile.value = data ?? null
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
})

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const displayName = computed(() => profile.value?.name ?? user.value?.email ?? '')

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      user.value = data.user
      await fetchProfile(data.user.id)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    // 로그인 상태에서 받은 멤버 전용 데이터와 서명 URL 을 즉시 폐기한다.
    resetAllCaches()
  }

  async function signUp(email: string, password: string, fields: { name: string; gender: '남' | '여'; phone: string }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      // role 은 보내지 않는다 — 컬럼 기본값('member')이 채우고,
      // 클라이언트에는 쓰기 권한이 없다.
      const { error: insertError } = await supabase.from('profiles').insert({
        id: data.user.id,
        ...fields,
      })
      if (insertError) throw insertError
      user.value = data.user
      await fetchProfile(data.user.id)
    }
  }

  async function updateProfile(fields: Partial<Omit<Profile, 'role'>>) {
    if (!user.value) throw new Error('로그인이 필요합니다.')
    // role 은 보내지 않는다. 보내면 회원이 스스로 admin 으로 올릴 수 있다.
    const rows = await mustAffectRows(
      '프로필 저장',
      supabase
        .from('profiles')
        .upsert({ id: user.value.id, ...fields })
        .select('role, name, phone, position, gender, family_head, child1, child2, child3'),
    )
    profile.value = rows[0] as Profile
  }

  async function refreshProfile() {
    if (!user.value) return
    await fetchProfile(user.value.id)
  }

  return { user, profile, loading, isLoggedIn, isAdmin, displayName, login, logout, signUp, updateProfile, refreshProfile }
}
