<template>
  <TheLayout>
    <PageHeader title="연혁" subtitle="하나님과 함께한 한마음교회의 발자취입니다" />
    <section class="py-16 overflow-hidden">
      <div class="container mx-auto px-4">
        <div class="overflow-x-auto pb-6">
          <div class="flex gap-8 min-w-max px-4 relative">
            <!-- Horizontal timeline line -->
            <div class="absolute top-6 left-0 right-0 h-0.5 bg-border" />

            <div
              v-for="(item, i) in reversedHistory"
              :key="item.year"
              class="relative min-w-55 max-w-60 animate-fade-in-up"
              :style="{ animationDelay: `${i * 0.04}s` }"
            >
              <!-- Timeline dot -->
              <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full border-4 border-white shadow-md z-10" />
              <div class="bg-white border border-border rounded-2xl p-5 mt-14 shadow-sm hover:shadow-md transition-shadow">
                <div class="text-2xl font-bold text-primary mb-3">{{ item.year }}</div>
                <ul class="space-y-1.5">
                  <li
                    v-for="(event, j) in item.events"
                    :key="j"
                    class="text-sm text-muted-foreground leading-relaxed flex gap-2"
                  >
                    <span class="text-primary/40">•</span>
                    <span>{{ event }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { historyData } from '@/data/index'

const reversedHistory = computed(() => [...historyData].reverse())
</script>
