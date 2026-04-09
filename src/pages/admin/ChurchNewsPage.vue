<template>
  <TheLayout>
    <PageHeader title="교회소식" subtitle="한마음교회의 새로운 소식을 전합니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-5xl">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!--
            React: [...newsItems, ...newsItems].map((item, i) => ...)
            Vue:   computed로 중복 데이터 생성 + v-for
            NewsCard 재사용 컴포넌트 활용
          -->
          <NewsCard
            v-for="(item, i) in doubledNews"
            :key="i"
            :item="item"
            class="animate-fade-in-up"
            :style="{ animationDelay: `${i * 0.07}s` }"
          />
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import NewsCard from '@/components/NewsCard.vue'
import { newsItems } from '@/data/index'

// computed로 캐싱 (React에서는 렌더마다 새 배열 생성)
const doubledNews = computed(() => [...newsItems, ...newsItems])
</script>
