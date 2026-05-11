import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
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

supabase.auth.getSession().then(async ({ data }) => {
  user.value = data.session?.user ?? null
  if (user.value) await fetchProfile(user.value.id)
  loading.value = false
  resolveReady()
})

supabase.auth.onAuthStateChange(async (_event, session) => {
  user.value = session?.user ?? null
  if (user.value) await fetchProfile(user.value.id)
  else profile.value = null
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
  }

  async function signUp(email: string, password: string, fields: { name: string; gender: '남' | '여'; phone: string }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: data.user.id,
        role: 'member',
        ...fields,
      })
      if (insertError) throw insertError
      user.value = data.user
      await fetchProfile(data.user.id)
    }
  }

  async function updateProfile(fields: Partial<Omit<Profile, 'role'>>) {
    if (!user.value) throw new Error('로그인이 필요합니다.')
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.value.id, role: profile.value?.role ?? 'member', ...fields })
    if (error) throw error
    if (profile.value) {
      profile.value = { ...profile.value, ...fields }
    } else {
      profile.value = { role: 'member', ...fields } as Profile
    }
  }

  async function refreshProfile() {
    if (!user.value) return
    await fetchProfile(user.value.id)
  }

  return { user, profile, loading, isLoggedIn, isAdmin, displayName, login, logout, signUp, updateProfile, refreshProfile }
}
