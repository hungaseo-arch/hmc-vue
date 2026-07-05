<template>
  <TheLayout>
    <PageHeader title="주일설교" subtitle="말씀으로 양육 받는 한마음교회 성도들" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-primary" />
            설교 목록
          </h2>
          <div class="flex gap-2">
            <button
              v-if="isAdmin"
              class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
              @click="showModal = true"
            >
              <Plus class="w-4 h-4" />
              새 설교 등록
            </button>
            <button
              v-for="opt in sortOptions"
              :key="opt.label"
              :class="[
                'px-4 py-2 text-sm rounded-lg font-medium transition-colors hidden sm:inline-flex',
                sortDesc === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              ]"
              @click="sortDesc = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="text-center py-12 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>
        <div v-else class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-muted/60 border-b border-border">
                  <!-- <th class="py-3 px-4 text-left text-muted-foreground font-semibold w-12 whitespace-nowrap">번호</th> -->
                  <th class="py-3 px-4 text-left text-muted-foreground font-semibold overflow-hidden">제목</th>
                  <th class="py-3 px-4 text-left text-muted-foreground font-semibold hidden sm:table-cell">본문</th>
                  <th class="py-3 px-4 text-left text-muted-foreground font-semibold hidden md:table-cell">설교자</th>
                  <th class="py-3 px-4 text-right text-muted-foreground font-semibold">날짜</th>
                  <th v-if="isAdmin" class="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="sermon in pagedSermons"
                  :key="sermon.id"
                  class="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  @click="goToDetail(sermon.id)"
                >
                  <!-- <td class="py-4 px-4 text-muted-foreground">{{ sermon.id }}</td> -->
                  <td class="py-4 px-4 font-medium truncate">{{ sermon.title }}</td>
                  <td class="py-4 px-4 text-muted-foreground hidden sm:table-cell">{{ sermon.scripture }}</td>
                  <td class="py-4 px-4 text-muted-foreground hidden md:table-cell">{{ sermon.preacher }}</td>
                  <td class="py-4 px-4 text-muted-foreground text-right text-xs whitespace-nowrap">{{ sermon.date }}</td>
                  <td v-if="isAdmin" class="py-4 px-4" @click.stop>
                    <button class="p-1.5 rounded-lg hover:bg-muted transition" @click="openEditModal(sermon)">
                      <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 페이지네이션 -->
        <div v-if="!loading && !error && totalPages > 1" class="flex items-center justify-center gap-1 mt-6">
          <button
            class="p-2 rounded-lg text-muted-foreground hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            v-for="page in pageNumbers"
            :key="page"
            :class="[
              'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            ]"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          <button
            class="p-2 rounded-lg text-muted-foreground hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showModal = false"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 class="text-lg font-bold mb-6">새 설교 등록</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label class="block text-sm font-medium mb-1.5">제목</label>
              <input v-model="form.title" required type="text" placeholder="설교 제목" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1.5">본문</label>
                <input v-model="form.scripture" required type="text" placeholder="요 3:16" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">설교자</label>
                <input v-model="form.preacher" required type="text" placeholder="담임목사" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">날짜</label>
              <input v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">링크 (선택)</label>
              <input v-model="form.link" type="url" placeholder="https://youtube.com/..." class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition" @click="showModal = false">취소</button>
              <button type="submit" :disabled="saving" class="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                {{ saving ? '등록 중...' : '등록' }}
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
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 class="text-lg font-bold mb-6">설교 수정</h3>
          <form class="space-y-4" @submit.prevent="handleEditSubmit">
            <div>
              <label class="block text-sm font-medium mb-1.5">제목</label>
              <input v-model="editForm.title" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1.5">본문</label>
                <input v-model="editForm.scripture" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">설교자</label>
                <input v-model="editForm.preacher" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">날짜</label>
              <input v-model="editForm.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">링크 (선택)</label>
              <input v-model="editForm.link" type="url" placeholder="https://youtube.com/..." class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
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
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, Plus, Pencil, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import type { SermonItem } from '@/lib/index'

const router = useRouter()
const { isAdmin } = useAuth()

function goToDetail(id: number) {
  router.push(`/worship/sunday-sermon/${id}`)
}

const sermons = ref<SermonItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

;(async () => {
  const { data, error: err } = await supabase.from('sermons').select('*')
  if (err) error.value = err.message
  else sermons.value = data ?? []
  loading.value = false
})()

const sortDesc = ref(true)
const sortOptions = [
  { label: '최신순', value: true },
  { label: '오래된 순', value: false },
]
const sortedSermons = computed(() =>
  [...sermons.value].sort((a, b) => sortDesc.value ? b.id - a.id : a.id - b.id)
)

// 페이지네이션
const pageSize = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(sortedSermons.value.length / pageSize)))
const pagedSermons = computed(() =>
  sortedSermons.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
)
const pageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1)
)

// 정렬 변경 또는 목록 길이 변화 시 페이지 보정
watch([sortDesc, totalPages], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})
watch(sortDesc, () => { currentPage.value = 1 })

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

const showModal = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const form = ref({ title: '', scripture: '', preacher: '', date: '', link: '' })

const showEditModal = ref(false)
const editSaving = ref(false)
const editErrorMsg = ref('')
const editingId = ref<number | null>(null)
const editForm = ref({ title: '', scripture: '', preacher: '', date: '', link: '' })

function openEditModal(sermon: SermonItem) {
  editingId.value = sermon.id
  editForm.value = { title: sermon.title, scripture: sermon.scripture, preacher: sermon.preacher, date: sermon.date, link: sermon.link ?? '' }
  editErrorMsg.value = ''
  showEditModal.value = true
}

async function handleEditSubmit() {
  if (!editingId.value) return
  editSaving.value = true
  editErrorMsg.value = ''
  try {
    const { error: err } = await supabase.from('sermons').update({
      title: editForm.value.title,
      scripture: editForm.value.scripture,
      preacher: editForm.value.preacher,
      date: editForm.value.date,
      link: editForm.value.link || null,
    }).eq('id', editingId.value)
    if (err) throw err
    const idx = sermons.value.findIndex(s => s.id === editingId.value)
    if (idx !== -1) sermons.value[idx] = { ...sermons.value[idx], ...editForm.value, link: editForm.value.link || undefined }
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
      .from('sermons')
      .insert({ title: form.value.title, scripture: form.value.scripture, preacher: form.value.preacher, date: form.value.date, link: form.value.link || null })
    if (err) throw err
    const { data } = await supabase.from('sermons').select('*')
    if (data) sermons.value = data
    showModal.value = false
    form.value = { title: '', scripture: '', preacher: '', date: '', link: '' }
  } catch (e: unknown) {
    errorMsg.value = (e as any)?.message ?? String(e)
  } finally {
    saving.value = false
  }
}
</script>
