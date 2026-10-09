<template>
  <TheLayout>
    <PageHeader as="p" title="주일설교" subtitle="말씀으로 양육 받는 한마음교회 성도들" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">

        <!-- 뒤로가기 -->
        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          @click="goBack()"
        >
          <ChevronLeft class="w-4 h-4" />
          설교 목록으로
        </button>

        <!-- 로딩 / 에러 -->
        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-20 text-red-500">{{ error }}</div>

        <!-- 상세 카드 -->
        <div v-else-if="sermon" class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">

          <!-- 상단 헤더 영역 -->
          <div class="bg-muted/40 px-8 py-8 border-b border-border">
            <div class="flex items-center gap-2 text-primary text-sm font-medium mb-3">
              <BookOpen class="w-4 h-4" />
              주일설교
            </div>
            <h1 class="text-2xl md:text-3xl font-bold leading-snug mb-4">
              {{ sermon.title }}
            </h1>
            <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span class="flex items-center gap-1.5">
                <User class="w-4 h-4" />
                {{ sermon.preacher }}
              </span>
              <span class="flex items-center gap-1.5">
                <BookMarked class="w-4 h-4" />
                {{ sermon.scripture }}
              </span>
              <span class="flex items-center gap-1.5">
                <Calendar class="w-4 h-4" />
                {{ sermon.date }}
              </span>
            </div>
          </div>

          <!-- 본문 영역 -->
          <div class="px-8 py-10">

            <!-- 유튜브 임베드 -->
            <div v-if="embedUrl">
              <div class="relative w-full" style="padding-bottom: 56.25%">
                <iframe
                  :src="embedUrl"
                  class="absolute inset-0 w-full h-full rounded-xl"
                  loading="lazy"
                  referrerpolicy="strict-origin-when-cross-origin"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                  title="설교 영상"
                />
              </div>
            </div>

            <!-- 유튜브 링크 없을 때 -->
            <div v-else class="text-center py-10 text-muted-foreground">
              <PlayCircle class="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p class="text-sm">아직 영상이 등록되지 않았습니다.</p>
            </div>

            <!-- 성경 본문 구절 -->
            <div v-if="bibleVerses.length > 0" class="mt-10 pt-8 border-t border-border">
              <div class="flex items-center gap-2 text-primary font-semibold mb-5">
                <BookOpen class="w-5 h-5" />
                <span>{{ sermon.scripture }}</span>
              </div>
              <div class="bg-muted/40 rounded-xl px-6 py-5 space-y-3">
                <p
                  v-for="verse in bibleVerses"
                  :key="verse.key"
                  class="text-sm leading-relaxed"
                >
                  <!--
                    절 번호와 본문 사이의 공백은 여백(margin)이 아니라 진짜
                    공백 문자여야 한다. 여백만 주면 눈에는 떨어져 보여도
                    복사하거나 화면낭독기로 들으면 '행13:2주를' 로 붙는다.
                    Vue 는 줄바꿈만 있는 공백을 지우므로 {{ ' ' }} 로 남긴다.
                  -->
                  <span class="text-xs font-semibold text-primary mr-1">{{ verse.key }}</span>{{ ' ' }}<span class="text-foreground/80">{{ verse.text }}</span>
                </p>
              </div>
            </div>

          </div><!-- /본문 영역 -->
        </div><!-- /상세 카드 -->

        <!-- 관련 설교: 같은 본문(책)·같은 설교자의 다른 설교. 크롤러가 이어서 따라갈 링크도 된다. -->
        <section v-if="related.length > 0" class="mt-10" aria-labelledby="related-sermons">
          <h2 id="related-sermons" class="text-lg font-bold mb-4">같은 본문·같은 설교자의 설교</h2>
          <ul class="bg-white rounded-2xl border border-border divide-y divide-border">
            <li v-for="r in related" :key="r.id">
              <RouterLink :to="`${ROUTE_PATHS.SUNDAY_SERMON}/${r.id}`" class="flex flex-col gap-1 px-6 py-4 hover:bg-muted/40 transition-colors">
                <span class="font-medium">{{ r.title }}</span>
                <span class="text-xs text-muted-foreground">{{ [r.scripture, r.preacher, r.date].filter(Boolean).join(' · ') }}</span>
              </RouterLink>
            </li>
          </ul>
        </section>

        <!-- 데이터 없을 때 -->
        <div v-else class="text-center py-20 text-muted-foreground">
          설교를 찾을 수 없습니다.
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSermons } from '@/composables/useSermons'
import { useBackTo } from '@/composables/useBackTo'
import { ChevronLeft, BookOpen, User, BookMarked, Calendar, PlayCircle } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { resolveScripture, loadBook } from '@/lib/bible'
import { setMeta } from '@/lib/seo'
import { ROUTE_PATHS, formatPreacher } from '@/lib/index'
import type { SermonItem } from '@/lib/index'

const goBack = useBackTo(ROUTE_PATHS.SUNDAY_SERMON)
const route = useRoute()

const sermon = ref<SermonItem | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const bibleData = ref<Record<string, string>>({})

onMounted(async () => {
  const id = Number(route.params.id)

  const { data, error: err } = await supabase.from('sermons').select('*').eq('id', id).single()
  if (err) {
    error.value = err.message
    loading.value = false
    return
  }
  // 목록과 같은 규칙으로 설교자 표기를 맞춘다.
  const normalized: SermonItem = { ...data, preacher: formatPreacher(data.preacher) }
  sermon.value = normalized
  loading.value = false

  // 라우터가 깔아둔 '주일설교' 를 실제 설교 제목으로 바꾼다.
  setMeta({
    title: data.title,
    description: data.summary?.trim() || [data.scripture, normalized.preacher, data.date].filter(Boolean).join(' · '),
    // 엣지(worker)가 넣어 주는 값과 같게 - 영상이 있으면 유튜브 썸네일.
    image: ytThumb(data.link),
    type: 'article',
  })

  // 설교 본문에 해당하는 한 권만 받는다. 예전에는 성경 전체(5MB)를 받았다.
  const parsed = resolveScripture(data?.scripture)
  if (parsed) bibleData.value = await loadBook(parsed.abbrev)
})

function embedId(link: string): string {
  try {
    const url = new URL(link)
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1)
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v') ?? url.pathname.split('/').pop() ?? ''
  } catch {
    // 주소 형식이 아니면 영상 없음으로 본다.
  }
  return ''
}

function ytThumb(link: string | null | undefined): string | undefined {
  const id = link ? embedId(link) : ''
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined
}

// 같은 책(본문) → 같은 설교자 순으로 최근 5건. 이미 받아 둔 전체 목록에서 고른다.
const { items: allSermons, fetchSermons } = useSermons()
const related = computed(() => {
  const cur = sermon.value
  if (!cur) return []
  const book = resolveScripture(cur.scripture)?.abbrev
  const others = allSermons.value.filter(s => s.id !== cur.id)
  const sameBook = book ? others.filter(s => resolveScripture(s.scripture)?.abbrev === book) : []
  const samePreacher = others.filter(s => cur.preacher && s.preacher === cur.preacher && !sameBook.includes(s))
  return [...sameBook, ...samePreacher].slice(0, 5)
})
watch(() => route.params.id, () => { void fetchSermons() }, { immediate: true })

// YouTube URL → embed URL 변환
// 지원: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live/ID
const embedUrl = computed(() => {
  const id = sermon.value?.link ? embedId(sermon.value.link) : ''
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
})

// scripture 파싱 → 구절 배열 반환
// 지원: "요한복음 15:1-5", "시편 27:4", "역대하 7:14-16", "요15:1" (약어 직접 입력)
const bibleVerses = computed(() => {
  const parsed = resolveScripture(sermon.value?.scripture)
  if (!parsed) return []
  const { abbrev, rest } = parsed

  const result: { key: string; text: string }[] = []

  // 3) 두 장에 걸친 범위: "5:21-6:4"
  const crossM = rest.match(/^(\d+):(\d+)-(\d+):(\d+)/)
  if (crossM) {
    const ch1 = Number(crossM[1]), v1 = Number(crossM[2])
    const ch2 = Number(crossM[3]), v2 = Number(crossM[4])
    for (let ch = ch1; ch <= ch2; ch++) {
      const vStart = ch === ch1 ? v1 : 1
      const vEnd = ch === ch2 ? v2 : 200
      for (let v = vStart; v <= vEnd; v++) {
        const key = `${abbrev}${ch}:${v}`
        const text = bibleData.value[key]
        if (!text) break
        result.push({ key, text })
      }
    }
    return result
  }

  // 4) 단일 장: "15:1-5" 또는 "15:1"
  const singleM = rest.match(/^(\d+):(\d+)(?:-(\d+))?/)
  if (!singleM) return []

  const [, chapter, startStr, endStr] = singleM
  const start = Number(startStr)
  const end = endStr ? Number(endStr) : start
  for (let v = start; v <= end; v++) {
    const key = `${abbrev}${chapter}:${v}`
    const text = bibleData.value[key]
    if (text) result.push({ key, text })
  }
  return result
})
</script>
