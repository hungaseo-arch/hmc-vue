<!-- 소식 게시판 공용 상세 화면. kind 로 교회소식/선교소식을 고른다. -->
<template>
  <TheLayout>
    <PageHeader as="p" :title="cfg.title" :subtitle="cfg.subtitle" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">

        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          @click="goBack()"
        >
          <ChevronLeft class="w-4 h-4" />
          {{ cfg.backLabel }}
        </button>

        <div v-if="loading" class="text-center py-20 text-muted-foreground">
          불러오는 중...
        </div>
        <div v-else-if="!item" class="text-center py-20 text-muted-foreground">
          {{ cfg.noun }}을 찾을 수 없습니다.
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

          <!-- 사진이 도착하기 전에 자리를 잡는다. useImageRatio 설명 참고. -->
          <div class="divide-y divide-border">
            <div
              v-for="(url, i) in item.images"
              :key="i"
              class="bg-muted"
              :style="boxStyle(url)"
            >
              <button type="button" class="block w-full h-full cursor-zoom-in" :aria-label="`사진 ${i + 1} 크게 보기`" @click="viewerIndex = i">
                <img
                  :src="url"
                  :alt="`${item.title} ${i + 1}/${item.images.length}`"
                  class="w-full h-full object-contain"
                  loading="lazy"
                  decoding="async"
                  @load="remember(url, $event)"
                />
              </button>
            </div>
          </div>
          <ImageLightbox v-model:index="viewerIndex" :images="item.images" :label="item.title" />
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBackTo } from '@/composables/useBackTo'
import { ChevronLeft, Calendar } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import { useNewsBoard } from '@/composables/useNewsBoard'
import { NEWS_BOARDS, type NewsBoardKind } from '@/lib/newsBoards'
import { useImageRatio } from '@/composables/useImageRatio'

// 소식 사진은 행사 스냅이 대부분이라 가로 4:3 을 기본으로 둔다.
const { boxStyle, remember } = useImageRatio(4 / 3)

const props = defineProps<{ kind: NewsBoardKind }>()
const cfg = NEWS_BOARDS[props.kind]

const goBack = useBackTo(cfg.basePath)
const route = useRoute()
const { items, loading, fetchNews } = useNewsBoard(props.kind)

onMounted(fetchNews)

const item = computed(() => items.value.find(n => n.id === route.params.id))
const viewerIndex = ref<number | null>(null)
</script>
