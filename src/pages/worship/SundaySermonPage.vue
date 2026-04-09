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
          <!-- React: 두 개의 버튼 + onClick → Vue: @click + :class -->
          <div class="flex gap-2">
            <button
              v-for="opt in sortOptions"
              :key="opt.value"
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

        <div class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
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
                <!--
                  React: useState + .sort() 인라인
                  Vue:   computed sortedSermons으로 분리 + v-for
                -->
                <tr
                  v-for="sermon in sortedSermons"
                  :key="sermon.id"
                  class="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
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
import { ref, computed } from 'vue'
import { BookOpen } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { sermons } from '@/data/index'

// React: useState(true) → Vue: ref(true)
const sortDesc = ref(true)

const sortOptions = [
  { label: '최신순', value: true },
  { label: '오래된 순', value: false },
]

// React: 렌더마다 sort 실행 → Vue: computed로 캐싱 (의존성 변경 시만 재계산)
const sortedSermons = computed(() =>
  [...sermons].sort((a, b) => sortDesc.value ? b.id - a.id : a.id - b.id)
)
</script>
