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
            @click="openCreateModal"
          >
            <Plus class="w-4 h-4" />
            새 칼럼 작성
          </button>
        </div>

        <div v-if="loading" class="text-center py-12 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-12 text-red-500">{{ error }}</div>

        <EmptyState
          v-else-if="columns.length === 0"
          :icon="BookOpen"
          title="목회칼럼 준비 중"
          description="목회칼럼 내용이 곧 업데이트될 예정입니다."
        />

        <div v-else class="space-y-4">
          <!--
            role="link" + tabindex 로 흉내내던 것을 진짜 RouterLink 로 바꾼다.
            제목에 링크를 걸고 before 로 카드 전체를 덮어, 카드 아무 데나 눌러도
            열리면서 새 탭 열기·주소 복사·크롤링이 모두 된다.
          -->
          <div
            v-for="col in columns"
            :key="col.id"
            class="relative bg-white rounded-2xl shadow-sm border border-border px-7 py-6 hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-base mb-2 truncate">
                  <RouterLink
                    :to="`/worship/pastoral-column/${col.id}`"
                    class="before:absolute before:inset-0 before:content-[''] before:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >{{ cleanTitle(col.title) }}</RouterLink>
                </h3>
                <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{{ cleanExcerpt(col.excerpt) }}</p>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="text-xs text-muted-foreground">{{ formatDate(col.created_at) }}</span>
                <div class="flex items-center gap-1">
                  <!-- relative z-10: 카드를 덮는 링크(before) 위로 올려야 눌린다. -->
                  <button
                    v-if="isAdmin"
                    class="icon-btn relative z-10"
                    :aria-label="`${cleanTitle(col.title)} 수정`"
                    @click.stop="openEditModal(col)"
                  >
                    <Pencil class="w-4 h-4 text-muted-foreground" />
                  </button>
                  <ChevronRight class="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <ThePagination v-if="!loading && !error" :model-value="currentPage" :total-pages="totalPages" />
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
        v-if="showModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pastoralcolumn-showModal-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showModal = false"
      >
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto">
          <h3 id="pastoralcolumn-showModal-title" class="text-lg font-bold mb-6">새 칼럼 작성</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label for="pastoralcolumnpage-form-title" class="block text-sm font-medium mb-1.5">제목</label>
              <input id="pastoralcolumnpage-form-title" v-model="form.title" required type="text" placeholder="칼럼 제목" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="pastoralcolumnpage-form-date" class="block text-sm font-medium mb-1.5">날짜</label>
              <input id="pastoralcolumnpage-form-date" v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="pastoralcolumnpage-form-content" class="block text-sm font-medium mb-1.5">내용</label>
              <textarea id="pastoralcolumnpage-form-content" v-model="form.content" required rows="8" placeholder="칼럼 내용을 입력하세요..." class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
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
        aria-labelledby="pastoralcolumn-showEditModal-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showEditModal = false"
      >
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto">
          <h3 id="pastoralcolumn-showEditModal-title" class="text-lg font-bold mb-6">칼럼 수정</h3>
          <form class="space-y-4" @submit.prevent="handleEditSubmit">
            <div>
              <label for="pastoralcolumnpage-editform-title" class="block text-sm font-medium mb-1.5">제목</label>
              <input id="pastoralcolumnpage-editform-title" v-model="editForm.title" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="pastoralcolumnpage-editform-date" class="block text-sm font-medium mb-1.5">날짜</label>
              <input id="pastoralcolumnpage-editform-date" v-model="editForm.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="pastoralcolumnpage-editform-content" class="block text-sm font-medium mb-1.5">내용</label>
              <textarea id="pastoralcolumnpage-editform-content" v-model="editForm.content" required rows="8" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
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
import { errorMessage } from '@/lib/errors'
import { ref, computed, watch } from 'vue'
import { BookOpen, ChevronRight, Plus, Pencil } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ThePagination from '@/components/ThePagination.vue'
import { supabase } from '@/lib/supabase'
import { mustAffectRows } from '@/lib/db'
import { useAuth } from '@/composables/useAuth'
import { useEscapeToClose } from '@/composables/useEscapeToClose'
import { usePastoralColumns, PAGE_SIZE } from '@/composables/usePastoralColumns'
import { usePageQuery } from '@/composables/usePageQuery'
import type { PastoralColumnListItem } from '@/lib/index'

const { isAdmin } = useAuth()

const {
  items: columns, total, loading, error,
  fetchPage, invalidate, fetchContent,
} = usePastoralColumns()

const currentPage = usePageQuery()
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

watch(currentPage, page => { void fetchPage(page) }, { immediate: true })

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function cleanTitle(title: string): string {
  return title.replace(/^\d{4}\.\d{1,2}\.?\s*\d{1,2}\.?\s*/, '').trim()
}

// 태그 제거는 DB 생성 컬럼이 이미 했다. 여기서는 머리말만 걷어낸다.
function cleanExcerpt(excerpt: string | null): string {
  if (!excerpt) return ''
  return excerpt.replace(/^고목사의 짧은 단상\s*/, '').trim()
}

const showModal = ref(false)
const saving = ref(false)
const errorMsg = ref('')
// 칼럼 제목은 사실상 항상 이 하나다. 매번 손으로 치지 않도록 미리 채워 둔다.
// 다른 제목을 쓰고 싶으면 그냥 지우고 쓰면 된다.
const DEFAULT_TITLE = '고목사의 짧은 단상'

const form = ref({ title: DEFAULT_TITLE, date: '', content: '' })

function openCreateModal() {
  form.value = { title: DEFAULT_TITLE, date: '', content: '' }
  errorMsg.value = ''
  showModal.value = true
}

const showEditModal = ref(false)
const editSaving = ref(false)
const editErrorMsg = ref('')
const editingId = ref<number | null>(null)
const editForm = ref({ title: '', date: '', content: '' })

async function openEditModal(col: PastoralColumnListItem) {
  editingId.value = col.id
  // 목록에는 발췌만 있다. 수정하려면 본문을 따로 받아야 한다.
  editForm.value = { title: col.title, date: col.created_at ? col.created_at.slice(0, 10) : '', content: '' }
  editErrorMsg.value = ''
  showEditModal.value = true
  try {
    editForm.value.content = await fetchContent(col.id)
  } catch (e: unknown) {
    editErrorMsg.value = errorMessage(e)
  }
}

async function handleEditSubmit() {
  if (!editingId.value) return
  editSaving.value = true
  editErrorMsg.value = ''
  try {
    // RLS 로 걸린 UPDATE 는 오류 없이 0행을 반환한다. mustAffectRows 가 그걸 잡아낸다.
    await mustAffectRows('칼럼 수정',
      supabase.from('pastorColumn').update({
        title: editForm.value.title,
        content: editForm.value.content,
        created_at: new Date(editForm.value.date).toISOString(),
      }).eq('id', editingId.value).select('id'))
    // excerpt 는 생성 컬럼이라 서버가 다시 계산한다. 다시 받아야 목록이 맞다.
    await invalidate(currentPage.value)
    showEditModal.value = false
  } catch (e: unknown) {
    editErrorMsg.value = errorMessage(e)
  } finally {
    editSaving.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  errorMsg.value = ''
  try {
    await mustAffectRows('칼럼 등록',
      supabase
        .from('pastorColumn')
        .insert({
          title: form.value.title,
          content: form.value.content,
          created_at: form.value.date ? new Date(form.value.date).toISOString() : new Date().toISOString(),
        })
        .select('id'))
    currentPage.value = 1
    await invalidate(1)
    showModal.value = false
    form.value = { title: DEFAULT_TITLE, date: '', content: '' }
  } catch (e: unknown) {
    errorMsg.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

// Esc 로 모달 닫기
useEscapeToClose([
  { isOpen: () => showModal.value, close: () => (showModal.value = false) },
  { isOpen: () => showEditModal.value, close: () => (showEditModal.value = false) },
])
</script>
