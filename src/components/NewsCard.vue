<template>
  <div class="bg-white border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
    <img :src="item.image" :alt="item.title" class="w-full h-48 object-cover" />
    <div class="p-5">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {{ item.category }}
        </span>
        <span class="text-xs text-muted-foreground">{{ item.date }}</span>
      </div>
      <h3 class="font-semibold mb-2 leading-snug">{{ item.title }}</h3>
      <p class="text-sm text-muted-foreground leading-relaxed line-clamp-2">{{ item.summary }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NewsItem } from '@/lib/index'

defineProps<{
  item: NewsItem
}>()
</script>
