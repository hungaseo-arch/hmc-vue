<template>
  <TheLayout>
    <PageHeader title="주보보기" subtitle="이번 주 주보를 확인하세요" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="flex items-center justify-between gap-4 flex-wrap mb-6">
          <h2 class="text-xl font-bold shrink-0">주보 목록</h2>
          <!-- 연도 선택. 자료가 몇 년 치씩 쌓이면 한 화면에 다 보이는 게 오히려 찾기 어렵다. -->
          <div v-if="years.length > 1" class="flex gap-2 overflow-x-auto" role="tablist" aria-label="주보 연도 선택">
            <button
              v-for="y in years"
              :key="y"
              type="button"
              role="tab"
              :aria-selected="selectedYear === y"
              class="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              :class="selectedYear === y ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:brightness-95'"
              @click="selectedYear = y"
            >
              {{ y }}년
            </button>
          </div>
          <button
            v-if="isAdmin"
            class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition shrink-0"
            @click="showModal = true"
          >
            <Plus class="w-4 h-4" />
            주보 업로드
          </button>
        </div>

        <div v-if="loading" class="text-center py-12 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>

        <EmptyState
          v-else-if="bulletinGroups.length === 0"
          :icon="FileText"
          title="주보 준비 중"
          description="주보가 곧 업로드될 예정입니다."
        />

        <div v-else>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="(group, i) in visibleGroups"
              :key="group.date"
              class="relative bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 group animate-fade-in-up"
              :style="{ animationDelay: `${i * 0.08}s` }"
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
                <!-- before 로 카드 전체를 덮는 진짜 링크. 새 탭 열기·주소 복사가 된다. -->
                <div class="min-w-0">
                  <h3 class="font-semibold text-sm truncate">
                    <RouterLink
                      :to="`/community/bulletin/${group.date}`"
                      class="before:absolute before:inset-0 before:content-[''] before:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >{{ group.label }}</RouterLink>
                  </h3>
                  <p class="text-xs text-muted-foreground mt-0.5">{{ group.pageCount }}페이지</p>
                </div>
              </div>
              <div v-if="isAdmin" class="absolute top-2 right-2 z-10 flex gap-1" @click.stop>
                <button
                  class="p-1.5 bg-white/90 rounded-lg shadow hover:bg-white transition"
                  :aria-label="`${group.label} 주보 교체`"
                  @click="openReplaceModal(group)"
                >
                  <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  class="p-1.5 bg-white/90 rounded-lg shadow hover:bg-red-50 transition"
                  :aria-label="`${group.label} 주보 삭제`"
                  @click="handleDelete(group.date)"
                >
                  <Trash2 class="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <!-- 파일 교체 모달 -->
      <!--
        바깥을 눌러 닫는 모달. role="dialog" 라 키보드 사용자는 ESC(useEscapeToClose)와
        안의 닫기 버튼으로 닫는다. 바깥 클릭은 마우스 편의 기능이라 여기에
        키보드 핸들러를 더 달 이유가 없다.
      -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
      <div
        v-if="showReplaceModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulletin-showReplaceModal-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeReplaceModal"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 id="bulletin-showReplaceModal-title" class="text-lg font-bold mb-2">주보 파일 교체</h3>
          <p class="text-sm text-muted-foreground mb-6">{{ replacingLabel }} — 기존 파일을 삭제하고 새 파일로 교체합니다.</p>
          <form class="space-y-4" @submit.prevent="handleReplace">
            <div>
              <label for="bulletinpage-field-1" class="block text-sm font-medium mb-1.5">새 파일 선택</label>
              <input id="bulletinpage-field-1" ref="replaceFileInput" required type="file" multiple accept="image/*,.pdf" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
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
        aria-labelledby="bulletin-showModal-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 id="bulletin-showModal-title" class="text-lg font-bold mb-6">주보 업로드</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label for="bulletinpage-form-date" class="block text-sm font-medium mb-1.5">주보 날짜</label>
              <input id="bulletinpage-form-date" v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="bulletinpage-field-2" class="block text-sm font-medium mb-1.5">파일 선택 (여러 페이지는 순서대로 선택)</label>
              <input id="bulletinpage-field-2" ref="fileInput" required type="file" multiple accept="image/*,.pdf" class="w-full border border-border rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition" />
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
import { errorMessage } from '@/lib/errors'
import { ref, computed } from 'vue'
import { FileText, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { supabase } from '@/lib/supabase'
import { mustRemoveFiles } from '@/lib/db'
import { compressImages, sizeSummary } from '@/lib/imageCompress'
import { useAuth } from '@/composables/useAuth'
import { useEscapeToClose } from '@/composables/useEscapeToClose'

interface BulletinGroup {
  date: string
  label: string
  pageCount: number
}

const { isAdmin } = useAuth()
const bulletinGroups = ref<BulletinGroup[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const BUCKET = 'weeklyBulletin'

const years = computed(() => [...new Set(bulletinGroups.value.map(g => g.date.slice(0, 4)))])
const selectedYear = ref('')
const visibleGroups = computed(() => bulletinGroups.value.filter(g => g.date.slice(0, 4) === selectedYear.value))

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
    // 카드 썸네일은 CSS 그라디언트(getThumbnailBg)라 이미지 URL 이 필요 없다.
    .map(([date, fileNames]) => ({
      date,
      label: formatDateLabel(date),
      pageCount: fileNames.length,
    }))

  if (!selectedYear.value || !years.value.includes(selectedYear.value)) {
    selectedYear.value = years.value[0] ?? ''
  }

  loading.value = false
}

fetchBulletins()

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

  const dateFormatted = form.value.date.replace(/-/g, '')

  /*
    주보 파일 이름은 날짜만으로 정해진다(20260809-p01.jpg). 예전에는 같은
    날짜로 다시 올리면 확장자가 같아 덮어써졌지만, 이제 압축을 거치면서
    .webp 로 바뀌기 때문에 옛 .jpg 가 그대로 남아 같은 장이 두 번 보이게 된다.
    같은 날짜는 '교체' 로 보낸다. 교체는 기존 파일을 먼저 지우고 올린다.
  */
  if (bulletinGroups.value.some(g => g.date === dateFormatted)) {
    errorMsg.value = '이미 등록된 날짜입니다. 목록에서 해당 주보의 [교체]를 눌러주세요.'
    return
  }

  saving.value = true
  errorMsg.value = ''
  try {
    // 올리기 전에 브라우저에서 300 KB 아래로 줄인다. PDF 는 그대로 지나간다.
    const ready = await compressImages(files, (d, t) => {
      uploadProgress.value = `파일 줄이는 중... (${d}/${t})`
    })
    const summary = sizeSummary(files, ready)
    for (let i = 0; i < ready.length; i++) {
      const ext = ready[i].name.split('.').pop()
      const p = String(i + 1).padStart(2, '0')
      uploadProgress.value = `업로드 중... (${i + 1}/${ready.length})${summary}`
      const { error: err } = await supabase.storage.from(BUCKET).upload(`${dateFormatted}-p${p}.${ext}`, ready[i], { upsert: true })
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
  try {
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000, search: `${date}-` })
    const targets = (files ?? []).filter(f => f.name.startsWith(`${date}-`)).map(f => f.name)
    await mustRemoveFiles('주보 삭제', BUCKET, targets)
    // 삭제가 실제로 성공한 뒤에 목록에서 제거한다.
    bulletinGroups.value = bulletinGroups.value.filter(g => g.date !== date)
  } catch (e: unknown) {
    alert(errorMessage(e))
  }
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
    // 기존 파일 삭제 — 실패하면 여기서 멈춘다. 예전에는 조용히 무시하고
    // 업로드로 넘어가 "이미 존재함" 오류가 나던 자리다.
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000, search: `${replacingDate.value}-` })
    const targets = (existing ?? []).filter(f => f.name.startsWith(`${replacingDate.value}-`)).map(f => f.name)
    replaceProgress.value = '기존 파일 삭제 중...'
    await mustRemoveFiles('주보 삭제', BUCKET, targets)
    // 새 파일 업로드. 올리기 전에 300 KB 아래로 줄인다. PDF 는 그대로 지나간다.
    const ready = await compressImages(files, (d, t) => {
      replaceProgress.value = `파일 줄이는 중... (${d}/${t})`
    })
    const summary = sizeSummary(files, ready)
    for (let i = 0; i < ready.length; i++) {
      const ext = ready[i].name.split('.').pop()
      const p = String(i + 1).padStart(2, '0')
      replaceProgress.value = `업로드 중... (${i + 1}/${ready.length})${summary}`
      const { error: err } = await supabase.storage.from(BUCKET).upload(`${replacingDate.value}-p${p}.${ext}`, ready[i], { upsert: true })
      if (err) throw err
    }
    await fetchBulletins()
    closeReplaceModal()
  } catch (e: unknown) {
    replaceErrorMsg.value = errorMessage(e)
  } finally {
    replaceSaving.value = false
    replaceProgress.value = ''
  }
}

// Esc 로 모달 닫기
useEscapeToClose([
  { isOpen: () => showModal.value, close: closeModal },
  { isOpen: () => showReplaceModal.value, close: closeReplaceModal },
])
</script>
