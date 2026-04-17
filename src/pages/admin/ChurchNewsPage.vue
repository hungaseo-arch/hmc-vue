<template>
  <TheLayout>
    <PageHeader title="교회소식" subtitle="한마음교회의 새로운 소식을 전합니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-5xl">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NewsCard
            v-for="(item, i) in newsItems"
            :key="item.id"
            :item="item"
            class="animate-fade-in-up"
            :style="{ animationDelay: `${i * 0.07}s` }"
            @click="goToDetail(item.id)"
          />
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import NewsCard from '@/components/NewsCard.vue'
import { newsItems } from '@/data/index'

const router = useRouter()

function goToDetail(id: number) {
  router.push(`/admin/news/${id}`)
}
</script>
