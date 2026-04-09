<template>
  <TheLayout>
    <PageHeader title="목회칼럼" subtitle="담임목사의 목회칼럼을 나눕니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">
        <div class="bg-white rounded-2xl shadow-sm border border-border p-12 text-center animate-fade-in-up">
          <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-xl font-semibold mb-3">목회칼럼 준비 중</h3>
          <p class="text-muted-foreground">목회칼럼 내용이 곧 업데이트될 예정입니다.</p>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
</script>
