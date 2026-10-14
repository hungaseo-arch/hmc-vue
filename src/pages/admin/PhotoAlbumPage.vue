<template>
  <TheLayout>
    <PageHeader title="포토앨범" subtitle="한마음교회의 소중한 순간들을 담았습니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-5xl">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">앨범 목록</h2>
          <!--
            교인이면 버튼은 모두에게 보인다. 작성 허용(T27)을 받지 못한 분은
            등록 대신 신청 모달이 열린다 - 버튼을 숨기면 방법이 있는 줄도 모른다.
          -->
          <button
            v-if="accessLevel >= 1"
            class="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition"
            @click="openCreate"
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
        <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <div
            v-for="(album, i) in visibleItems"
            :key="album.id"
            class="relative bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 group animate-fade-in-up"
            :style="{ animationDelay: `${Math.min(i, 11) * 0.08}s` }"
          >
            <div class="relative overflow-hidden h-32 sm:h-48">
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
            <div class="p-3 sm:p-4">
              <RouterLink
                :to="`/community/photos/${album.id}`"
                class="before:absolute before:inset-0 before:content-[''] before:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span v-if="album.title" class="block text-sm font-medium text-foreground mb-1 line-clamp-2">{{ album.title }}</span>
                <span class="block text-xs text-muted-foreground">{{ album.date }}</span>
              </RouterLink>
            </div>
            <button
              v-if="canManageOwn(album.authorId, album.createdAt)"
              class="icon-btn absolute top-2 right-2 z-10 bg-white/90 shadow hover:bg-white"
              :aria-label="`${album.title || album.date} 앨범 수정`"
              @click.stop="openEditModal(album)"
            >
              <Pencil class="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <!-- 앨범이 수십 개라 한 번에 다 그리면 모바일에서 페이지가 2만 px 를 넘는다. 18개씩. -->
        <div v-if="!loading && !error && visibleCount < items.length" class="mt-8 text-center">
          <button
            type="button"
            class="inline-flex items-center justify-center min-h-11 rounded-lg border border-border bg-white px-6 text-sm font-medium hover:bg-muted transition"
            @click="visibleCount += PAGE_STEP"
          >
            더 보기 ({{ items.length - visibleCount }}개 남음)
          </button>
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
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto">
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
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-xl max-h-[90dvh] overflow-y-auto">
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

      <!-- 앨범 작성 신청. 작성 허용을 받지 못한 교인이 [새 앨범 등록]을 누르면 열린다. -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
      <div
        v-if="showRequestModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photoalbum-request-title"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeRequest"
      >
        <div class="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-xl max-h-[90dvh] overflow-y-auto">
          <h3 id="photoalbum-request-title" class="text-lg font-bold mb-4">포토앨범 작성 신청</h3>

          <div class="mb-6 rounded-xl bg-secondary px-5 py-4 text-sm leading-relaxed text-secondary-foreground space-y-2">
            <p>포토앨범은 <strong>교회에서 확인한 교인</strong>만 올릴 수 있습니다.</p>
            <p>아래에 <strong>실명·전화번호·직분</strong>을 적어 신청해 주세요. <strong>관리자 승인이 끝나면</strong> 바로 앨범을 올릴 수 있습니다.</p>
          </div>

          <p v-if="requestDone" role="status" class="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm leading-relaxed text-green-800">
            신청이 접수되었습니다. 관리자 승인을 기다려 주세요.
          </p>
          <p v-else-if="requestedAt" class="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm leading-relaxed text-amber-900">
            {{ longDateTime(requestedAt) }}에 신청하셨습니다. 관리자 승인을 기다리는 중입니다. 정보를 고쳐 다시 보내셔도 됩니다.
          </p>

          <form class="space-y-4" @submit.prevent="submitRequest">
            <div>
              <label for="photoalbum-req-name" class="block text-sm font-medium mb-1.5">실명 <span class="text-red-500" aria-hidden="true">*</span></label>
              <input id="photoalbum-req-name" v-model="requestForm.name" required type="text" autocomplete="name" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="photoalbum-req-phone" class="block text-sm font-medium mb-1.5">전화번호 <span class="text-red-500" aria-hidden="true">*</span></label>
              <input id="photoalbum-req-phone" v-model="requestForm.phone" required type="tel" autocomplete="tel" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <div>
              <label for="photoalbum-req-position" class="block text-sm font-medium mb-1.5">직분</label>
              <input id="photoalbum-req-position" v-model="requestForm.position" type="text" placeholder="예: 집사, 권사, 성도" class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>
            <p v-if="requestError" role="alert" class="text-sm text-red-500">{{ requestError }}</p>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition" @click="closeRequest">닫기</button>
              <button type="submit" :disabled="requestSaving" class="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                {{ requestSaving ? '보내는 중...' : requestedAt ? '다시 신청' : '신청하기' }}
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
import { longDateTime } from '@/lib/jakarta'

const { profile, accessLevel, isSuperAdmin, canManageOwn, canWriteAlbum, refreshProfile } = useAuth()
const { items, loading, error, fetchAlbums, reset } = usePhotoAlbum()
fetchAlbums()

const PAGE_STEP = 18
const visibleCount = ref(PAGE_STEP)
const visibleItems = computed(() => items.value.slice(0, visibleCount.value))

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
    // 제목 저장. 정보 행이 없는 옛 앨범은 슈퍼관리자만 고칠 수 있고, 그때는
    // 행을 새로 만들어야 하므로 upsert. 나머지는 이미 있는 내 행만 고친다.
    const title = editForm.value.title.trim()
    await mustAffectRows('앨범 수정', isSuperAdmin.value
      ? supabase.from('photo_album_meta').upsert({ id: editingId.value, title }).select('id')
      : supabase.from('photo_album_meta').update({ title }).eq('id', editingId.value).select('id'))
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

/*
  작성 허용을 받은 분은 바로 등록 모달, 아니면 신청 모달. 관리자가 방금
  허용했을 수 있으니 판정 전에 프로필을 새로 받는다.
*/
async function openCreate() {
  if (!canWriteAlbum.value) await refreshProfile().catch(() => {})
  if (canWriteAlbum.value) {
    showModal.value = true
    return
  }
  requestForm.value = {
    name: profile.value?.name ?? '',
    phone: profile.value?.phone ?? '',
    position: profile.value?.position ?? '',
  }
  requestError.value = ''
  requestDone.value = false
  showRequestModal.value = true
}

const showRequestModal = ref(false)
const requestSaving = ref(false)
const requestError = ref('')
const requestDone = ref(false)
const requestForm = ref({ name: '', phone: '', position: '' })
const requestedAt = computed(() => profile.value?.album_writer_requested_at ?? null)

function closeRequest() {
  showRequestModal.value = false
}

async function submitRequest() {
  requestSaving.value = true
  requestError.value = ''
  const { error: e } = await supabase.rpc('request_album_writer', {
    p_name: requestForm.value.name,
    p_phone: requestForm.value.phone,
    p_position: requestForm.value.position,
  })
  if (e) {
    console.warn('[포토앨범] 작성 신청 실패:', e.message)
    requestError.value = /[가-힣]/.test(e.message) ? e.message : '신청하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } else {
    requestDone.value = true
    await refreshProfile().catch(() => {})
  }
  requestSaving.value = false
}

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
  const numId = Date.now()
  const base = `${form.value.date}_${numId}`
  const uploaded: string[] = []
  let created = false
  try {
    // 올리기 전에 브라우저에서 300 KB 아래로 줄인다. imageCompress 설명 참고.
    const ready = await compressImages(files, (d, t) => {
      uploadProgress.value = `사진 줄이는 중... (${d}/${t})`
    })
    const summary = sizeSummary(files, ready)
    /*
      정보 행을 먼저 만든다(T24). 사진 업로드 권한을 서버가 '이 앨범의
      작성자인가' 로 판정하므로, 행이 먼저 있어야 한다. 작성자·올린 시각은
      트리거가 채운다.
    */
    await mustAffectRows('앨범 등록',
      supabase.from('photo_album_meta').insert({
        id: base,
        title: form.value.title.trim(),
      }).select('id'))
    created = true
    for (let i = 0; i < ready.length; i++) {
      const ext = ready[i].name.split('.').pop()
      const name = `${base}_p${String(i + 1).padStart(2, '0')}.${ext}`
      uploadProgress.value = `업로드 중... (${i + 1}/${ready.length})${summary}`
      const { error: err } = await supabase.storage.from('photoAlbum').upload(name, ready[i])
      if (err) throw err
      uploaded.push(name)
    }
    reset()
    await fetchAlbums()
    closeModal()
  } catch (e: unknown) {
    errorMsg.value = errorMessage(e)
    // 중간에 끊기면 반쯤 올라간 앨범을 걷어 낸다. 남겨 두면 사진 몇 장짜리
    // 앨범이 목록에 뜬다. 걷어 내기마저 실패하면 콘솔에만 남긴다 - 사용자에게
    // 보일 오류는 이미 위에 있다.
    if (created) {
      if (uploaded.length) {
        const { error: rmErr } = await supabase.storage.from('photoAlbum').remove(uploaded)
        if (rmErr) console.warn('[포토앨범] 실패한 등록의 사진 정리 실패:', rmErr.message)
      }
      const { error: delErr } = await supabase.from('photo_album_meta').delete().eq('id', base)
      if (delErr) console.warn('[포토앨범] 실패한 등록의 정보 정리 실패:', delErr.message)
    }
  } finally {
    saving.value = false
    uploadProgress.value = ''
  }
}

// Esc 로 모달 닫기
useEscapeToClose([
  { isOpen: () => showModal.value, close: closeModal },
  { isOpen: () => showRequestModal.value, close: closeRequest },
  { isOpen: () => showEditModal.value, close: () => (showEditModal.value = false) },
])
</script>
