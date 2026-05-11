<template>
  <TheLayout>
    <PageHeader title="주일설교" subtitle="말씀으로 양육 받는 한마음교회 성도들" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">

        <!-- 뒤로가기 -->
        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          @click="router.back()"
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
                  <span class="text-xs font-semibold text-primary mr-2">{{ verse.key }}</span>
                  <span class="text-foreground/80">{{ verse.text }}</span>
                </p>
              </div>
            </div>

          </div><!-- /본문 영역 -->
        </div><!-- /상세 카드 -->

        <!-- 데이터 없을 때 -->
        <div v-else class="text-center py-20 text-muted-foreground">
          설교를 찾을 수 없습니다.
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, BookOpen, User, BookMarked, Calendar, PlayCircle } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import type { SermonItem } from '@/lib/index'

const router = useRouter()
const route = useRoute()

const sermon = ref<SermonItem | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const bibleData = ref<Record<string, string>>({})

onMounted(async () => {
  const id = Number(route.params.id)

  const [sermonResult, bibleResult] = await Promise.all([
    supabase.from('sermons').select('*').eq('id', id).single(),
    fetch(`${import.meta.env.BASE_URL}bible.json`).then(r => r.json()),
  ])

  if (sermonResult.error) {
    error.value = sermonResult.error.message
  } else {
    sermon.value = sermonResult.data
  }
  bibleData.value = bibleResult
  loading.value = false
})

// YouTube URL → embed URL 변환
// 지원: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live/ID
const embedUrl = computed(() => {
  const link = sermon.value?.link
  if (!link) return null

  let videoId = ''
  try {
    const url = new URL(link)
    if (url.hostname.includes('youtu.be')) {
      videoId = url.pathname.slice(1)
    } else if (url.hostname.includes('youtube.com')) {
      videoId = url.searchParams.get('v')
        ?? url.pathname.split('/').pop()
        ?? ''
    }
  } catch {
    return null
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
})

// 전체 책이름 → bible.json 약어 매핑
const BOOK_MAP: Record<string, string> = {
  // 구약
  '창세기': '창', '출애굽기': '출', '레위기': '레', '민수기': '민', '신명기': '신',
  '여호수아': '수', '사사기': '삿', '룻기': '룻', '사무엘상': '삼상', '사무엘하': '삼하',
  '열왕기상': '왕상', '열왕기하': '왕하', '역대상': '대상', '역대하': '대하',
  '에스라': '스', '느헤미야': '느', '에스더': '에', '욥기': '욥', '시편': '시',
  '잠언': '잠', '전도서': '전', '아가': '아', '이사야': '사', '예레미야': '렘',
  '예레미야애가': '애', '에스겔': '겔', '다니엘': '단', '호세아': '호', '요엘': '욜',
  '아모스': '암', '오바댜': '옵', '요나': '욘', '미가': '미', '나훔': '나',
  '하박국': '합', '스바냐': '습', '학개': '학', '스가랴': '슥', '말라기': '말',
  // 신약
  '마태복음': '마', '마가복음': '막', '누가복음': '눅', '요한복음': '요',
  '사도행전': '행', '로마서': '롬', '고린도전서': '고전', '고린도후서': '고후',
  '갈라디아서': '갈', '에베소서': '엡', '빌립보서': '빌', '골로새서': '골',
  '데살로니가전서': '살전', '데살로니가후서': '살후', '디모데전서': '딤전', '디모데후서': '딤후',
  '디도서': '딛', '빌레몬서': '몬', '히브리서': '히', '야고보서': '약',
  '베드로전서': '벧전', '베드로후서': '벧후', '요한일서': '요일', '요한이서': '요이',
  '요한삼서': '요삼', '유다서': '유', '요한계시록': '계',
}

// scripture 파싱 → bible.json 구절 배열 반환
// 지원: "요한복음 15:1-5", "시편 27:4", "역대하 7:14-16", "요15:1" (약어 직접 입력)
const bibleVerses = computed(() => {
  const scripture = sermon.value?.scripture?.trim()
  if (!scripture) return []

  // 1) 전체 책이름 매핑 (긴 이름부터 먼저 비교해 부분 매칭 방지)
  let abbrev = ''
  let rest = scripture
  const bookNames = Object.keys(BOOK_MAP).sort((a, b) => b.length - a.length)
  for (const name of bookNames) {
    if (rest.startsWith(name)) {
      abbrev = BOOK_MAP[name]
      rest = rest.slice(name.length).trim()
      break
    }
  }

  // 2) 약어 직접 입력 처리 ("요15:1" 등)
  if (!abbrev) {
    const m = rest.match(/^([가-힣]+)/)
    if (m) {
      abbrev = m[1]
      rest = rest.slice(abbrev.length).trim()
    }
  }

  if (!abbrev) return []

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
