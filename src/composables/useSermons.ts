import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { formatPreacher } from '@/lib/index'
import type { SermonItem } from '@/lib/index'

// 홈·목록·등록 후 새로고침이 각각 따로 요청해서 한 세션에 같은 목록을 세 번 받았다.
// 여기서 한 번만 받아 공유한다.
//
// 서버 페이지네이션은 일부러 쓰지 않았다. 전체 153행이 gzip 6.7KB 라
// 페이지를 넘길 때마다 왕복을 한 번 더 도는 쪽이 느린 회선에서 오히려 손해다.
// (목회칼럼은 93KB 라 반대로 서버 페이지네이션이 맞다.)
const items = ref<SermonItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
let fetched = false
let inflight: Promise<void> | null = null

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data, error: err } = await supabase
      .from('sermons')
      .select('id, title, scripture, preacher, date, link')
      .order('id', { ascending: false })
    if (err) throw err
    // 표기는 받는 쪽에서 한 번만 맞춘다. 카드·표·상세가 각자 다듬으면 어긋난다.
    items.value = (data ?? []).map(s => ({ ...s, preacher: formatPreacher(s.preacher) }))
    fetched = true
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '설교 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

export function useSermons() {
  /** 이미 받았으면 아무 것도 하지 않는다. 동시 호출은 같은 요청을 공유한다. */
  function fetchSermons() {
    if (fetched) { loading.value = false; return Promise.resolve() }
    if (inflight) return inflight
    inflight = load().finally(() => { inflight = null })
    return inflight
  }

  /** 등록 후 - 서버가 부여한 id 를 반영하려면 다시 받아야 한다. */
  function refresh() {
    fetched = false
    return fetchSermons()
  }

  /** 목록에서 한 건만 고쳤을 때. 다시 받지 않고 캐시만 맞춘다. */
  function patch(id: number, fields: Partial<SermonItem>) {
    const idx = items.value.findIndex(s => s.id === id)
    if (idx !== -1) items.value[idx] = { ...items.value[idx], ...fields }
  }

  const recent = computed(() => items.value.slice(0, 3))

  return { items, recent, loading, error, fetchSermons, refresh, patch }
}
