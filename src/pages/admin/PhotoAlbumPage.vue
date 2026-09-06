<template>
  <TheLayout>
    <PageHeader title="포토앨범" subtitle="한마음교회의 소중한 순간들을 담았습니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-5xl">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">앨범 목록</h2>
          <button
            v-if="isAdmin"
            class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
            @click="showModal = true"
          >
            <Plus class="w-4 h-4" />
            새 앨범 등록
          </button>
        </div>

        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-20 text-red-500">{{ error }}</div>
        <EmptyState
          v-else-if="items.length === 0"
          :icon="ImageIcon"
          title="등록된 앨범이 없습니다"
          description="교회 행사 사진이 올라오면 이곳에 표시됩니다."
        />
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(album, i) in items"
            :key="album.id"
            class="relative bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 group animate-fade-in-up"
            :style="{ animationDelay: `${i * 0.08}s` }"
          >
            <div class="relative overflow-hidden h-48">
              <img
                :src="album.thumbnail"
                :alt="album.title || album.date"
                width="640"
                height="384"
                loading="lazy"
                decoding="async"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div class="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <ImageIcon class="w-3 h-3" />
                {{ album.count }}장
              </div>
            </div>
            <!-- before 로 카드 전체를 덮는 진짜 링크. 새 탭 열기·주소 복사가 된다. -->
            <div class="p-4">
              <RouterLink
                :to="`/community/photos/${album.id}`"
                class="before:absolute before:inset-0 before:content-[''] before:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span v-if="album.title" class="block text-sm font-medium text-foreground mb-1 line-clamp-2">{{ album.title }}</span>
                <span class="block text-xs text-muted-foreground">{{ album.date }}</span>
              </RouterLink>
            </div>
            <button
              v-if="isAdmin"
              class="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-lg shadow hover:bg-white transition"
              :aria-label="`${album.title || album.date} 앨범 수정`"
              @click.stop="openEditModal(album)"
            >
              <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <!--
        바깥을 눌러 닫는 모달. role="dialog" 라 키보드 사용자는 ESC(useEscapeToClose)와
        안의 닫기 버튼으로 닫는다. 바깥 클릭은 마우스 편의 기능이라 여기에
        키보드 핸들러를 더 달 이유가 없다.
      -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
      <div
        v-if="showEditModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photoalbum-showEditModal-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showEditModal = false"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <h3 id="photoalbum-showEditModal-title" class="text-lg font-bold mb-6">앨범 수정</h3>
          <form class="space-y-4" @submit.prevent="handleEditSubmit">
            <div>
              <label for="photoalbumpage-editform-title" class="block text-sm font-medium mb-1.5">앨범 제목</label>
              <input id="photoalbumpage-editform-title" v-model="editForm.title" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <p class="block text-sm font-medium mb-2">현재 사진</p>
              <div class="grid grid-cols-3 gap-2">
                <div v-for="(img, i) in editImages" :key="img.path" class="relative">
                  <img :src="img.url" :alt="`${editForm.title} ${i + 1}`" class="w-full h-24 object-cover rounded-lg" :class="{ 'opacity-30': deleteMarked.includes(i) }" />
                  <button
                    type="button"
                    :aria-label="deleteMarked.includes(i) ? `${i + 1}번째 사진 삭제 취소` : `${i + 1}번째 사진 삭제`"
                    :aria-pressed="deleteMarked.includes(i)"
                    class="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs transition"
                    :class="deleteMarked.includes(i) ? 'bg-muted-foreground' : 'bg-red-500 hover:bg-red-600'"
                    @click="toggleDelete(i)"
                  >
                    {{ deleteMarked.includes(i) ? '↩' : '×' }}
                  </button>
                  <div v-if="deleteMarked.includes(i)" class="absolute inset-0 flex items-center justify-center">
                    <span class="text-xs font-semibold text-red-500 bg-white/80 px-1 rounded">삭제</span>
                  </div>
                </div>
              </div>
              <p v-if="deleteMarked.length > 0" class="text-xs text-red-500 mt-1">{{ deleteMarked.length }}장 삭제 예정 (저장 시 적용)</p>
            </div>
            <div>
              <label for="photoalbumpage-field-1" class="block text-sm font-medium mb-1.5">사진 추가</label>
              <input id="photoalbumpage-field-1" ref="addFileInput" type="file" multiple accept="image/*" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
            </div>
            <p v-if="editProgress" class="text-sm text-muted-foreground">{{ editProgress }}</p>
            <p v-if="editErrorMsg" class="text-sm text-red-500">{{ editErrorMsg }}</p>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition" @click="showEditModal = false">취소</button>
              <button type="submit" :disabled="editSaving" class="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                {{ editSaving ? '저장 중...' : '저장' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!--
        바깥을 눌러 닫는 모달. role="dialog" 라 키보드 사용자는 ESC(useEscapeToClose)와
        안의 닫기 버튼으로 닫는다. 바깥 클릭은 마우스 편의 기능이라 여기에
        키보드 핸들러를 더 달 이유가 없다.
      -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
      <div
        v-if="showModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photoalbum-showModal-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 id="photoalbum-showModal-title" class="text-lg font-bold mb-6">새 앨범 등록</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label for="photoalbumpage-form-date" class="block text-sm font-medium mb-1.5">날짜</label>
              <input id="photoalbumpage-form-date" v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="photoalbumpage-form-title" class="block text-sm font-medium mb-1.5">앨범 제목</label>
              <input id="photoalbumpage-form-title" v-model="form.title" required type="text" placeholder="앨범 제목" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="photoalbumpage-field-2" class="block text-sm font-medium mb-1.5">사진 파일</label>
              <input id="photoalbumpage-field-2" ref="fileInput" required type="file" multiple accept="image/*" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
            </div>
            <p v-if="uploadProgress" class="text-sm text-muted-foreground">{{ uploadProgress }}</p>
            <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition" @click="closeModal">취소</button>
              <button type="submit" :disabled="saving" class="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                {{ saving ? '업로드 중...' : '등록' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </TheLayout>
</template>

<script setup lang="ts">
import { errorMessage } from '@/lib/errors'
import { ref } from 'vue'
import { Image as ImageIcon, Plus, Pencil } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { usePhotoAlbum } from '@/composables/usePhotoAlbum'
import { useAuth } from '@/composables/useAuth'
import { useEscapeToClose } from '@/composables/useEscapeToClose'
import { supabase } from '@/lib/supabase'
import { nextPageNo } from '@/lib/index'
import { mustAffectRows, mustRemoveFiles } from '@/lib/db'
import { compressImages, sizeSummary } from '@/lib/imageCompress'

const { isAdmin } = useAuth()
const { items, loading, error, fetchAlbums, reset } = usePhotoAlbum()
fetchAlbums()

const showEditModal = ref(false)
const editSaving = ref(false)
const editErrorMsg = ref('')
const editProgress = ref('')
const editingId = ref<string | null>(null)
const editForm = ref({ title: '' })
// path 와 url 을 함께 보관한다. 서명 URL 에서는 경로를 되파싱할 수 없다.
const editImages = ref<{ path: string; url: string }[]>([])
const deleteMarked = ref<number[]>([])
const addFileInput = ref<HTMLInputElement | null>(null)

function toggleDelete(i: number) {
  if (deleteMarked.value.includes(i)) {
    deleteMarked.value = deleteMarked.value.filter(x => x !== i)
  } else {
    deleteMarked.value = [...deleteMarked.value, i]
  }
}

function openEditModal(album: { id: string; title: string; files: string[]; images: string[] }) {
  editingId.value = album.id
  editForm.value = { title: album.title }
  editImages.value = album.files.map((path, i) => ({ path, url: album.images[i] ?? '' }))
  deleteMarked.value = []
  editErrorMsg.value = ''
  editProgress.value = ''
  showEditModal.value = true
}

async function handleEditSubmit() {
  if (!editingId.value) return
  editSaving.value = true
  editErrorMsg.value = ''
  editProgress.value = ''
  try {
    // 삭제 대상은 보관해 둔 storage 경로를 그대로 사용
    const toDelete = editImages.value
      .filter((_, i) => deleteMarked.value.includes(i))
      .map(img => img.path)
    if (toDelete.length > 0) {
      editProgress.value = '사진 삭제 중...'
      await mustRemoveFiles('사진 삭제', 'photoAlbum', toDelete)
    }
    // 새 사진 추가
    const newFiles = addFileInput.value?.files
    if (newFiles && newFiles.length > 0) {
      // 올리기 전에 브라우저에서 300 KB 아래로 줄인다. imageCompress 설명 참고.
      const ready = await compressImages(newFiles, (d, t) => {
        editProgress.value = `사진 줄이는 중... (${d}/${t})`
      })
      const summary = sizeSummary(newFiles, ready)
      const startPage = nextPageNo(editImages.value.map(img => img.path))
      for (let i = 0; i < ready.length; i++) {
        const ext = ready[i].name.split('.').pop()
        const p = String(startPage + i).padStart(2, '0')
        editProgress.value = `사진 업로드 중... (${i + 1}/${ready.length})${summary}`
        const { error: upErr } = await supabase.storage.from('photoAlbum').upload(`${editingId.value}_p${p}.${ext}`, ready[i], { upsert: true })
        if (upErr) throw upErr
      }
    }
    // 제목 저장
    await mustAffectRows('앨범 수정',
      supabase.from('photo_album_meta').upsert({
        id: editingId.value,
        title: editForm.value.title.trim(),
      }).select('id'))
    // 목록 새로고침
    reset()
    await fetchAlbums()
    showEditModal.value = false
  } catch (e: unknown) {
    editErrorMsg.value = errorMessage(e)
  } finally {
    editSaving.value = false
    editProgress.value = ''
  }
}

const showModal = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const uploadProgress = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const form = ref({ date: '', title: '' })

function closeModal() {
  showModal.value = false
  form.value = { date: '', title: '' }
  errorMsg.value = ''
  uploadProgress.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function handleSubmit() {
  const files = fileInput.value?.files
  if (!files || files.length === 0) { errorMsg.value = '파일을 선택해주세요.'; return }

  saving.value = true
  errorMsg.value = ''
  try {
    const numId = Date.now()
    const base = `${form.value.date}_${numId}`
    // 올리기 전에 브라우저에서 300 KB 아래로 줄인다. imageCompress 설명 참고.
    const ready = await compressImages(files, (d, t) => {
      uploadProgress.value = `사진 줄이는 중... (${d}/${t})`
    })
    const summary = sizeSummary(files, ready)
    for (let i = 0; i < ready.length; i++) {
      const ext = ready[i].name.split('.').pop()
      const p = String(i + 1).padStart(2, '0')
      uploadProgress.value = `업로드 중... (${i + 1}/${ready.length})${summary}`
      const { error: err } = await supabase.storage.from('photoAlbum').upload(`${base}_p${p}.${ext}`, ready[i], { upsert: true })
      if (err) throw err
    }
    await mustAffectRows('앨범 등록',
      supabase.from('photo_album_meta').upsert({
        id: base,
        title: form.value.title.trim(),
      }).select('id'))
    reset()
    await fetchAlbums()
    closeModal()
  } catch (e: unknown) {
    errorMsg.value = errorMessage(e)
  } finally {
    saving.value = false
    uploadProgress.value = ''
  }
}

// Esc 로 모달 닫기
useEscapeToClose([
  { isOpen: () => showModal.value, close: closeModal },
  { isOpen: () => showEditModal.value, close: () => (showEditModal.value = false) },
])
</script>
