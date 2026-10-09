import { ref, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { signPaths, signThumbnails, SIGNED_URL_REFRESH_MS } from '@/lib/storage'
import { registerCache } from '@/lib/cacheRegistry'
import { NEWS_BOARDS, type NewsBoardKind, type NewsBoardConfig } from '@/lib/newsBoards'
import type { ChurchNewsItem } from '@/lib/index'

/*
  소식 게시판 저장소. 교회소식·선교소식이 같은 코드를 쓴다 — 버킷과 테이블만
  NEWS_BOARDS 에서 받는다. 게시판마다 모듈 싱글톤 하나(페이지 이동 시 재요청 방지).
*/
interface Store {
  items: Ref<ChurchNewsItem[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  fetchNews: () => Promise<void>
  reset: () => void
  config: NewsBoardConfig
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/** Fill in signed URLs from a path -> url map. */
function applyUrls(
  list: ChurchNewsItem[],
  urls: Record<string, string>,
  thumbs: Record<string, string>,
) {
  for (const item of list) {
    item.images = item.files.map(f => urls[f]).filter(Boolean)
    // 카드에는 축소본. 변환에 실패하면 원본으로 떨어진다.
    const first = item.files[0]
    item.thumbnail = (first && thumbs[first]) || item.images[0] || ''
  }
}

/** 카드에 실제로 보이는 첫 장만 축소 변환한다. */
function coverPaths(list: ChurchNewsItem[]) {
  return list.map(i => i.files[0]).filter(Boolean)
}

function createStore(config: NewsBoardConfig): Store {
  const { bucket, table } = config
  const items = ref<ChurchNewsItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let fetched = false
  let signedAt = 0
  let inflight: Promise<void> | null = null

  /** Cache is warm but the URLs are near expiry: re-mint only — no list(), no select(). */
  async function resign() {
    try {
      const [urls, thumbs] = await Promise.all([
        signPaths(bucket, items.value.flatMap(i => i.files)),
        signThumbnails(bucket, coverPaths(items.value)),
      ])
      applyUrls(items.value, urls, thumbs)
      items.value = [...items.value]
      signedAt = Date.now()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '이미지를 불러오지 못했습니다.'
    }
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [storageResult, contentResult] = await Promise.all([
        supabase.storage.from(bucket).list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
        supabase.from(table).select('id, title, content, date, author_id, author_name'),
      ])

      if (storageResult.error) throw storageResult.error
      if (contentResult.error) throw contentResult.error
      const data = storageResult.data
      const contentRows = contentResult.data as { id: string; title?: string; content?: string; date?: string; author_id?: string | null; author_name?: string | null }[] | null

      // 파일명 기준으로 그룹핑 (_p01, _p02 → 같은 항목)
      const groups: Record<string, string[]> = {}
      for (const file of data ?? []) {
        const base = file.name.replace(/\.[^.]+$/, '').replace(/_p\d{2}$/, '')
        if (!groups[base]) groups[base] = []
        groups[base].push(file.name)
      }

      // 각 그룹 내 페이지 정렬
      for (const base of Object.keys(groups)) {
        groups[base].sort()
      }
      const contentMap: Record<string, { title?: string; content?: string; date?: string; authorId?: string | null; authorName?: string | null }> = {}
      for (const row of contentRows ?? []) {
        contentMap[row.id] = { title: row.title, content: row.content, date: row.date, authorId: row.author_id, authorName: row.author_name }
      }

      // 이미지 없이 등록된 소식은 storage 에 파일이 없어 groups 에 안 잡힌다.
      // DB 행의 id 도 함께 훑어야 목록에서 빠지지 않는다.
      const ids = new Set([...Object.keys(groups), ...Object.keys(contentMap)])

      const result: ChurchNewsItem[] = []
      for (const id of ids) {
        const files = groups[id] ?? []
        const row = contentMap[id]
        const match = id.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/)
        // DB 행도 없고 파일명도 형식을 모르면 무슨 항목인지 알 수 없어 건너뛴다.
        if (!row && !match) continue

        result.push({
          id,
          title: row?.title ?? (match ? slugToTitle(match[2]) : '제목 없음'),
          date: row?.date ?? match?.[1] ?? '',
          files,
          thumbnail: '',
          images: [],
          content: row?.content ?? null,
          authorId: row?.authorId ?? null,
          authorName: row?.authorName ?? null,
        })
      }

      // 날짜 내림차순
      result.sort((a, b) => b.date.localeCompare(a.date))

      // 원본은 한 번의 요청으로 전부 서명(상세 보기용), 카드에 뜨는 첫 장만 축소본을 따로 만든다.
      const [urls, thumbs] = await Promise.all([
        signPaths(bucket, result.flatMap(r => r.files)),
        signThumbnails(bucket, coverPaths(result)),
      ])
      applyUrls(result, urls, thumbs)
      items.value = result
      signedAt = Date.now()
      fetched = true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  function reset() { fetched = false; signedAt = 0; items.value = [] }

  // 로그아웃 시 멤버 전용 데이터와 유효한 서명 URL이 남지 않도록
  registerCache(reset)

  async function fetchNews() {
    if (fetched && Date.now() - signedAt < SIGNED_URL_REFRESH_MS) return
    if (fetched) return resign()
    // 동시 호출이 같은 로드를 공유하도록 (fetched 는 await 이후에야 true 가 됨)
    if (inflight) return inflight
    inflight = load().finally(() => { inflight = null })
    return inflight
  }

  return { items, loading, error, fetchNews, reset, config }
}

const stores = new Map<NewsBoardKind, Store>()

export function useNewsBoard(kind: NewsBoardKind): Store {
  let store = stores.get(kind)
  if (!store) {
    store = createStore(NEWS_BOARDS[kind])
    stores.set(kind, store)
  }
  return store
}
