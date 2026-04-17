<template>
  <TheLayout>
    <PageHeader title="교회소식" subtitle="한마음교회의 새로운 소식을 전합니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">

        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          @click="router.back()"
        >
          <ChevronLeft class="w-4 h-4" />
          소식 목록으로
        </button>

        <div v-if="!item" class="text-center py-20 text-muted-foreground">
          소식을 찾을 수 없습니다.
        </div>

        <div v-else class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <img :src="item.image" :alt="item.title" class="w-full h-64 object-cover" />

          <div class="px-8 py-8 border-b border-border">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                {{ item.category }}
              </span>
              <span class="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar class="w-3.5 h-3.5" />
                {{ item.date }}
              </span>
            </div>
            <h1 class="text-2xl md:text-3xl font-bold leading-snug">{{ item.title }}</h1>
          </div>

          <div class="px-8 py-10">
            <p class="text-foreground/80 leading-relaxed">{{ item.summary }}</p>
          </div>
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, Calendar } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { newsItems } from '@/data/index'

const router = useRouter()
const route = useRoute()

const item = computed(() => {
  const id = Number(route.params.id)
  return newsItems.find(n => n.id === id) ?? null
})
</script>
