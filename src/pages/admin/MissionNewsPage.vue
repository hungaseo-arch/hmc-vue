<template>
  <TheLayout>
    <PageHeader title="선교소식" subtitle="땅 끝까지 이르러 복음을 전하는 선교지 소식입니다." />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">
        <div class="space-y-6">
          <article
            v-for="news in missionNewsList"
            :key="news.id"
            class="bg-white rounded-2xl shadow-sm border border-border p-6 sm:p-8 transition hover:shadow-md animate-fade-in-up"
          >
            <div class="flex flex-wrap items-center gap-2 mb-3">
              <span class="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
                {{ news.region }}
              </span>
              <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays class="w-3 h-3" /> {{ news.date }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-foreground">{{ news.title }}</h3>
            <p class="text-sm text-primary font-medium mt-0.5">{{ news.missionary }}</p>
            <p class="text-sm text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">{{ news.body }}</p>
            <div v-if="news.prayers?.length" class="mt-5 bg-muted/40 rounded-xl p-4">
              <p class="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <HandHeart class="w-4 h-4 text-primary" /> 기도제목
              </p>
              <ol class="list-decimal list-inside space-y-1">
                <li v-for="(prayer, i) in news.prayers" :key="i" class="text-sm text-muted-foreground leading-relaxed">
                  {{ prayer }}
                </li>
              </ol>
            </div>
          </article>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { CalendarDays, HandHeart } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { missionNewsList } from '@/data/index'
</script>
