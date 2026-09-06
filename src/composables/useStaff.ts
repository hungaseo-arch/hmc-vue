import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { registerCache } from '@/lib/cacheRegistry'

export interface StaffMember {
  id: number
  name: string
  role: string
  image: string | null
  phone?: string | null
  email?: string | null
}

// 모듈 싱글톤 — 페이지 이동 시 재요청 방지. staff 는 누구나 보지만 연락처는
// 승인 교인만 봐서, 로그인/승인 상태가 바뀌면 연락처 포함 여부도 다시 맞춰야 한다.
const items = ref<StaffMember[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
let fetched = false
let fetchedWithContacts = false
let inflight: Promise<void> | null = null
let inflightApproved = false

async function load(isApproved: boolean) {
  loading.value = true
  error.value = null
  try {
    const { data, error: err } = await supabase
      .from('staff')
      .select('id, name, role, image')
      .order('sort_order', { ascending: true })
    if (err) throw err

    const contacts: Record<number, { phone: string | null; email: string | null }> = {}
    if (isApproved) {
      const { data: rows, error: cErr } = await supabase
        .from('staff_contacts')
        .select('staff_id, phone, email')
      if (cErr) throw cErr
      for (const row of rows ?? []) contacts[row.staff_id] = row
    }

    items.value = (data ?? []).map(s => ({ ...s, ...contacts[s.id] }))
    fetched = true
    fetchedWithContacts = isApproved
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '섬기는 사람들을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function reset() { fetched = false; fetchedWithContacts = false; items.value = [] }
registerCache(reset)

export function useStaff() {
  function fetchStaff(isApproved: boolean) {
    if (fetched && fetchedWithContacts === isApproved) { loading.value = false; return Promise.resolve() }
    /*
      들어오는 중인 요청이 있어도 승인 상태가 다르면 기다렸다 다시 부른다.
      화면을 연 직후 인증 판정이 끝나면서 false → true 로 바뀌는 일이 흔한데,
      그때 앞선 요청을 그대로 돌려주면 연락처가 영영 채워지지 않는다.
    */
    if (inflight && inflightApproved === isApproved) return inflight
    const prev = inflight ?? Promise.resolve()
    inflightApproved = isApproved
    inflight = prev
      .then(() => (inflightApproved === isApproved ? load(isApproved) : undefined))
      .finally(() => { if (inflightApproved === isApproved) inflight = null })
    return inflight
  }

  return { items, loading, error, fetchStaff }
}
