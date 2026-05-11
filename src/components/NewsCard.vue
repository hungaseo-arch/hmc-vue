<template>
  <div
    class="bg-white border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
    @click="router.push(`/admin/news/${item.id}`)"
  >
    <img :src="item.thumbnail" :alt="item.title" class="w-full h-48 object-cover" loading="lazy" />
    <div class="p-5">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs text-muted-foreground">{{ item.date }}</span>
        <span v-if="item.images.length > 1" class="text-xs text-muted-foreground">
          · {{ item.images.length }}장
        </span>
      </div>
      <h3 class="font-semibold leading-snug">{{ item.title }}</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { ChurchNewsItem } from '@/lib/index'

defineProps<{
  item: ChurchNewsItem
}>()

const router = useRouter()
</script>
