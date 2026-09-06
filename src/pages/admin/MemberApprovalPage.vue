<template>
  <TheLayout>
    <PageHeader title="회원 관리" subtitle="가입 신청을 확인하고 교인 명부를 관리합니다." />

    <section class="py-12">
      <div class="container mx-auto px-4 max-w-3xl">
        <!-- 탭. 기본은 '승인 대기' — 여기 들어오는 이유가 대개 그것이다. -->
        <div class="flex gap-2 mb-6" role="tablist" aria-label="회원 목록 종류">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="tab === t.key"
            class="py-2.5 flex-1 rounded-xl text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            :class="tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:brightness-95'"
            @click="tab = t.key"
          >
            {{ t.label }}<span v-if="t.key === 'pending' && pendingCount"> ({{ pendingCount }})</span>
          </button>
        </div>

        <!-- 명부 탭에서만 검색·내보내기 -->
        <div v-if="tab === 'all'" class="mb-6 flex flex-wrap gap-3">
          <label for="m-search" class="sr-only">이름, 연락처, 직분으로 찾기</label>
          <input
            id="m-search"
            v-model="keyword"
            type="search"
            placeholder="이름, 연락처, 직분으로 찾기"
            class="flex-1 min-w-60 py-2.5 border border-border rounded-xl px-4 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition"
            @click="exportCsv"
          >
            명부 CSV
          </button>
        </div>

        <!-- 모달이 떠 있으면 그 안에서 같은 안내를 보여준다. 두 곳에서 함께
             띄우면 화면 낭독기가 같은 말을 두 번 읽는다. -->
        <p v-if="errorMsg && !openMember" role="alert" class="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm leading-relaxed text-red-700">
          {{ errorMsg }}
        </p>
        <p v-if="okMsg" role="status" class="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm leading-relaxed text-green-800">
          {{ okMsg }}
        </p>

        <!--
          '회원 추가' 버튼을 두지 않는 이유를 화면에 적어 둔다. 없는 기능을
          찾아 헤매는 시간이 아깝고, 실제로 필요한 절차는 간단하기 때문이다.
          계정 생성은 본인이 카카오나 이메일로 해야 한다 — 브라우저에서 남의
          계정을 만들려면 RLS 를 통째로 우회하는 열쇠가 필요한데, 그 열쇠는
          이 사이트에 두지 않는다.
        -->
        <div v-if="tab === 'all'" class="mb-6 rounded-2xl bg-secondary px-5 py-4 text-sm leading-relaxed text-secondary-foreground">
          <p class="font-semibold mb-2">새 교인을 등록하시려면</p>
          <p>아래 주소를 알려 드리고 직접 가입하시게 한 뒤, [승인 대기] 탭에서 승인해 주세요.</p>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <code class="text-sm break-all">{{ signupUrl }}</code>
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl bg-white border border-border text-sm font-semibold hover:brightness-95 transition"
              @click="copySignupUrl"
            >
              주소 복사
            </button>
          </div>
        </div>

        <p v-if="loading" class="py-16 text-center text-sm text-muted-foreground">불러오는 중...</p>

        <p v-else-if="!visible.length" class="py-16 text-center text-sm text-muted-foreground">
          {{ tab === 'pending' ? '승인을 기다리는 분이 없습니다.' : '해당하는 회원이 없습니다.' }}
        </p>

        <ul v-else class="space-y-4">
          <li
            v-for="m in visible"
            :key="m.id"
            class="relative bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-6"
            :class="tab === 'all' ? 'transition hover:shadow-md' : ''"
          >
            <!--
              '관리' 버튼을 따로 두지 않는다. 명부에서는 카드 전체가 누르는
              자리고, 실제 조작은 모달 안에서만 일어난다. 카드를 덮는 이
              버튼은 z-10 이라 그 위에 놓인 승인·반려 버튼은 그대로 눌린다.
              (버튼 안에 버튼을 넣을 수 없어 덮개 방식을 쓴다.)
            -->
            <button
              v-if="tab === 'all'"
              type="button"
              class="absolute inset-0 z-10 rounded-2xl cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              :aria-label="`${nameOf(m)} 관리`"
              @click="openManage(m)"
            />

            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 class="text-base font-bold text-foreground">{{ m.name || '이름 미설정' }}</h2>
              <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="STATUS_STYLE[m.member_status]">
                {{ STATUS_LABEL[m.member_status] }}
              </span>
              <span v-if="levelOf(m) >= 2" class="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                관리자
              </span>
              <span v-if="m.id === myId" class="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                나
              </span>
              <!-- 카드를 누를 수 있다는 표시. 읽어 줄 내용은 덮개 버튼에 있다. -->
              <ChevronRight v-if="tab === 'all'" class="ml-auto w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>

            <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm leading-relaxed">
              <dt class="text-muted-foreground">가입 방법</dt>
              <dd class="text-foreground">{{ PROVIDER_LABEL[m.provider ?? 'email'] ?? m.provider }}</dd>
              <dt class="text-muted-foreground">신청일</dt>
              <dd class="text-foreground">{{ longDateTime(m.created_at) }}</dd>
              <template v-if="m.phone">
                <dt class="text-muted-foreground">연락처</dt>
                <dd class="text-foreground">{{ m.phone }}</dd>
              </template>
              <template v-if="m.position">
                <dt class="text-muted-foreground">직분</dt>
                <dd class="text-foreground">{{ m.position }}</dd>
              </template>
            </dl>

            <!-- 대기 중인 분에게는 승인/반려만 크게 보여준다.
                 z-20 이라 명부 탭에서도 덮개보다 위에 있다. -->
            <div v-if="m.member_status === 'pending'" class="relative z-20 mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                :disabled="busyId === m.id"
                class="py-2.5 flex-1 min-w-35 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                @click="onApprove(m)"
              >
                {{ busyId === m.id ? '처리 중...' : '승인' }}
              </button>
              <button
                type="button"
                :disabled="busyId === m.id"
                class="py-2.5 flex-1 min-w-35 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                @click="onReject(m)"
              >
                반려
              </button>
            </div>

          </li>
        </ul>
      </div>
    </section>

    <!--
      관리 기능은 모달에서만 연다. 카드 안에 펼치면 목록이 밀려 내려가
      지금 누른 분이 어디 있었는지 놓치고, 삭제·정지 버튼이 다른 분의
      카드 옆에 늘 펼쳐져 있어 잘못 누를 위험도 커진다.
    -->
    <Teleport to="body">
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
      <div
        v-if="openMember"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-title"
        @click.self="closeManage"
      >
        <div class="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <h3 id="manage-title" class="text-lg font-bold mb-6">{{ nameOf(openMember) }} 관리</h3>

          <p v-if="errorMsg" role="alert" class="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm leading-relaxed text-red-700">
            {{ errorMsg }}
          </p>

          <div class="space-y-5">
            <!-- 정보 수정 -->
            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-foreground">명부 정보</h4>
              <div>
                <label for="m-name" class="block text-sm text-muted-foreground mb-1.5">이름</label>
                <input id="m-name" v-model="edit.name" type="text" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm" />
              </div>
              <div>
                <label for="m-phone" class="block text-sm text-muted-foreground mb-1.5">연락처</label>
                <input id="m-phone" v-model="edit.phone" type="tel" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm" />
              </div>
              <div>
                <label for="m-position" class="block text-sm text-muted-foreground mb-1.5">직분</label>
                <input id="m-position" v-model="edit.position" type="text" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm" />
              </div>
              <button
                type="button"
                :disabled="busyId === openMember.id"
                class="py-2.5 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                @click="onSaveInfo(openMember)"
              >
                정보 저장
              </button>
            </div>

            <!-- 등급 -->
            <div>
              <h4 class="text-sm font-semibold text-foreground mb-3">등급</h4>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="lv in LEVELS"
                  :key="lv.value"
                  type="button"
                  :disabled="busyId === openMember.id || openMember.member_status !== 'active' || (openMember.id === myId && lv.value < 2)"
                  class="py-2.5 flex-1 min-w-35 rounded-xl text-sm font-semibold transition disabled:opacity-40"
                  :class="levelOf(openMember) === lv.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:brightness-95'"
                  @click="onLevel(openMember, lv.value)"
                >
                  {{ lv.label }}
                </button>
              </div>
              <p v-if="openMember.member_status !== 'active'" class="mt-2 text-xs text-muted-foreground">
                승인된 교인에게만 등급을 줄 수 있습니다. 먼저 [접근 허용]으로 승인해 주세요.
              </p>
              <p v-else-if="openMember.id === myId" class="mt-2 text-xs text-muted-foreground">
                자기 자신의 관리자 권한은 내릴 수 없습니다. 아무도 못 들어가는 상태를 막기 위해서입니다.
              </p>
            </div>

            <!-- 접근 정지 / 해제 -->
            <div>
              <h4 class="text-sm font-semibold text-foreground mb-3">접근</h4>
              <button
                v-if="openMember.member_status === 'active'"
                type="button"
                :disabled="busyId === openMember.id || openMember.id === myId"
                class="py-2.5 w-full rounded-xl bg-amber-100 text-amber-900 text-sm font-semibold hover:brightness-95 transition disabled:opacity-40"
                @click="onStatus(openMember, 'suspended', '정지')"
              >
                접근 정지 (되돌릴 수 있습니다)
              </button>
              <button
                v-else
                type="button"
                :disabled="busyId === openMember.id"
                class="py-2.5 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                @click="onStatus(openMember, 'active', '승인')"
              >
                접근 허용
              </button>
            </div>

            <!-- 삭제 -->
            <div>
              <h4 class="text-sm font-semibold text-red-700 mb-2">계정 삭제</h4>
              <p class="text-xs leading-relaxed text-muted-foreground mb-3">
                계정과 프로필이 완전히 사라지며 되돌릴 수 없습니다.
                잠시 막는 것이 목적이라면 위의 [접근 정지]를 써 주세요.
                접속 기록은 삭제 후에도 남습니다.
              </p>
              <button
                type="button"
                :disabled="busyId === openMember.id || openMember.id === myId"
                class="py-2.5 w-full rounded-xl border-2 border-red-300 bg-red-50 text-red-700 text-sm font-semibold hover:brightness-95 transition disabled:opacity-40"
                @click="onDelete(openMember)"
              >
                계정 삭제
              </button>
            </div>
          </div>

          <button
            type="button"
            class="mt-6 py-2.5 w-full rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition"
            @click="closeManage"
          >
            닫기
          </button>
        </div>
      </div>
    </Teleport>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { useAuth, logEvent } from '@/composables/useAuth'
import { useEscapeToClose } from '@/composables/useEscapeToClose'
import type { MemberStatus } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'
import { toCsv, downloadCsv } from '@/lib/csv'
// 신청일은 자카르타 기준으로 읽는다. 교회가 거기 있고 관리자도 거기서 본다.
import { longDateTime, todayCompact } from '@/lib/jakarta'

interface MemberRow {
  id: string
  name: string | null
  phone: string | null
  position: string | null
  role: string
  member_status: MemberStatus
  access_level: number
  provider: string | null
  created_at: string | null
}

const TABS = [
  { key: 'pending', label: '승인 대기' },
  { key: 'all', label: '회원 명부' },
] as const

const LEVELS = [
  { value: 0, label: '열람 불가' },
  { value: 1, label: '교인' },
  { value: 2, label: '관리자' },
] as const

const STATUS_LABEL: Record<MemberStatus, string> = {
  pending: '대기 중',
  active: '승인됨',
  rejected: '반려됨',
  suspended: '정지됨',
}

const STATUS_STYLE: Record<MemberStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-green-50 text-green-800',
  rejected: 'bg-red-50 text-red-700',
  suspended: 'bg-secondary text-secondary-foreground',
}

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  email: '이메일',
}

const { user } = useAuth()
const myId = computed(() => user.value?.id ?? '')

const tab = ref<'pending' | 'all'>('pending')
const keyword = ref('')
const members = ref<MemberRow[]>([])
const loading = ref(true)
const busyId = ref<string | null>(null)
const openId = ref<string | null>(null)
const errorMsg = ref('')
const okMsg = ref('')

const edit = reactive({ name: '', phone: '', position: '' })

const signupUrl = computed(() => window.location.origin + ROUTE_PATHS.SIGNUP)

/** DB 의 current_access_level() 과 같은 규칙. 둘 중 큰 쪽이 실제 권한이다. */
function levelOf(m: MemberRow): number {
  return Math.max(m.access_level ?? 0, m.role === 'admin' ? 2 : 0)
}

const STATUS_ORDER: Record<MemberStatus, number> = { pending: 0, active: 1, suspended: 2, rejected: 3 }

const pendingCount = computed(() => members.value.filter(m => m.member_status === 'pending').length)

const visible = computed(() => {
  if (tab.value === 'pending') return members.value.filter(m => m.member_status === 'pending')
  const k = keyword.value.trim().toLowerCase()
  if (!k) return members.value
  return members.value.filter(m =>
    [m.name, m.phone, m.position].some(v => (v ?? '').toLowerCase().includes(k)),
  )
})

async function load() {
  loading.value = true
  errorMsg.value = ''
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone, position, role, member_status, access_level, provider, created_at')
    .order('created_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.warn('[회원 관리] 목록 조회 실패:', error.message)
    errorMsg.value = '회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } else {
    // 대기 중을 맨 위로, 그다음 최근 신청 순. 문자열 정렬로는 'active' 가
    // 'pending' 앞에 오므로 여기서 상태별 순서를 따로 매긴다.
    const rows = (data ?? []) as MemberRow[]
    members.value = rows
      .map((m, i) => ({ m, i }))
      .sort((a, b) => (STATUS_ORDER[a.m.member_status] - STATUS_ORDER[b.m.member_status]) || (a.i - b.i))
      .map(x => x.m)
  }
  loading.value = false
}

/*
  모달은 id 만 들고 있고 내용은 목록에서 다시 찾는다. 처리 뒤 load() 로
  목록을 새로 받으면 모달에 보이는 등급·상태도 같이 최신이 된다.
*/
const openMember = computed(() => members.value.find(m => m.id === openId.value) ?? null)

function openManage(m: MemberRow) {
  openId.value = m.id
  edit.name = m.name ?? ''
  edit.phone = m.phone ?? ''
  edit.position = m.position ?? ''
}

function closeManage() {
  openId.value = null
}

useEscapeToClose([{ isOpen: () => openId.value !== null, close: closeManage }])

/*
  모든 변경은 RPC 로만 한다. 화면에서 profiles 를 직접 UPDATE 하지 않는
  이유는 두 가지다. 하나, 등급·상태 컬럼에는 클라이언트 쓰기 권한이 아예
  없다. 둘, 누가 언제 무엇을 바꿨는지를 같은 트랜잭션에서 감사 로그에
  남겨야 기록이 빠지지 않는다.
*/
async function call(fn: string, args: Record<string, unknown>, target: MemberRow, done: string) {
  busyId.value = target.id
  errorMsg.value = ''
  okMsg.value = ''
  const { error } = await supabase.rpc(fn, args)
  if (error) {
    console.warn(`[회원 관리] ${fn} 실패:`, error.message)
    // 서버가 한국어로 던진 안내는 그대로 쓰고, 그 밖에는 일반 문구로 바꾼다.
    errorMsg.value = /[가-힣]/.test(error.message)
      ? error.message
      : '처리하지 못했습니다. 권한을 확인하시고 다시 시도해 주세요.'
  } else {
    okMsg.value = `${target.name || '이름 미설정'}님을 ${done}했습니다.`
    // 끝났으면 모달을 닫는다. 열어 둔 채로는 뒤에 뜬 안내가 가려 보이지 않고,
    // 실패했을 때만 열려 있어야 무엇을 다시 해야 하는지 그 자리에서 보인다.
    closeManage()
    await load()
  }
  busyId.value = null
}

const nameOf = (m: MemberRow) => m.name || '이름 미설정'

async function onApprove(m: MemberRow) {
  if (!confirm(`${nameOf(m)}님의 교인 자료 열람을 허용할까요?`)) return
  await call('approve_member', { p_target: m.id }, m, '승인')
}

async function onReject(m: MemberRow) {
  if (!confirm(`${nameOf(m)}님의 신청을 반려할까요?`)) return
  await call('reject_member', { p_target: m.id }, m, '반려')
}

async function onLevel(m: MemberRow, level: number) {
  if (levelOf(m) === level) return
  if (m.member_status !== 'active') {
    errorMsg.value = '승인된 교인에게만 등급을 줄 수 있습니다.'
    return
  }
  const label = LEVELS.find(l => l.value === level)?.label ?? ''
  if (!confirm(`${nameOf(m)}님의 등급을 '${label}'(으)로 바꿀까요?`)) return
  await call('set_member_level', { p_target: m.id, p_level: level }, m, `'${label}' 등급으로 변경`)
}

async function onStatus(m: MemberRow, status: string, label: string) {
  if (!confirm(`${nameOf(m)}님을 ${label} 처리할까요?`)) return
  await call('set_member_status', { p_target: m.id, p_status: status }, m, label)
}

async function onSaveInfo(m: MemberRow) {
  await call(
    'admin_update_member',
    { p_target: m.id, p_name: edit.name, p_phone: edit.phone, p_position: edit.position },
    m,
    '정보 수정',
  )
}

async function onDelete(m: MemberRow) {
  // 두 번 묻는다. 되돌릴 수 없는 유일한 기능이라서다.
  if (!confirm(`${nameOf(m)}님의 계정을 완전히 삭제할까요? 되돌릴 수 없습니다.`)) return
  if (!confirm('정말 삭제합니다. 계정과 프로필이 사라집니다.')) return
  // 사라질 사람의 모달은 요청을 보내기 전에 닫는다.
  closeManage()
  await call('delete_member', { p_target: m.id }, m, '삭제')
}

async function copySignupUrl() {
  try {
    await navigator.clipboard.writeText(signupUrl.value)
    okMsg.value = '가입 주소를 복사했습니다.'
  } catch {
    errorMsg.value = '복사하지 못했습니다. 주소를 직접 선택해 복사해 주세요.'
  }
}

/** 지금 화면에 보이는 만큼만 내보낸다 — 검색어를 걸었으면 그 결과가 나간다. */
function exportCsv() {
  const csv = toCsv(
    ['이름', '연락처', '직분', '상태', '등급', '가입 방법', '신청일'],
    visible.value.map(m => [
      m.name ?? '',
      m.phone ?? '',
      m.position ?? '',
      STATUS_LABEL[m.member_status],
      LEVELS.find(l => l.value === levelOf(m))?.label ?? '',
      PROVIDER_LABEL[m.provider ?? 'email'] ?? m.provider ?? '',
      longDateTime(m.created_at),
    ]),
  )
  downloadCsv(`members_${todayCompact()}.csv`, csv)
  // 명부가 통째로 파일로 나가는 순간이다. 화면 열람과 별도로 남긴다.
  void logEvent('view_sensitive', `${ROUTE_PATHS.ADMIN_MEMBERS}/export`, { rows: visible.value.length })
}

onMounted(load)
</script>
