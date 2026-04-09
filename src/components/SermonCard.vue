<template>
  <div
    class="bg-white border border-border rounded-2xl p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer"
    :class="{ 'animate-fade-in-up': visible }"
  >
    <div class="flex items-center gap-2 mb-3">
      <span class="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
        #{{ sermon.id }}
      </span>
      <span class="text-xs text-muted-foreground">{{ sermon.date }}</span>
    </div>
    <h3 class="font-semibold text-base mb-2 leading-snug">{{ sermon.title }}</h3>
    <p class="text-sm text-muted-foreground mb-3">{{ sermon.scripture }}</p>
    <p class="text-xs text-muted-foreground font-medium">{{ sermon.preacher }}</p>
  </div>
</template>

<script setup lang="ts">
import type { SermonItem } from '@/lib/index'

defineProps<{
  sermon: SermonItem
  visible?: boolean
}>()
</script>
