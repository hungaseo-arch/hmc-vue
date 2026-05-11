<template>
  <TheLayout>
    <PageHeader title="목회칼럼" subtitle="담임목사의 목회칼럼을 나눕니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-primary" />
            칼럼 목록
          </h2>
          <button
            v-if="isAdmin"
            class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
            @click="showModal = true"
          >
            <Plus class="w-4 h-4" />
            새 칼럼 작성
          </button>
        </div>

        <div v-if="loading" class="text-center py-12 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>

        <div v-else-if="columns.length === 0" class="bg-white rounded-2xl shadow-sm border border-border p-12 text-center">
          <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-xl font-semibold mb-3">목회칼럼 준비 중</h3>
          <p class="text-muted-foreground">목회칼럼 내용이 곧 업데이트될 예정입니다.</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="col in columns"
            :key="col.id"
            class="bg-white rounded-2xl shadow-sm border border-border px-7 py-6 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
            @click="goToDetail(col.id)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-base mb-2 truncate">{{ cleanTitle(col.title) }}</h3>
                <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{{ stripHtml(col.content) }}</p>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="text-xs text-muted-foreground">{{ formatDate(col.created_at) }}</span>
                <div class="flex items-center gap-1">
                  <button
                    v-if="isAdmin"
                    class="p-1.5 rounded-lg hover:bg-muted transition"
                    @click.stop="openEditModal(col)"
                  >
                    <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showModal = false"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl">
          <h3 class="text-lg font-bold mb-6">새 칼럼 작성</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label class="block text-sm font-medium mb-1.5">제목</label>
              <input v-model="form.title" required type="text" placeholder="칼럼 제목" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">날짜</label>
              <input v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">내용</label>
              <textarea v-model="form.content" required rows="8" placeholder="칼럼 내용을 입력하세요..." class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
            </div>
            <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition" @click="showModal = false">취소</button>
              <button type="submit" :disabled="saving" class="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                {{ saving ? '저장 중...' : '저장' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      <!-- 수정 모달 -->
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showEditModal = false"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl">
          <h3 class="text-lg font-bold mb-6">칼럼 수정</h3>
          <form class="space-y-4" @submit.prevent="handleEditSubmit">
            <div>
              <label class="block text-sm font-medium mb-1.5">제목</label>
              <input v-model="editForm.title" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">날짜</label>
              <input v-model="editForm.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">내용</label>
              <textarea v-model="editForm.content" required rows="8" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
            </div>
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
    </Teleport>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, ChevronRight, Plus, Pencil } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import type { PastoralColumnItem } from '@/lib/index'

const router = useRouter()
const { isAdmin } = useAuth()

const columns = ref<PastoralColumnItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const { data, error: err } = await supabase.from('pastorColumn').select('*').order('id', { ascending: false })
  if (err) error.value = err.message
  else columns.value = data ?? []
  loading.value = false
})

function goToDetail(id: number) {
  router.push(`/worship/pastoral-column/${id}`)
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function cleanTitle(title: string): string {
  return title.replace(/^\d{4}\.\d{1,2}\.?\s*\d{1,2}\.?\s*/, '').trim()
}

function stripHtml(html: string | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/^고목사의 짧은 단상\s*/g, '').trim()
}

const showModal = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const form = ref({ title: '', date: '', content: '' })

const showEditModal = ref(false)
const editSaving = ref(false)
const editErrorMsg = ref('')
const editingId = ref<number | null>(null)
const editForm = ref({ title: '', date: '', content: '' })

function openEditModal(col: PastoralColumnItem) {
  editingId.value = col.id
  editForm.value = {
    title: col.title,
    date: col.created_at ? col.created_at.slice(0, 10) : '',
    content: col.content ?? '',
  }
  editErrorMsg.value = ''
  showEditModal.value = true
}

async function handleEditSubmit() {
  if (!editingId.value) return
  editSaving.value = true
  editErrorMsg.value = ''
  try {
    const { error: err } = await supabase.from('pastorColumn').update({
      title: editForm.value.title,
      content: editForm.value.content,
      created_at: new Date(editForm.value.date).toISOString(),
    }).eq('id', editingId.value)
    if (err) throw err
    const idx = columns.value.findIndex(c => c.id === editingId.value)
    if (idx !== -1) columns.value[idx] = {
      ...columns.value[idx],
      title: editForm.value.title,
      content: editForm.value.content,
      created_at: new Date(editForm.value.date).toISOString(),
    }
    showEditModal.value = false
  } catch (e: unknown) {
    editErrorMsg.value = (e as any)?.message ?? String(e)
  } finally {
    editSaving.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  errorMsg.value = ''
  try {
    const { error: err } = await supabase
      .from('pastorColumn')
      .insert({
        title: form.value.title,
        content: form.value.content,
        created_at: form.value.date ? new Date(form.value.date).toISOString() : new Date().toISOString(),
      })
    if (err) throw err
    const { data } = await supabase.from('pastorColumn').select('*').order('id', { ascending: false })
    if (data) columns.value = data
    showModal.value = false
    form.value = { title: '', date: '', content: '' }
  } catch (e: unknown) {
    errorMsg.value = (e as any)?.message ?? String(e)
  } finally {
    saving.value = false
  }
}
</script>
