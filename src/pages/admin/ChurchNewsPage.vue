<template>
  <TheLayout>
    <PageHeader title="교회소식" subtitle="한마음교회의 새로운 소식을 전합니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-5xl">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">소식 목록</h2>
          <button
            v-if="isAdmin"
            class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
            @click="showModal = true"
          >
            <Plus class="w-4 h-4" />
            새 소식 등록
          </button>
        </div>

        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-20 text-red-500">{{ error }}</div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="(item, i) in items" :key="item.id" class="relative">
            <NewsCard
              :item="item"
              class="animate-fade-in-up"
              :style="{ animationDelay: `${i * 0.07}s` }"
              @click="goToDetail(item.id)"
            />
            <button
              v-if="isAdmin"
              class="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg shadow hover:bg-white transition"
              @click.stop="openEditModal(item)"
            >
              <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <!-- 수정 모달 -->
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showEditModal = false"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-bold mb-6">소식 수정</h3>
          <form class="space-y-4" @submit.prevent="handleEditSubmit">
            <div>
              <label class="block text-sm font-medium mb-1.5">제목</label>
              <input v-model="editForm.title" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">내용</label>
              <textarea v-model="editForm.content" rows="4" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">현재 이미지</label>
              <div class="grid grid-cols-3 gap-2">
                <div v-for="(url, i) in editImages" :key="url" class="relative">
                  <img :src="url" class="w-full h-24 object-cover rounded-lg" :class="{ 'opacity-30': deleteMarked.includes(i) }" />
                  <button
                    type="button"
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
              <label class="block text-sm font-medium mb-1.5">이미지 추가</label>
              <input ref="addFileInput" type="file" multiple accept="image/*" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
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

      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 class="text-lg font-bold mb-6">새 소식 등록</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label class="block text-sm font-medium mb-1.5">날짜</label>
              <input v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">제목</label>
              <input v-model="form.title" required type="text" placeholder="소식 제목" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">내용</label>
              <textarea v-model="form.content" rows="5" placeholder="소식 내용을 입력하세요..." class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">이미지 파일</label>
              <input ref="fileInput" required type="file" multiple accept="image/*" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import NewsCard from '@/components/NewsCard.vue'
import { useChurchNews } from '@/composables/useChurchNews'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const { isAdmin } = useAuth()
const { items, loading, error, fetchNews, reset } = useChurchNews()

onMounted(fetchNews)

function goToDetail(id: string) {
  router.push(`/admin/news/${id}`)
}

const showEditModal = ref(false)
const editSaving = ref(false)
const editErrorMsg = ref('')
const editProgress = ref('')
const editingId = ref<string | null>(null)
const editForm = ref({ title: '', content: '' })
const editImages = ref<string[]>([])
const deleteMarked = ref<number[]>([])
const addFileInput = ref<HTMLInputElement | null>(null)

function toggleDelete(i: number) {
  if (deleteMarked.value.includes(i)) {
    deleteMarked.value = deleteMarked.value.filter(x => x !== i)
  } else {
    deleteMarked.value = [...deleteMarked.value, i]
  }
}

function openEditModal(item: { id: string; title: string; content?: string | null; images: string[] }) {
  editingId.value = item.id
  editForm.value = { title: item.title, content: item.content ?? '' }
  editImages.value = [...item.images]
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
    // 삭제 대상 파일명 추출
    const toDelete = editImages.value
      .filter((_, i) => deleteMarked.value.includes(i))
      .map(url => decodeURIComponent(url.split('/churchNews/').pop() ?? ''))
      .filter(Boolean)
    if (toDelete.length > 0) {
      editProgress.value = '이미지 삭제 중...'
      const { error: delErr } = await supabase.storage.from('churchNews').remove(toDelete)
      if (delErr) throw delErr
    }
    // 새 이미지 추가
    const newFiles = addFileInput.value?.files
    if (newFiles && newFiles.length > 0) {
      const startPage = editImages.value.length + 1
      for (let i = 0; i < newFiles.length; i++) {
        const ext = newFiles[i].name.split('.').pop()
        const p = String(startPage + i).padStart(2, '0')
        editProgress.value = `이미지 업로드 중... (${i + 1}/${newFiles.length})`
        const { error: upErr } = await supabase.storage.from('churchNews').upload(`${editingId.value}_p${p}.${ext}`, newFiles[i], { upsert: true })
        if (upErr) throw upErr
      }
    }
    // 제목/내용 저장
    const { error: err } = await supabase.from('church_news_content').update({
      title: editForm.value.title.trim(),
      content: editForm.value.content.trim() || null,
    }).eq('id', editingId.value)
    if (err) throw err
    // 목록 새로고침
    reset()
    await fetchNews()
    showEditModal.value = false
  } catch (e: unknown) {
    editErrorMsg.value = (e as any)?.message ?? String(e)
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
  if (!files || files.length === 0) { errorMsg.value = '파일을 선택해주세요.'; return }

  saving.value = true
  errorMsg.value = ''
  try {
    const base = `${form.value.date}_${Date.now()}`
    for (let i = 0; i < files.length; i++) {
      const ext = files[i].name.split('.').pop()
      const p = String(i + 1).padStart(2, '0')
      uploadProgress.value = `업로드 중... (${i + 1}/${files.length})`
      const { error: err } = await supabase.storage.from('churchNews').upload(`${base}_p${p}.${ext}`, files[i], { upsert: true })
      if (err) throw err
    }
    const { error: dbErr } = await supabase.from('church_news_content').upsert({
      id: base,
      title: form.value.title.trim(),
      content: form.value.content.trim() || null,
    })
    if (dbErr) throw dbErr
    reset()
    await fetchNews()
    closeModal()
  } catch (e: unknown) {
    errorMsg.value = (e as any)?.message ?? String(e)
  } finally {
    saving.value = false
    uploadProgress.value = ''
  }
}
</script>
