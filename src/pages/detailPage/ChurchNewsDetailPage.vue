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

        <div v-if="loading" class="text-center py-20 text-muted-foreground">
          불러오는 중...
        </div>
        <div v-else-if="!item" class="text-center py-20 text-muted-foreground">
          소식을 찾을 수 없습니다.
        </div>
        <div v-else class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div class="px-8 py-8 border-b border-border">
            <div class="flex items-center gap-1 mb-4 text-xs text-muted-foreground">
              <Calendar class="w-3.5 h-3.5" />
              {{ item.date }}
            </div>
            <h1 class="text-2xl md:text-3xl font-bold leading-snug">{{ item.title }}</h1>
          </div>

          <div v-if="item.content" class="px-8 py-6 border-b border-border">
            <p class="text-sm leading-relaxed whitespace-pre-line text-foreground">{{ item.content }}</p>
          </div>

          <div class="divide-y divide-border">
            <img
              v-for="(url, i) in item.images"
              :key="i"
              :src="url"
              :alt="`${item.title} ${i + 1}/${item.images.length}`"
              class="w-full object-contain"
              loading="lazy"
            />
          </div>
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, Calendar } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useChurchNews } from '@/composables/useChurchNews'

const router = useRouter()
const route = useRoute()
const { items, loading, fetchNews } = useChurchNews()

onMounted(fetchNews)

const item = computed(() => items.value.find(n => n.id === route.params.id))
</script>
