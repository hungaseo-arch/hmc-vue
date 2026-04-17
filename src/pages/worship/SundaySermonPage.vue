<template>
  <TheLayout>
    <PageHeader title="주일설교" subtitle="말씀으로 양육 받는 한마음교회 성도들" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-primary" />
            설교 목록
          </h2>
          <div class="flex gap-2">
            <button
              v-for="opt in sortOptions"
              :key="opt.label"
              :class="[
                'px-4 py-2 text-sm rounded-lg font-medium transition-colors',
                sortDesc === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              ]"
              @click="sortDesc = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="text-center py-12 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>
        <div v-else class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-muted/60 border-b border-border">
                  <th class="py-3 px-4 text-left text-muted-foreground font-semibold w-12">번호</th>
                  <th class="py-3 px-4 text-left text-muted-foreground font-semibold">제목</th>
                  <th class="py-3 px-4 text-left text-muted-foreground font-semibold hidden md:table-cell">본문</th>
                  <th class="py-3 px-4 text-left text-muted-foreground font-semibold hidden sm:table-cell">설교자</th>
                  <th class="py-3 px-4 text-right text-muted-foreground font-semibold">날짜</th>
                </tr>
              </thead>
              <tbody>
                  <tr
                  v-for="sermon in sortedSermons"
                  :key="sermon.id"
                  class="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  @click="goToDetail(sermon.id)"
                >
                  <td class="py-4 px-4 text-muted-foreground">{{ sermon.id }}</td>
                  <td class="py-4 px-4 font-medium">{{ sermon.title }}</td>
                  <td class="py-4 px-4 text-muted-foreground hidden md:table-cell">{{ sermon.scripture }}</td>
                  <td class="py-4 px-4 text-muted-foreground hidden sm:table-cell">{{ sermon.preacher }}</td>
                  <td class="py-4 px-4 text-muted-foreground text-right text-xs">{{ sermon.date }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import type { SermonItem } from '@/lib/index'

const router = useRouter()

function goToDetail(id: number) {
  router.push(`/worship/sunday-sermon/${id}`)
}

const sermons = ref<SermonItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const { data, error: err } = await supabase
    .from('sermons')
    .select('*')

  if (err) {
    error.value = err.message
  } else {
    sermons.value = data ?? []
  }
  loading.value = false
})

const sortDesc = ref(true)

const sortOptions = [
  { label: '최신순', value: true },
  { label: '오래된 순', value: false },
]

const sortedSermons = computed(() =>
  [...sermons.value].sort((a, b) => sortDesc.value ? b.id - a.id : a.id - b.id)
)
</script>
