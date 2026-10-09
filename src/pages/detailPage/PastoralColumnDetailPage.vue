<template>
  <TheLayout>
    <PageHeader as="p" title="목회칼럼" subtitle="담임목사의 목회칼럼을 나눕니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">

        <!-- 뒤로가기 -->
        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          @click="goBack()"
        >
          <ChevronLeft class="w-4 h-4" />
          칼럼 목록으로
        </button>

        <!-- 로딩 / 에러 -->
        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-20 text-red-500">{{ error }}</div>

        <!-- 상세 카드 -->
        <div v-else-if="column" class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">

          <!-- 헤더 -->
          <div class="bg-muted/40 px-8 py-8 border-b border-border">
            <div class="flex items-center gap-2 text-primary text-sm font-medium mb-3">
              <BookOpen class="w-4 h-4" />
              목회칼럼
            </div>
            <h1 class="text-2xl md:text-3xl font-bold leading-snug mb-3">
              {{ cleanTitle(column.title) }}
            </h1>
            <span class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar class="w-4 h-4" />
              {{ formatDate(column.created_at) }}
            </span>
          </div>

          <!-- 본문 -->
          <div class="px-8 py-10">
            <!--
              v-html 이었는데 순수 텍스트로 바꾼다. pastorColumn 134건을 확인해
              보니 HTML 태그가 하나도 없다. 태그가 없는 글을 v-html 로 넣으면
              줄바꿈(\n)이 공백으로 뭉개져서 17건이 한 덩어리로 나오고 있었다.
              whitespace-pre-line 으로 줄을 살리고, 덤으로 관리자가 나중에
              태그를 붙여 넣어도 그대로 그려지지 않는다.
            -->
            <p class="text-foreground/80 leading-relaxed whitespace-pre-line">{{ cleanContent(column.content) }}</p>
          </div>
        </div>

        <!-- 다른 칼럼: 최근 5건 -->
        <section v-if="related.length > 0" class="mt-10" aria-labelledby="related-columns">
          <h2 id="related-columns" class="text-lg font-bold mb-4">다른 목회칼럼</h2>
          <ul class="bg-white rounded-2xl border border-border divide-y divide-border">
            <li v-for="r in related" :key="r.id">
              <RouterLink :to="`${ROUTE_PATHS.PASTORAL_COLUMN}/${r.id}`" class="flex flex-col gap-1 px-6 py-4 hover:bg-muted/40 transition-colors">
                <span class="font-medium">{{ cleanTitle(r.title) }}</span>
                <span class="text-xs text-muted-foreground">{{ formatDate(r.created_at) }}</span>
              </RouterLink>
            </li>
          </ul>
        </section>

        <!-- 데이터 없을 때 -->
        <div v-else class="text-center py-20 text-muted-foreground">
          칼럼을 찾을 수 없습니다.
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBackTo } from '@/composables/useBackTo'
import { ROUTE_PATHS } from '@/lib/index'
import { ChevronLeft, BookOpen, Calendar } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { setMeta } from '@/lib/seo'
import type { PastoralColumnItem } from '@/lib/index'

const goBack = useBackTo(ROUTE_PATHS.PASTORAL_COLUMN)
const route = useRoute()

const column = ref<PastoralColumnItem | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const related = ref<{ id: number; title: string; created_at: string }[]>([])

onMounted(async () => {
  const id = Number(route.params.id)
  const { data, error: err } = await supabase
    .from('pastorColumn')
    .select('*')
    .eq('id', id)
    .single()

  if (err) {
    error.value = err.message
  } else {
    column.value = data
    // 라우터가 깔아둔 '목회칼럼' 을 실제 제목으로 바꾼다.
    setMeta({
      title: cleanTitle(data.title),
      description: (data.excerpt || cleanContent(data.content).replace(/<[^>]*>/g, ' ')).slice(0, 160).trim(),
      type: 'article',
    })
  }
  loading.value = false

  // 최근 칼럼 5건(현재 글 제외). 실패해도 본문에는 영향이 없다.
  const { data: rel } = await supabase
    .from('pastorColumn')
    .select('id, title, created_at')
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(5)
  related.value = rel ?? []
})

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function cleanTitle(title: string): string {
  return title.replace(/^\d{4}\.\d{1,2}\.?\s*\d{1,2}\.?\s*/, '').trim()
}

function cleanContent(html: string | null): string {
  if (!html) return ''
  return html.replace(/고목사의 짧은 단상\s*/g, '').trim()
}
</script>
