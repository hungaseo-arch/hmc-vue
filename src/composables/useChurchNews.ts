import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ChurchNewsItem } from '@/lib/index'

// 모듈 싱글톤 — 페이지 이동 시 재요청 방지
const items = ref<ChurchNewsItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let fetched = false

function slugToTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function useChurchNews() {
  async function fetchNews() {
    if (fetched) return
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.storage
        .from('churchNews')
        .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } })

      if (err) throw err

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

      const { data: contentRows } = await supabase.from('church_news_content').select('id, title, content')
      const contentMap: Record<string, { title?: string; content?: string }> = {}
      for (const row of contentRows ?? []) contentMap[row.id] = { title: row.title, content: row.content }

      const result: ChurchNewsItem[] = []
      for (const [base, files] of Object.entries(groups)) {
        const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/)
        if (!match) continue
        const [, date, titleSlug] = match

        const imageUrls = files.map(fname => {
          const { data: urlData } = supabase.storage.from('churchNews').getPublicUrl(fname)
          return urlData.publicUrl
        })

        result.push({
          id: base,
          title: contentMap[base]?.title ?? slugToTitle(titleSlug),
          date,
          thumbnail: imageUrls[0],
          images: imageUrls,
          content: contentMap[base]?.content ?? null,
        })
      }

      // 날짜 내림차순
      result.sort((a, b) => b.date.localeCompare(a.date))
      items.value = result
      fetched = true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  function reset() { fetched = false; items.value = [] }
  return { items, loading, error, fetchNews, reset }
}
