<template>
  <TheLayout>
    <PageHeader title="주보보기" subtitle="이번 주 주보를 확인하세요" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">주보 목록</h2>
          <button
            v-if="isAdmin"
            class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
            @click="showModal = true"
          >
            <Plus class="w-4 h-4" />
            주보 업로드
          </button>
        </div>

        <div v-if="loading" class="text-center py-12 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>

        <div v-else-if="bulletinGroups.length === 0" class="bg-white rounded-2xl shadow-sm border border-border p-12 text-center">
          <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-xl font-semibold mb-3">주보 준비 중</h3>
          <p class="text-muted-foreground">주보가 곧 업로드될 예정입니다.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(group, i) in bulletinGroups"
            :key="group.date"
            class="relative bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer group animate-fade-in-up"
            :style="{ animationDelay: `${i * 0.08}s` }"
            @click="goToDetail(group.date)"
          >
            <div
              class="relative h-48 overflow-hidden flex items-center justify-center transition-all duration-300"
              :style="{ background: getThumbnailBg(group.date) }"
            >
              <span class="text-lg font-semibold text-slate-500 group-hover:text-slate-700 transition-colors duration-300">주보 보기</span>
            </div>
            <div class="p-5 flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText class="w-4 h-4 text-primary" />
              </div>
              <div class="min-w-0">
                <h3 class="font-semibold text-sm truncate">{{ group.label }}</h3>
                <p class="text-xs text-muted-foreground mt-0.5">{{ group.pageCount }}페이지</p>
              </div>
            </div>
            <div v-if="isAdmin" class="absolute top-2 right-2 flex gap-1" @click.stop>
              <button class="p-1.5 bg-white/90 rounded-lg shadow hover:bg-white transition" @click="openReplaceModal(group)">
                <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button class="p-1.5 bg-white/90 rounded-lg shadow hover:bg-red-50 transition" @click="handleDelete(group.date)">
                <Trash2 class="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <!-- 파일 교체 모달 -->
      <div
        v-if="showReplaceModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeReplaceModal"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 class="text-lg font-bold mb-2">주보 파일 교체</h3>
          <p class="text-sm text-muted-foreground mb-6">{{ replacingLabel }} — 기존 파일을 삭제하고 새 파일로 교체합니다.</p>
          <form class="space-y-4" @submit.prevent="handleReplace">
            <div>
              <label class="block text-sm font-medium mb-1.5">새 파일 선택</label>
              <input ref="replaceFileInput" required type="file" multiple accept="image/*,.pdf" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
            </div>
            <p v-if="replaceProgress" class="text-sm text-muted-foreground">{{ replaceProgress }}</p>
            <p v-if="replaceErrorMsg" class="text-sm text-red-500">{{ replaceErrorMsg }}</p>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition" @click="closeReplaceModal">취소</button>
              <button type="submit" :disabled="replaceSaving" class="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                {{ replaceSaving ? '교체 중...' : '교체' }}
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
          <h3 class="text-lg font-bold mb-6">주보 업로드</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label class="block text-sm font-medium mb-1.5">주보 날짜</label>
              <input v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">파일 선택 (여러 페이지는 순서대로 선택)</label>
              <input ref="fileInput" required type="file" multiple accept="image/*,.pdf" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
            </div>
            <p v-if="uploadProgress" class="text-sm text-muted-foreground">{{ uploadProgress }}</p>
            <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition" @click="closeModal">취소</button>
              <button type="submit" :disabled="saving" class="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                {{ saving ? '업로드 중...' : '업로드' }}
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
import { FileText, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'

interface BulletinGroup {
  date: string
  label: string
  thumbnailUrl: string
  pageCount: number
}

const router = useRouter()
const { isAdmin } = useAuth()
const bulletinGroups = ref<BulletinGroup[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const BUCKET = 'weeklyBulletin'

function formatDateLabel(date: string): string {
  const year = date.slice(0, 4)
  const month = String(parseInt(date.slice(4, 6)))
  const day = String(parseInt(date.slice(6, 8)))
  return `${year}년 ${month}월 ${day}일`
}

async function fetchBulletins() {
  loading.value = true
  error.value = null
  const { data: files, error: err } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } })

  if (err) { error.value = `[Storage 에러] ${err.message}`; loading.value = false; return }
  if (!files || files.length === 0) { error.value = '파일 목록이 비어있습니다.'; loading.value = false; return }

  const groups: Record<string, string[]> = {}
  for (const file of files ?? []) {
    const match = file.name.match(/^(\d{8})-/)
    if (match) {
      const date = match[1]
      if (!groups[date]) groups[date] = []
      groups[date].push(file.name)
    }
  }

  bulletinGroups.value = Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, fileNames]) => {
      const thumbnail = fileNames.find(f => f.includes('-p01.')) ?? fileNames[0]
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(thumbnail)
      return { date, label: formatDateLabel(date), thumbnailUrl: urlData.publicUrl, pageCount: fileNames.length }
    })

  loading.value = false
}

onMounted(fetchBulletins)

function goToDetail(date: string) {
  router.push(`/admin/bulletin/${date}`)
}

const MONTH_GRADIENTS: [string, string][] = [
  ['#ecfccb', '#a3e635'], ['#dcfce7', '#10b981'], ['#d1fae5', '#22d3ee'],
  ['#cffafe', '#0ea5e9'], ['#dbeafe', '#60a5fa'], ['#f3e8ff', '#8b5cf6'],
  ['#ecfccb', '#4ade80'], ['#d1fae5', '#34d399'], ['#cffafe', '#67e8f9'],
  ['#dbeafe', '#38bdf8'], ['#f3e8ff', '#818cf8'], ['#dcfce7', '#bef264'],
]
const YEAR_ANGLES = [135, 150, 120, 160, 110, 145]

function getThumbnailBg(date: string): string {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(4, 6)) - 1
  const [start, end] = MONTH_GRADIENTS[month]
  const angle = YEAR_ANGLES[(year - 2016 + 60) % YEAR_ANGLES.length]
  return `linear-gradient(${angle}deg, ${start}, ${end})`
}

const showModal = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const uploadProgress = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const form = ref({ date: '' })

function closeModal() {
  showModal.value = false
  form.value = { date: '' }
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
    const dateFormatted = form.value.date.replace(/-/g, '')
    for (let i = 0; i < files.length; i++) {
      const ext = files[i].name.split('.').pop()
      const p = String(i + 1).padStart(2, '0')
      uploadProgress.value = `업로드 중... (${i + 1}/${files.length})`
      const { error: err } = await supabase.storage.from(BUCKET).upload(`${dateFormatted}-p${p}.${ext}`, files[i], { upsert: true })
      if (err) throw err
    }
    await fetchBulletins()
    closeModal()
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '업로드에 실패했습니다.'
  } finally {
    saving.value = false
    uploadProgress.value = ''
  }
}

// 삭제
async function handleDelete(date: string) {
  const group = bulletinGroups.value.find(g => g.date === date)
  if (!group) return
  if (!confirm(`${group.label} 주보를 삭제하시겠습니까?`)) return
  const { data: files } = await supabase.storage.from(BUCKET).list('', { limit: 100 })
  const targets = (files ?? []).filter(f => f.name.startsWith(`${date}-`)).map(f => f.name)
  if (targets.length > 0) {
    const { error: err } = await supabase.storage.from(BUCKET).remove(targets)
    if (err) { alert(err.message); return }
  }
  bulletinGroups.value = bulletinGroups.value.filter(g => g.date !== date)
}

// 파일 교체
const showReplaceModal = ref(false)
const replaceSaving = ref(false)
const replaceErrorMsg = ref('')
const replaceProgress = ref('')
const replaceFileInput = ref<HTMLInputElement | null>(null)
const replacingDate = ref('')
const replacingLabel = ref('')

function openReplaceModal(group: BulletinGroup) {
  replacingDate.value = group.date
  replacingLabel.value = group.label
  replaceErrorMsg.value = ''
  replaceProgress.value = ''
  showReplaceModal.value = true
}

function closeReplaceModal() {
  showReplaceModal.value = false
  if (replaceFileInput.value) replaceFileInput.value.value = ''
}

async function handleReplace() {
  const files = replaceFileInput.value?.files
  if (!files || files.length === 0) { replaceErrorMsg.value = '파일을 선택해주세요.'; return }
  replaceSaving.value = true
  replaceErrorMsg.value = ''
  try {
    // 기존 파일 삭제
    const { data: existing } = await supabase.storage.from(BUCKET).list('', { limit: 100 })
    const targets = (existing ?? []).filter(f => f.name.startsWith(`${replacingDate.value}-`)).map(f => f.name)
    if (targets.length > 0) await supabase.storage.from(BUCKET).remove(targets)
    // 새 파일 업로드
    for (let i = 0; i < files.length; i++) {
      const ext = files[i].name.split('.').pop()
      const p = String(i + 1).padStart(2, '0')
      replaceProgress.value = `업로드 중... (${i + 1}/${files.length})`
      const { error: err } = await supabase.storage.from(BUCKET).upload(`${replacingDate.value}-p${p}.${ext}`, files[i])
      if (err) throw err
    }
    await fetchBulletins()
    closeReplaceModal()
  } catch (e: unknown) {
    replaceErrorMsg.value = (e as any)?.message ?? String(e)
  } finally {
    replaceSaving.value = false
    replaceProgress.value = ''
  }
}
</script>
