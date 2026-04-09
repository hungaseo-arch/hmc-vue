<template>
  <TheLayout>
    <PageHeader title="주보보기" subtitle="이번 주 주보를 확인하세요" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="(item, i) in bulletins"
            :key="i"
            class="bg-white rounded-2xl border border-border p-6 hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer flex items-center gap-4 animate-fade-in-up"
            :style="{ animationDelay: `${i * 0.1}s` }"
          >
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText class="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 class="font-semibold">{{ item.label }}</h3>
              <p class="text-xs text-muted-foreground mt-1">{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'

// React: 인라인 배열 리터럴 → Vue: script에서 데이터 분리
const bulletins = [
  { date: '2026-03-22', label: '3월 22일 주보', desc: '주일예배 / 성가대 / 교회소식' },
  { date: '2026-03-15', label: '3월 15일 주보', desc: '주일예배 / 성가대 / 교회소식' },
  { date: '2026-03-08', label: '3월 8일 주보', desc: '주일예배 / 성가대 / 교회소식' },
  { date: '2026-03-01', label: '3월 1일 주보', desc: '주일예배 / 성가대 / 교회소식' },
]
</script>
