import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { PastoralColumnListItem } from '@/lib/index'

// 목록은 본문(content) 대신 DB 가 만들어 둔 발췌(excerpt)만 받는다.
// 전체를 받으면 134행 기준 gzip 93KB, 한 페이지만 받으면 2.6KB.
const LIST_COLUMNS = 'id, title, created_at, excerpt'
export const PAGE_SIZE = 10

// 모듈 싱글톤 - 목록으로 돌아올 때 같은 페이지를 다시 받지 않는다.
const pageCache = new Map<number, PastoralColumnListItem[]>()
const items = ref<PastoralColumnListItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
let inflight: Promise<void> | null = null
let inflightPage = 0

async function load(page: number) {
  loading.value = true
  error.value = null
  try {
    const from = (page - 1) * PAGE_SIZE
    const { data, count, error: err } = await supabase
      .from('pastorColumn')
      .select(LIST_COLUMNS, { count: 'exact' })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (err) throw err

    const rows = (data ?? []) as PastoralColumnListItem[]
    pageCache.set(page, rows)
    items.value = rows
    if (typeof count === 'number') total.value = count
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '칼럼을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

export function usePastoralColumns() {
  async function fetchPage(page: number) {
    const cached = pageCache.get(page)
    if (cached) { items.value = cached; return }
    // 같은 페이지를 동시에 요청하면 하나만 보낸다.
    if (inflight && inflightPage === page) return inflight
    inflightPage = page
    inflight = load(page).finally(() => { inflight = null })
    return inflight
  }

  /** 등록·수정 후 - 캐시를 버리고 현재 페이지를 다시 받는다. */
  async function invalidate(page: number) {
    pageCache.clear()
    await fetchPage(page)
  }

  /** 수정 모달용. 목록에는 발췌만 있으므로 본문은 그때 가져온다. */
  async function fetchContent(id: number): Promise<string> {
    const { data, error: err } = await supabase
      .from('pastorColumn').select('content').eq('id', id).single()
    if (err) throw err
    return data?.content ?? ''
  }

  return { items, total, loading, error, fetchPage, invalidate, fetchContent }
}
