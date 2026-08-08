<template>
  <!-- 진짜 <a> 라야 새 탭으로 열기·주소 복사가 된다. SermonCard 와 같은 이유. -->
  <RouterLink
    :to="`/community/news/${item.id}`"
    class="block bg-white border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-1"
  >
    <img
      :src="item.thumbnail"
      :alt="item.title"
      width="640"
      height="384"
      loading="lazy"
      decoding="async"
      class="w-full h-48 object-cover"
    />
    <div class="p-5">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs text-muted-foreground">{{ item.date }}</span>
        <span v-if="item.images.length > 1" class="text-xs text-muted-foreground">
          · {{ item.images.length }}장
        </span>
      </div>
      <h3 class="font-semibold leading-snug">{{ item.title }}</h3>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import type { ChurchNewsItem } from '@/lib/index'

defineProps<{
  item: ChurchNewsItem
}>()
</script>
