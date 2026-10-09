<template>
  <TheLayout>
    <PageHeader as="p" title="포토앨범" subtitle="한마음교회의 소중한 순간들을 담았습니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">

        <div class="flex items-center justify-between mb-8">
        <button
          class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          @click="goBack()"
        >
          <ChevronLeft class="w-4 h-4" />
          앨범 목록으로
        </button>
          <div v-if="album" class="flex items-center gap-2">
            <DeletePostButton v-if="canDelete(album.authorId, album.createdAt)" :label="album.title || `${album.date} 사진`" :action="remove" />
            <ShareButton :title="`사진앨범 · ${album.title}`" />
          </div>
        </div>

        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="!album" class="text-center py-20 text-muted-foreground">앨범을 찾을 수 없습니다.</div>

        <div v-else>
          <div class="bg-white rounded-2xl shadow-sm border border-border px-8 py-7 mb-6">
            <!-- 제목이 비어 있는 앨범도 있다. 그때는 날짜가 이 페이지의 제목이다. -->
            <h1 class="text-xl font-semibold text-foreground mb-3">{{ album.title || `${album.date} 사진` }}</h1>
            <div class="flex items-center gap-3 text-sm text-muted-foreground">
              <span class="flex items-center gap-1">
                <Calendar class="w-4 h-4" />
                {{ album.date }}
              </span>
              <span class="flex items-center gap-1">
                <ImageIcon class="w-4 h-4" />
                {{ album.count }}장
              </span>
              <span v-if="album.authorName">작성자 {{ album.authorName }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <!--
              boxStyle 이 사진이 도착하기 전에 자리를 잡아 준다. 이게 없으면
              사진이 하나씩 뜰 때마다 아래가 통째로 밀린다. useImageRatio 설명 참고.
            -->
            <div
              v-for="(url, i) in album.images"
              :key="i"
              class="rounded-2xl overflow-hidden shadow-sm border border-border bg-muted"
              :style="boxStyle(url)"
            >
              <button type="button" class="block w-full h-full cursor-zoom-in" :aria-label="`사진 ${i + 1} 크게 보기`" @click="viewerIndex = i">
                <img
                  :src="url"
                  :alt="`사진 ${i + 1}`"
                  class="w-full h-full object-contain"
                  loading="lazy"
                  decoding="async"
                  @load="remember(url, $event)"
                />
              </button>
            </div>
          </div>
          <ImageLightbox v-model:index="viewerIndex" :images="album.images" :label="album.title" />
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBackTo } from '@/composables/useBackTo'
import { ROUTE_PATHS } from '@/lib/index'
import { ChevronLeft, Calendar, Image as ImageIcon } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import ShareButton from '@/components/ShareButton.vue'
import DeletePostButton from '@/components/DeletePostButton.vue'
import { useAuth } from '@/composables/useAuth'
import { deletePost } from '@/lib/deletePost'
import ImageLightbox from '@/components/ImageLightbox.vue'
import { usePhotoAlbum } from '@/composables/usePhotoAlbum'
import { useImageRatio } from '@/composables/useImageRatio'

// 행사 사진은 가로가 많다. 세로 사진은 첫 방문에만 좌우 여백이 생긴다.
const { boxStyle, remember } = useImageRatio(4 / 3)

const goBack = useBackTo(ROUTE_PATHS.PHOTO_ALBUM)
const route = useRoute()
const { items, loading, fetchAlbums, reset } = usePhotoAlbum()
const { canDelete, isSuperAdmin } = useAuth()

onMounted(fetchAlbums)

// id는 '2025-11-16_617' 형태
const album = computed(() => items.value.find(a => a.id === route.params.id))
const viewerIndex = ref<number | null>(null)

async function remove() {
  const a = album.value
  if (!a) return
  await deletePost({
    op: '앨범 삭제', bucket: 'photoAlbum', paths: a.files,
    table: 'photo_album_meta', id: a.id, isSuperAdmin: isSuperAdmin.value,
  })
  reset()
  goBack()
}
</script>
