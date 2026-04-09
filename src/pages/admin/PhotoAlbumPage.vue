<template>
  <TheLayout>
    <PageHeader title="포토앨범" subtitle="한마음교회의 소중한 순간들을 담았습니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-5xl">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(album, i) in photoAlbums"
            :key="album.id"
            class="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer group animate-fade-in-up"
            :style="{ animationDelay: `${i * 0.08}s` }"
          >
            <div class="relative overflow-hidden h-48">
              <img
                :src="album.thumbnail"
                :alt="album.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <!-- React: className → Vue: class -->
              <div class="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <ImageIcon class="w-3 h-3" />
                {{ album.count }}장
              </div>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-sm mb-1">{{ album.title }}</h3>
              <p class="text-xs text-muted-foreground">{{ album.date }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { Image as ImageIcon } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { photoAlbums } from '@/data/index'
</script>
