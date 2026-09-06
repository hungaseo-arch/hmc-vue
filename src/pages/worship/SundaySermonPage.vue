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
        <!-- 검색·필터 결과가 없을 때 빈 표만 남지 않도록. -->
        <EmptyState
          v-else-if="pagedSermons.length === 0"
          :icon="BookOpen"
          title="설교가 없습니다"
          description="조건에 맞는 설교를 찾지 못했습니다. 다른 조건으로 찾아보세요."
        />
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
                  <!--
                    <tr> 은 <a> 로 감쌀 수 없으니 제목에 진짜 링크를 건다.
                    키보드·새 탭 열기·크롤링은 이 링크가 담당하고, 행 전체 클릭은
                    마우스 편의로 남긴다. .stop 이 없으면 같은 곳으로 두 번 간다.
                  -->
                  <td class="py-4 px-4 font-medium truncate">
                    <RouterLink
                      :to="`/worship/sunday-sermon/${sermon.id}`"
                      class="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      @click.stop
                    >{{ sermon.title }}</RouterLink>
                  </td>
                  <td class="py-4 px-4 text-muted-foreground hidden sm:table-cell">{{ sermon.scripture }}</td>
                  <td class="py-4 px-4 text-muted-foreground hidden md:table-cell">{{ sermon.preacher }}</td>
                  <td class="py-4 px-4 text-muted-foreground text-right text-xs whitespace-nowrap">{{ sermon.date }}</td>
                  <td v-if="isAdmin" class="py-4 px-4" @click.stop>
                    <button
                      class="p-1.5 rounded-lg hover:bg-muted transition"
                      :aria-label="`${sermon.title} 수정`"
                      @click="openEditModal(sermon)"
                    >
                      <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ThePagination v-if="!loading && !error" v-model="currentPage" :total-pages="totalPages" />
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
        aria-labelledby="sundaysermon-showModal-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showModal = false"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 id="sundaysermon-showModal-title" class="text-lg font-bold mb-6">새 설교 등록</h3>
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label for="sundaysermonpage-form-title" class="block text-sm font-medium mb-1.5">제목</label>
              <input id="sundaysermonpage-form-title" v-model="form.title" required type="text" placeholder="설교 제목" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="sundaysermonpage-form-scripture" class="block text-sm font-medium mb-1.5">본문</label>
                <input id="sundaysermonpage-form-scripture" v-model="form.scripture" required type="text" placeholder="요 3:16" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
              <div>
                <label for="sundaysermonpage-form-preacher" class="block text-sm font-medium mb-1.5">설교자</label>
                <input id="sundaysermonpage-form-preacher" v-model="form.preacher" required type="text" placeholder="담임목사" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
            </div>
            <div>
              <label for="sundaysermonpage-form-date" class="block text-sm font-medium mb-1.5">날짜</label>
              <input id="sundaysermonpage-form-date" v-model="form.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="sundaysermonpage-form-link" class="block text-sm font-medium mb-1.5">링크 (선택)</label>
              <input id="sundaysermonpage-form-link" v-model="form.link" type="url" placeholder="https://youtube.com/..." class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
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
        aria-labelledby="sundaysermon-showEditModal-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showEditModal = false"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
          <h3 id="sundaysermon-showEditModal-title" class="text-lg font-bold mb-6">설교 수정</h3>
          <form class="space-y-4" @submit.prevent="handleEditSubmit">
            <div>
              <label for="sundaysermonpage-editform-title" class="block text-sm font-medium mb-1.5">제목</label>
              <input id="sundaysermonpage-editform-title" v-model="editForm.title" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="sundaysermonpage-editform-scripture" class="block text-sm font-medium mb-1.5">본문</label>
                <input id="sundaysermonpage-editform-scripture" v-model="editForm.scripture" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
              <div>
                <label for="sundaysermonpage-editform-preacher" class="block text-sm font-medium mb-1.5">설교자</label>
                <input id="sundaysermonpage-editform-preacher" v-model="editForm.preacher" required type="text" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
            </div>
            <div>
              <label for="sundaysermonpage-editform-date" class="block text-sm font-medium mb-1.5">날짜</label>
              <input id="sundaysermonpage-editform-date" v-model="editForm.date" required type="date" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="sundaysermonpage-editform-link" class="block text-sm font-medium mb-1.5">링크 (선택)</label>
              <input id="sundaysermonpage-editform-link" v-model="editForm.link" type="url" placeholder="https://youtube.com/..." class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
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
import { useRouter } from 'vue-router'
import { BookOpen, Plus, Pencil } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ThePagination from '@/components/ThePagination.vue'
import { supabase } from '@/lib/supabase'
import { mustAffectRows } from '@/lib/db'
import { useAuth } from '@/composables/useAuth'
import { useEscapeToClose } from '@/composables/useEscapeToClose'
import { useSermons } from '@/composables/useSermons'
import { usePageQuery } from '@/composables/usePageQuery'
import type { SermonItem } from '@/lib/index'

const router = useRouter()
const { isAdmin } = useAuth()

function goToDetail(id: number) {
  router.push(`/worship/sunday-sermon/${id}`)
}

// 홈과 같은 캐시를 쓴다. 홈을 거쳐 왔다면 요청이 아예 나가지 않는다.
const { items: sermons, loading, error, fetchSermons, refresh, patch } = useSermons()
void fetchSermons()

const sortDesc = ref(true)
const sortOptions = [
  { label: '최신순', value: true },
  { label: '오래된 순', value: false },
]
// 캐시는 id 내림차순으로 들어온다. 오래된 순은 뒤집기만 하면 된다.
const sortedSermons = computed(() =>
  sortDesc.value ? sermons.value : [...sermons.value].reverse()
)

// 페이지네이션 (전체가 gzip 6.7KB 라 한 번 받아 클라이언트에서 나눈다)
const pageSize = 10
const currentPage = usePageQuery()
const totalPages = computed(() => Math.max(1, Math.ceil(sortedSermons.value.length / pageSize)))
const pagedSermons = computed(() =>
  sortedSermons.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
)

// 정렬 변경 또는 목록 길이 변화 시 페이지 보정
watch(totalPages, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})
watch(sortDesc, () => { currentPage.value = 1 })

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
    // RLS 로 걸린 UPDATE 는 오류 없이 0행을 반환한다. mustAffectRows 가 그걸 잡아낸다.
    await mustAffectRows('설교 수정',
      supabase.from('sermons').update({
        title: editForm.value.title,
        scripture: editForm.value.scripture,
        preacher: editForm.value.preacher,
        date: editForm.value.date,
        link: editForm.value.link || null,
      }).eq('id', editingId.value).select('id'))
    patch(editingId.value, { ...editForm.value, link: editForm.value.link || undefined })
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
    await mustAffectRows('설교 등록',
      supabase
        .from('sermons')
        .insert({ title: form.value.title, scripture: form.value.scripture, preacher: form.value.preacher, date: form.value.date, link: form.value.link || null })
        .select('id'))
    await refresh()
    currentPage.value = 1
    showModal.value = false
    form.value = { title: '', scripture: '', preacher: '', date: '', link: '' }
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
