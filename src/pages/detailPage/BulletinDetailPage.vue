<template>
    <TheLayout>
        <PageHeader title="주보보기" subtitle="이번 주 주보를 확인하세요" />
        <section class="py-16">
        <div class="container mx-auto px-4 max-w-3xl">

            <button
            class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            @click="router.back()"
            >
            <ChevronLeft class="w-4 h-4" />
            주보 목록으로
            </button>

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
                <p class="text-sm text-muted-foreground">총 {{ pages.length }}페이지</p>
            </div>

            <div class="flex flex-col gap-4">
                <div
                v-for="(url, i) in pages"
                :key="url"
                class="rounded-2xl overflow-hidden shadow-sm border border-border"
                >
                <img :src="url" :alt="`${dateLabel} ${i + 1}페이지`" class="w-full object-contain" />
                </div>
            </div>
            </div>

        </div>
        </section>
    </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, FileText } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()

const pages = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const BUCKET = 'weeklyBulletin'
const date = route.params.id as string  // e.g. "20160911"

const dateLabel = computed(() => {
  if (!date || date.length < 8) return ''
  const year = date.slice(0, 4)
  const month = String(parseInt(date.slice(4, 6)))
  const day = String(parseInt(date.slice(6, 8)))
  return `${year}년 ${month}월 ${day}일`
})

onMounted(async () => {
  const { data: files, error: err } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

  if (err) {
    error.value = err.message
    loading.value = false
    return
  }

  const matched = (files ?? [])
    .filter(f => f.name.startsWith(date + '-'))
    .sort((a, b) => a.name.localeCompare(b.name))

  pages.value = matched.map(f => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(f.name)
    return data.publicUrl
  })

  loading.value = false
})
</script>
