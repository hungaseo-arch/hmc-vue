<template>
  <TheLayout>
    <PageHeader title="목회칼럼" subtitle="담임목사의 목회칼럼을 나눕니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="flex items-center mb-6">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-primary" />
            칼럼 목록
          </h2>
        </div>

        <div v-if="loading" class="text-center py-12 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>

        <div v-else-if="columns.length === 0" class="bg-white rounded-2xl shadow-sm border border-border p-12 text-center">
          <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-xl font-semibold mb-3">목회칼럼 준비 중</h3>
          <p class="text-muted-foreground">목회칼럼 내용이 곧 업데이트될 예정입니다.</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="col in columns"
            :key="col.id"
            class="bg-white rounded-2xl shadow-sm border border-border px-7 py-6 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
            @click="goToDetail(col.id)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-base mb-2 truncate">{{ cleanTitle(col.title) }}</h3>
                <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{{ stripHtml(col.content) }}</p>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="text-xs text-muted-foreground">{{ formatDate(col.created_at) }}</span>
                <ChevronRight class="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, ChevronRight } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import type { PastoralColumnItem } from '@/lib/index'

const router = useRouter()

const columns = ref<PastoralColumnItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const { data, error: err } = await supabase
    .from('pastorColumn')
    .select('*')
    .order('id', { ascending: false })

  if (err) {
    error.value = err.message
  } else {
    columns.value = data ?? []
  }
  loading.value = false
})

function goToDetail(id: number) {
  router.push(`/worship/pastoral-column/${id}`)
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// "2026.04.05 제목" → "제목"
function cleanTitle(title: string): string {
  return title.replace(/^\d{4}\.\d{1,2}\.?\s*\d{1,2}\.?\s*/, '').trim()
}

function stripHtml(html: string | null): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/^고목사의 짧은 단상\s*/g, '')
    .trim()
}
</script>
