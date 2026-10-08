<!--
  소식 게시판 공용 화면(목록 + 관리자 등록·수정). kind 로 교회소식/선교소식을 고른다.
  설정은 src/lib/newsBoards.ts, 데이터는 useNewsBoard.
-->
<template>
  <TheLayout>
    <PageHeader :title="cfg.title" :subtitle="cfg.subtitle" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-5xl">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">{{ cfg.listHeading }}</h2>
          <button
            v-if="isAdmin"
            class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
            @click="showModal = true"
          >
            <Plus class="w-4 h-4" />
            {{ cfg.newLabel }}
          </button>
        </div>

        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-20 text-red-500">{{ error }}</div>
        <EmptyState
          v-else-if="items.length === 0"
          :icon="Newspaper"
          :title="cfg.emptyTitle"
          :description="cfg.emptyDescription"
        />
        <!-- 게시판 형태의 목록. 포토앨범(그리드)과 달리 사진보다 글이 중심이라 한 줄씩 훑어보기 좋게. -->
        <div v-else class="space-y-4">
          <div
            v-for="item in items"
            :key="item.id"
            class="relative flex items-center gap-3 sm:gap-4 bg-white rounded-2xl shadow-sm border border-border px-4 py-4 sm:px-6 sm:py-5 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <img
              v-if="item.thumbnail"
              :src="item.thumbnail"
              :alt="item.title"
              width="64"
              height="64"
              loading="lazy"
              decoding="async"
              class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0"
            />
            <div v-else class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Newspaper class="w-6 h-6 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold line-clamp-2 sm:truncate leading-snug">
                <RouterLink
                  :to="`${cfg.basePath}/${item.id}`"
                  class="before:absolute before:inset-0 before:content-[''] before:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >{{ item.title }}</RouterLink>
              </h3>
              <p v-if="item.content" class="text-sm text-muted-foreground line-clamp-1 leading-relaxed mt-1">{{ item.content }}</p>
            </div>
            <div class="flex flex-col items-end gap-2 shrink-0">
              <span class="text-xs text-muted-foreground">{{ item.date }}</span>
              <div class="flex items-center gap-1">
                <!-- relative z-10: 카드를 덮는 링크(before) 위로 올려야 눌린다. -->
                <button
                  v-if="isAdmin"
                  class="icon-btn relative z-10"
                  :aria-label="`${item.title} 수정`"
                  @click.stop="openEditModal(item)"
                >
                  <Pencil class="w-4 h-4 text-muted-foreground" />
                </button>
                <ChevronRight class="w-4 h-4 text-muted-foreground hidden sm:block" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <!-- 수정 모달 -->
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
        :aria-labelledby="`${kind}-news-edit-title`"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showEditModal = false"
      >
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto">
          <h3 :id="`${kind}-news-edit-title`" class="text-lg font-bold mb-6">{{ cfg.editTitle }}</h3>
          <form class="space-y-4" @submit.prevent="handleEditSubmit">
            <div>
              <label :for="`${kind}-editform-title`" class="block text-sm font-medium mb-1.5">제목</label>
              <input :id="`${kind}-editform-title`" v-model="editForm.title" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label :for="`${kind}-editform-content`" class="block text-sm font-medium mb-1.5">내용</label>
              <textarea :id="`${kind}-editform-content`" v-model="editForm.content" rows="4" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
            </div>
            <div>
              <p class="block text-sm font-medium mb-2">현재 이미지</p>
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
              <label :for="`${kind}-field-1`" class="block text-sm font-medium mb-1.5">이미지 추가</label>
              <input :id="`${kind}-field-1`" ref="addFileInput" type="file" multiple accept="image/*" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
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
        :aria-labelledby="`${kind}-news-new-title`"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-xl max-h-[90dvh] overflow-y-auto">
          <h3 :id="`${kind}-news-new-title`" class="text-lg font-bold mb-6">{{ cfg.newLabel }}</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label :for="`${kind}-form-date`" class="block text-sm font-medium mb-1.5">날짜</label>
              <input :id="`${kind}-form-date`" v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label :for="`${kind}-form-title`" class="block text-sm font-medium mb-1.5">제목</label>
              <input :id="`${kind}-form-title`" v-model="form.title" required type="text" :placeholder="`${cfg.noun} 제목`" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label :for="`${kind}-form-content`" class="block text-sm font-medium mb-1.5">내용</label>
              <textarea :id="`${kind}-form-content`" v-model="form.content" rows="5" :placeholder="`${cfg.noun} 내용을 입력하세요...`" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
            </div>
            <div>
              <label :for="`${kind}-field-2`" class="block text-sm font-medium mb-1.5">이미지 파일 (선택)</label>
              <input :id="`${kind}-field-2`" ref="fileInput" type="file" multiple accept="image/*" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
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
import { Plus, Pencil, Newspaper, ChevronRight } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useNewsBoard } from '@/composables/useNewsBoard'
import type { NewsBoardKind } from '@/lib/newsBoards'
import { useAuth } from '@/composables/useAuth'
import { useEscapeToClose } from '@/composables/useEscapeToClose'
import { supabase } from '@/lib/supabase'
import { nextPageNo } from '@/lib/index'
import { mustAffectRows, mustRemoveFiles } from '@/lib/db'
import { compressImages, sizeSummary } from '@/lib/imageCompress'

const props = defineProps<{ kind: NewsBoardKind }>()
const kind = props.kind

const { isAdmin } = useAuth()
const { items, loading, error, fetchNews, reset, config: cfg } = useNewsBoard(kind)
fetchNews()

const showEditModal = ref(false)
const editSaving = ref(false)
const editErrorMsg = ref('')
const editProgress = ref('')
const editingId = ref<string | null>(null)
const editForm = ref({ title: '', content: '' })
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

function openEditModal(item: { id: string; title: string; content?: string | null; files: string[]; images: string[] }) {
  editingId.value = item.id
  editForm.value = { title: item.title, content: item.content ?? '' }
  editImages.value = item.files.map((path, i) => ({ path, url: item.images[i] ?? '' }))
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
      editProgress.value = '이미지 삭제 중...'
      await mustRemoveFiles('이미지 삭제', cfg.bucket, toDelete)
    }
    // 새 이미지 추가
    const newFiles = addFileInput.value?.files
    if (newFiles && newFiles.length > 0) {
      // 올리기 전에 브라우저에서 300 KB 아래로 줄인다. imageCompress 설명 참고.
      const ready = await compressImages(newFiles, (d, t) => {
        editProgress.value = `이미지 줄이는 중... (${d}/${t})`
      })
      const summary = sizeSummary(newFiles, ready)
      const startPage = nextPageNo(editImages.value.map(img => img.path))
      for (let i = 0; i < ready.length; i++) {
        const ext = ready[i].name.split('.').pop()
        const p = String(startPage + i).padStart(2, '0')
        editProgress.value = `이미지 업로드 중... (${i + 1}/${ready.length})${summary}`
        const { error: upErr } = await supabase.storage.from(cfg.bucket).upload(`${editingId.value}_p${p}.${ext}`, ready[i], { upsert: true })
        if (upErr) throw upErr
      }
    }
    // 제목/내용 저장
    await mustAffectRows(`${cfg.noun} 수정`,
      supabase.from(cfg.table).update({
        title: editForm.value.title.trim(),
        content: editForm.value.content.trim() || null,
      }).eq('id', editingId.value).select('id'))
    // 목록 새로고침
    reset()
    await fetchNews()
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
const form = ref({ date: '', title: '', content: '' })

function closeModal() {
  showModal.value = false
  form.value = { date: '', title: '', content: '' }
  errorMsg.value = ''
  uploadProgress.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function handleSubmit() {
  const files = fileInput.value?.files

  saving.value = true
  errorMsg.value = ''
  try {
    const base = `${form.value.date}_${Date.now()}`
    if (files && files.length > 0) {
      // 올리기 전에 브라우저에서 300 KB 아래로 줄인다. imageCompress 설명 참고.
      const ready = await compressImages(files, (d, t) => {
        uploadProgress.value = `이미지 줄이는 중... (${d}/${t})`
      })
      const summary = sizeSummary(files, ready)
      for (let i = 0; i < ready.length; i++) {
        const ext = ready[i].name.split('.').pop()
        const p = String(i + 1).padStart(2, '0')
        uploadProgress.value = `업로드 중... (${i + 1}/${ready.length})${summary}`
        const { error: err } = await supabase.storage.from(cfg.bucket).upload(`${base}_p${p}.${ext}`, ready[i], { upsert: true })
        if (err) throw err
      }
    }
    await mustAffectRows(`${cfg.noun} 등록`,
      supabase.from(cfg.table).upsert({
        id: base,
        date: form.value.date,
        title: form.value.title.trim(),
        content: form.value.content.trim() || null,
      }).select('id'))
    reset()
    await fetchNews()
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
