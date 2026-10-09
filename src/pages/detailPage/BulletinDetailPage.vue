<template>
  <TheLayout>
    <PageHeader as="p" title="주보보기" subtitle="이번 주 주보를 확인하세요" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">

        <div class="flex items-center justify-between mb-8">
        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          @click="goBack()"
        >
          <ChevronLeft class="w-4 h-4" />
          주보 목록으로
        </button>
          <div v-if="pages.length" class="flex items-center gap-2">
            <DeletePostButton v-if="canDelete(authorId)" :label="`${dateLabel} 주보`" :action="remove" />
            <ShareButton :title="`주보 ${dateLabel}`" />
          </div>
        </div>

        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-20 text-red-500">{{ error }}</div>

        <div v-else-if="pages.length === 0" class="text-center py-20 text-muted-foreground">
          주보를 찾을 수 없습니다.
        </div>

        <div v-else>
          <div class="bg-white rounded-2xl shadow-sm border border-border px-8 py-7 mb-6">
            <div class="flex items-center gap-2 text-primary text-sm font-medium mb-3">
              <FileText class="w-4 h-4" />
              주보
            </div>
            <h1 class="text-2xl md:text-3xl font-bold mb-1">{{ dateLabel }}</h1>
            <p class="text-sm text-muted-foreground">총 {{ pages.length }}페이지 · 페이지를 누르면 크게 볼 수 있습니다<template v-if="authorName"> · 작성자 {{ authorName }}</template></p>
          </div>

          <div class="flex flex-col gap-4">
            <!--
              사진이 도착하기 전에는 추정 비율로 자리를 잡아 밀림을 줄인다(useImageRatio 참고).
              다만 주보는 실제 비율이 추정과 꽤 어긋나는 경우가 많아(펼침 스캔마다 여백이 달라),
              도착하면 상자를 실제 비율에 맞게 다시 잡는다 — 페이지 수가 적어 이 한 번의
              밀림은 갤러리처럼 계속 흔들리는 문제가 되지 않는다.
            -->
            <div
              v-for="(url, i) in pages"
              :key="url"
              class="rounded-2xl overflow-hidden shadow-sm border border-border bg-muted"
              :style="loadedUrls.has(url) ? undefined : boxStyle(url, fallbackRatio)"
            >
              <button type="button" class="block w-full h-full cursor-zoom-in" :aria-label="`${i + 1}페이지 크게 보기`" @click="viewerIndex = i">
                <img
                  :src="url"
                  :alt="`${dateLabel} ${i + 1}페이지`"
                  class="w-full block"
                  :class="loadedUrls.has(url) ? 'h-auto' : 'h-full object-contain'"
                  loading="lazy"
                  decoding="async"
                  @load="onLoad(url, $event)"
                />
              </button>
            </div>
          </div>
          <ImageLightbox v-model:index="viewerIndex" :images="pages" :label="`${dateLabel} 주보`" />
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBackTo } from '@/composables/useBackTo'
import { ROUTE_PATHS } from '@/lib/index'
import { ChevronLeft, FileText } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import ShareButton from '@/components/ShareButton.vue'
import DeletePostButton from '@/components/DeletePostButton.vue'
import { useAuth } from '@/composables/useAuth'
import { deletePost } from '@/lib/deletePost'
import ImageLightbox from '@/components/ImageLightbox.vue'
import { supabase } from '@/lib/supabase'
import { signPaths } from '@/lib/storage'
import { useImageRatio } from '@/composables/useImageRatio'

// 주보는 A4 를 스캔한 세로 문서라 거의 전부 1:√2 다. 다만 최근에는 앞뒤 면을
// 펼쳐서 한 장(가로)으로 스캔해 올리는 경우가 많아, 페이지가 1장뿐이면
// 가로(√2:1)로 추정한다 — 실제 비율은 로드 후 remember() 가 다음 방문용으로 적어 둔다.
const { boxStyle, remember } = useImageRatio(1 / 1.414)
const fallbackRatio = computed(() => (pages.value.length === 1 ? 1.414 : 1 / 1.414))
const loadedUrls = ref<Set<string>>(new Set())
const viewerIndex = ref<number | null>(null)

function onLoad(url: string, e: Event) {
  remember(url, e)
  loadedUrls.value.add(url)
  loadedUrls.value = new Set(loadedUrls.value)
}

const goBack = useBackTo(ROUTE_PATHS.BULLETIN)
const route = useRoute()

const { canDelete, isSuperAdmin } = useAuth()
const authorId = ref<string | null>(null)
const authorName = ref<string | null>(null)
const pageFiles = ref<string[]>([])
const pages = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const BUCKET = 'weeklyBulletin'
const date = route.params.id as string

const dateLabel = computed(() => {
  if (!date || date.length < 8) return ''
  const year = date.slice(0, 4)
  const month = String(parseInt(date.slice(4, 6)))
  const day = String(parseInt(date.slice(6, 8)))
  return `${year}년 ${month}월 ${day}일`
})

async function remove() {
  await deletePost({
    op: '주보 삭제', bucket: BUCKET, paths: pageFiles.value,
    table: 'bulletin_meta', id: date, isSuperAdmin: isSuperAdmin.value,
  })
  goBack()
}

onMounted(async () => {
  try {
    // search 로 이 날짜 파일만 받아온다 — 예전에는 버킷 전체를 나열했다.
    const { data: files, error: err } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000, search: `${date}-`, sortBy: { column: 'name', order: 'asc' } })
    if (err) throw err

    const paths = (files ?? [])
      .filter(f => f.name.startsWith(`${date}-`))
      .map(f => f.name)
      .sort((a, b) => a.localeCompare(b))

    const urls = await signPaths(BUCKET, paths)
    pageFiles.value = paths
    pages.value = paths.map(p => urls[p]).filter(Boolean)

    // 작성자. 기록이 없는 옛 주보는 null 로 남는다.
    const { data: meta } = await supabase.from('bulletin_meta').select('author_id, author_name').eq('id', date).maybeSingle()
    authorId.value = meta?.author_id ?? null
    authorName.value = meta?.author_name ?? null
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '주보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})
</script>
