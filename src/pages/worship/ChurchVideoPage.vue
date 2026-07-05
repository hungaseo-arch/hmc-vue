<template>
  <TheLayout>
    <PageHeader title="교회영상" subtitle="예배 실황을 영상으로 함께 하세요." />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">
        <div class="grid gap-4 sm:grid-cols-3">
          <a
            v-for="(video, i) in worshipVideos"
            :key="i"
            :href="video.url"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex flex-col items-center text-center bg-white rounded-2xl shadow-sm border border-border p-6 transition hover:shadow-md hover:border-primary/40 animate-fade-in-up"
          >
            <span class="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 mb-4 transition group-hover:bg-red-100">
              <PlayCircle class="w-6 h-6" />
            </span>
            <span class="font-semibold text-foreground">{{ video.label }}</span>
            <span class="text-sm text-muted-foreground mt-1">{{ video.description }}</span>
            <span class="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
              영상 보기 <ExternalLink class="w-3 h-3" />
            </span>
          </a>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { PlayCircle, ExternalLink } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { worshipVideos } from '@/data/index'
</script>
