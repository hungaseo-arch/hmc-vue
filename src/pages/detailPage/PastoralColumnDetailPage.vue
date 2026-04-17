<template>
  <TheLayout>
    <PageHeader title="목회칼럼" subtitle="담임목사의 목회칼럼을 나눕니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">

        <!-- 뒤로가기 -->
        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          @click="router.back()"
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
            <div
              class="prose prose-sm max-w-none text-foreground/80 leading-relaxed"
              v-html="cleanContent(column.content)"
            />
          </div>
        </div>

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
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, BookOpen, Calendar } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import type { PastoralColumnItem } from '@/lib/index'

const router = useRouter()
const route = useRoute()

const column = ref<PastoralColumnItem | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

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
  }
  loading.value = false
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
