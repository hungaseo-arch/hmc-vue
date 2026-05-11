<template>
  <TheLayout>
    <PageHeader title="포토앨범" subtitle="한마음교회의 소중한 순간들을 담았습니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">

        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          @click="router.back()"
        >
          <ChevronLeft class="w-4 h-4" />
          앨범 목록으로
        </button>

        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="!album" class="text-center py-20 text-muted-foreground">앨범을 찾을 수 없습니다.</div>

        <div v-else>
          <div class="bg-white rounded-2xl shadow-sm border border-border px-8 py-7 mb-6">
            <h1 v-if="album.title" class="text-xl font-semibold text-foreground mb-3">{{ album.title }}</h1>
            <div class="flex items-center gap-3 text-sm text-muted-foreground">
              <span class="flex items-center gap-1">
                <Calendar class="w-4 h-4" />
                {{ album.date }}
              </span>
              <span class="flex items-center gap-1">
                <ImageIcon class="w-4 h-4" />
                {{ album.count }}장
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div
              v-for="(url, i) in album.images"
              :key="i"
              class="rounded-2xl overflow-hidden shadow-sm border border-border"
            >
              <img
                :src="url"
                :alt="`사진 ${i + 1}`"
                class="w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChevronLeft, Calendar, Image as ImageIcon } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { usePhotoAlbum } from '@/composables/usePhotoAlbum'

const router = useRouter()
const route = useRoute()
const { items, loading, fetchAlbums } = usePhotoAlbum()

onMounted(fetchAlbums)

// id는 '2025-11-16_617' 형태
const album = computed(() => items.value.find(a => a.id === route.params.id))
</script>
