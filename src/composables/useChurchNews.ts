import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { signPaths, signThumbnails, SIGNED_URL_REFRESH_MS } from '@/lib/storage'
import { registerCache } from '@/lib/cacheRegistry'
import type { ChurchNewsItem } from '@/lib/index'

// 모듈 싱글톤 — 페이지 이동 시 재요청 방지
const items = ref<ChurchNewsItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false
let signedAt = 0
let inflight: Promise<void> | null = null

const BUCKET = 'churchNews'

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

/** Cache is warm but the URLs are near expiry: re-mint only — no list(), no select(). */
async function resign() {
  try {
    const [urls, thumbs] = await Promise.all([
      signPaths(BUCKET, items.value.flatMap(i => i.files)),
      signThumbnails(BUCKET, coverPaths(items.value)),
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
      supabase.storage.from(BUCKET).list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } }),
      supabase.from('church_news_content').select('id, title, content'),
    ])

    if (storageResult.error) throw storageResult.error
    const data = storageResult.data
    const contentRows = contentResult.data

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
    const contentMap: Record<string, { title?: string; content?: string }> = {}
    for (const row of contentRows ?? []) contentMap[row.id] = { title: row.title, content: row.content }

    const result: ChurchNewsItem[] = []
    for (const [base, files] of Object.entries(groups)) {
      const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/)
      if (!match) continue
      const [, date, titleSlug] = match

      result.push({
        id: base,
        title: contentMap[base]?.title ?? slugToTitle(titleSlug),
        date,
        files,
        thumbnail: '',
        images: [],
        content: contentMap[base]?.content ?? null,
      })
    }

    // 날짜 내림차순
    result.sort((a, b) => b.date.localeCompare(a.date))

    // 원본은 한 번의 요청으로 전부 서명(상세 보기용), 카드에 뜨는 첫 장만 축소본을 따로 만든다.
    const [urls, thumbs] = await Promise.all([
      signPaths(BUCKET, result.flatMap(r => r.files)),
      signThumbnails(BUCKET, coverPaths(result)),
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

export function useChurchNews() {
  async function fetchNews() {
    if (fetched && Date.now() - signedAt < SIGNED_URL_REFRESH_MS) return
    if (fetched) return resign()
    // 동시 호출이 같은 로드를 공유하도록 (fetched 는 await 이후에야 true 가 됨)
    if (inflight) return inflight
    inflight = load().finally(() => { inflight = null })
    return inflight
  }

  return { items, loading, error, fetchNews, reset }
}
