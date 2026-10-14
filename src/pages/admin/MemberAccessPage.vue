<template>
  <TheLayout>
    <PageHeader title="회원별 접속" subtitle="교인 한 분 한 분이 언제 들어오셨는지 추적합니다." />

    <section class="py-12">
      <div class="container mx-auto px-4 max-w-5xl">
        <!-- ── 조회 조건 ─────────────────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-6 mb-8">
          <div class="flex flex-wrap gap-2 mb-5">
            <button
              v-for="p in PRESETS"
              :key="p.days"
              type="button"
              class="px-4 py-2.5 rounded-xl text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              :class="preset === p.days ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:brightness-95'"
              @click="applyPreset(p.days)"
            >
              {{ p.label }}
            </button>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label for="ma-from" class="block text-sm font-semibold mb-2 text-foreground">시작일</label>
              <input id="ma-from" v-model="fromDate" type="date" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm" @change="preset = 0" />
            </div>
            <div>
              <label for="ma-to" class="block text-sm font-semibold mb-2 text-foreground">종료일</label>
              <input id="ma-to" v-model="toDate" type="date" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm" @change="preset = 0" />
            </div>
            <div>
              <label for="ma-sort" class="block text-sm font-semibold mb-2 text-foreground">정렬</label>
              <select id="ma-sort" v-model="sortKey" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm bg-white">
                <option v-for="(label, key) in SORT_LABEL" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div>
              <label for="ma-search" class="block text-sm font-semibold mb-2 text-foreground">이름·직분</label>
              <input
                id="ma-search"
                v-model="keyword"
                type="search"
                placeholder="찾을 이름"
                class="w-full py-2.5 border border-border rounded-xl px-4 text-sm bg-white"
              />
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              :disabled="loading"
              class="py-2.5 flex-1 min-w-35 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              @click="search"
            >
              {{ loading ? '불러오는 중...' : '조회' }}
            </button>
            <button
              type="button"
              :disabled="!visible.length"
              class="py-2.5 flex-1 min-w-35 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              @click="exportCsv"
            >
              CSV로 내려받기
            </button>
          </div>
        </div>

        <p v-if="errorMsg" role="alert" class="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm leading-relaxed text-red-700">
          {{ errorMsg }}
        </p>

        <!-- ── 묶음 거르기. 숫자를 누르면 그 사람들만 남는다. ─────────── -->
        <div v-if="members.length" class="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-8" role="group" aria-label="회원 묶음">
          <button
            v-for="g in GROUPS"
            :key="g.key"
            type="button"
            :aria-pressed="group === g.key"
            class="rounded-xl px-4 py-3 text-left transition border-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            :class="[g.style, group === g.key ? 'border-primary' : 'border-transparent hover:brightness-95']"
            @click="group = g.key"
          >
            <p class="text-xs opacity-75">{{ g.label }}</p>
            <p class="text-xl font-bold tabular-nums">{{ groupCount[g.key] }}명</p>
          </button>
        </div>

        <!-- ── 회원 목록 ────────────────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div class="px-5 sm:px-6 py-4 border-b border-border flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-lg font-bold text-foreground">회원 목록</h2>
            <p class="text-sm text-muted-foreground">{{ visible.length }}명 · 이름을 누르면 접속 이력을 봅니다</p>
          </div>

          <p v-if="loading && !members.length" class="py-16 text-center text-sm text-muted-foreground">불러오는 중...</p>
          <p v-else-if="!visible.length" class="py-16 text-center text-sm text-muted-foreground">해당하는 회원이 없습니다.</p>

          <template v-else>
            <p class="sm:hidden px-5 py-2 text-xs text-muted-foreground">표를 옆으로 밀어 보세요 →</p>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px] text-left">
                <caption class="sr-only">회원별 접속 요약. 로그인·이용일·거부는 조회 기간 안의 수치입니다.</caption>
                <thead class="bg-secondary">
                  <tr class="text-sm text-secondary-foreground">
                    <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap">이름</th>
                    <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap">마지막 로그인</th>
                    <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap text-right">로그인</th>
                    <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap text-right">이용일</th>
                    <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap text-right">거부</th>
                    <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap">상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="m in visible"
                    :key="m.id"
                    class="border-t border-border"
                    :class="selectedId === m.id ? 'bg-primary/5' : ''"
                  >
                    <td class="px-5 py-3 text-sm whitespace-nowrap">
                      <button
                        type="button"
                        class="font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 rounded"
                        :aria-expanded="selectedId === m.id"
                        aria-controls="ma-detail"
                        @click="select(m.id)"
                      >
                        {{ m.name || '이름 미설정' }}
                      </button>
                      <span v-if="m.position" class="ml-1.5 text-xs text-muted-foreground">{{ m.position }}</span>
                    </td>
                    <td class="px-5 py-3 text-sm whitespace-nowrap tabular-nums">
                      <template v-if="m.last_login_at">
                        <span class="text-foreground">{{ shortDateTime(m.last_login_at) }}</span>
                        <span class="ml-1.5 text-xs" :class="staleClass(m.last_login_at)">{{ agoLabel(m.last_login_at) }}</span>
                      </template>
                      <span v-else class="text-amber-800">기록 없음</span>
                    </td>
                    <td class="px-5 py-3 text-sm text-right tabular-nums" :class="m.logins ? 'text-foreground' : 'text-muted-foreground'">{{ m.logins }}</td>
                    <td class="px-5 py-3 text-sm text-right tabular-nums" :class="m.active_days ? 'text-foreground' : 'text-muted-foreground'">{{ m.active_days }}일</td>
                    <td class="px-5 py-3 text-sm text-right tabular-nums" :class="m.denied ? 'text-red-700 font-semibold' : 'text-muted-foreground'">{{ m.denied }}</td>
                    <td class="px-5 py-3 whitespace-nowrap">
                      <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="STATUS_STYLE[m.member_status] ?? 'bg-secondary text-secondary-foreground'">
                        {{ STATUS_LABEL[m.member_status] ?? m.member_status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>

        <!-- ── 한 사람의 이력 ───────────────────────────────────── -->
        <div
          v-if="selected"
          id="ma-detail"
          ref="detailEl"
          tabindex="-1"
          class="mt-8 bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-6 focus:outline-none"
        >
          <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h2 class="text-lg font-bold text-foreground">
                {{ selected.name || '이름 미설정' }}
                <span v-if="selected.position" class="text-sm font-normal text-muted-foreground">{{ selected.position }}</span>
              </h2>
              <p class="mt-1 text-sm text-muted-foreground">
                가입 {{ longDateTime(selected.joined_at) }} ·
                마지막 활동 {{ selected.last_seen_at ? fullDateTime(selected.last_seen_at) : '기록 없음' }}
              </p>
            </div>
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition"
              @click="select('')"
            >
              닫기
            </button>
          </div>

          <!-- 기간 안의 하루하루. 칸 하나가 하루이고, 진할수록 많이 쓴 날이다. -->
          <div v-if="calendar.length" class="mb-6">
            <h3 class="text-sm font-semibold text-foreground mb-3">기간 내 이용한 날 ({{ activeDayCount }}일 / {{ calendar.length }}일)</h3>
            <ul class="flex flex-wrap gap-1" aria-label="날짜별 이용 여부">
              <li
                v-for="d in calendar"
                :key="d.day"
                class="size-4 rounded-sm"
                :class="heatClass(d.total)"
                :title="`${dayLabel(d.day)} · ${d.total}건`"
              >
                <span class="sr-only">{{ dayLabel(d.day) }} {{ d.total }}건</span>
              </li>
            </ul>
          </div>

          <p v-if="detailLoading" class="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
          <p v-else-if="!events.length" class="py-8 text-center text-sm text-muted-foreground">이 기간에 남은 기록이 없습니다.</p>

          <ol v-else class="space-y-5">
            <li v-for="g in eventsByDay" :key="g.day">
              <h3 class="text-sm font-semibold text-foreground mb-2 tabular-nums">{{ dayLabel(g.day) }}</h3>
              <ul class="border-l-2 border-border pl-4 space-y-1.5">
                <li v-for="e in g.items" :key="e.id" class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <span class="w-16 shrink-0 text-muted-foreground tabular-nums">{{ timeOnly(e.occurred_at) }}</span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="EVENT_STYLE[e.event_type] ?? 'bg-secondary text-secondary-foreground'">
                    {{ EVENT_LABEL[e.event_type] ?? e.event_type }}
                  </span>
                  <span v-if="e.resource" class="text-xs text-muted-foreground font-mono break-all">{{ e.resource }}</span>
                </li>
              </ul>
            </li>
          </ol>

          <p v-if="events.length >= DETAIL_LIMIT" class="mt-5 text-xs text-muted-foreground">
            최근 {{ DETAIL_LIMIT }}건까지만 보여 드립니다. 더 이전 기록은 기간을 좁혀 보시거나
            <RouterLink :to="ROUTE_PATHS.ADMIN_AUDIT_LOG" class="text-primary hover:underline">접속 기록</RouterLink>에서 찾아 주세요.
          </p>
        </div>

        <p class="mt-6 text-xs leading-relaxed text-muted-foreground">
          로그인·이용일·거부는 조회 기간 안의 수치이고, 마지막 로그인은 기간과 무관합니다.
          접속 기록은 12개월간 보관되므로 그보다 오래된 로그인은 '기록 없음'으로 보입니다.
          반려된 가입 신청은 목록에서 뺐습니다.
        </p>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { toCsv, downloadCsv } from '@/lib/csv'
import { logEvent } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'
import {
  WIB, fullDateTime, shortDateTime, longDateTime, dayLabel, timeOnly, ymdOf, daysAgo,
  todayYmd, shiftYmd, todayCompact,
} from '@/lib/jakarta'

const DETAIL_LIMIT = 500
/** 마지막 로그인이 이보다 오래되면 '오래 안 들어온 분' 으로 묶는다. */
const STALE_DAYS = 30

const EVENT_LABEL: Record<string, string> = {
  login: '로그인',
  logout: '로그아웃',
  view_sensitive: '민감정보 열람',
  access_denied: '접근 거부',
  member_approved: '회원 승인',
  member_rejected: '회원 반려',
  member_level_changed: '등급 변경',
  member_status_changed: '상태 변경',
  member_edited: '명부 수정',
  member_deleted: '계정 삭제',
}

const EVENT_STYLE: Record<string, string> = {
  login: 'bg-green-50 text-green-800',
  logout: 'bg-secondary text-secondary-foreground',
  view_sensitive: 'bg-primary/10 text-primary',
  access_denied: 'bg-red-50 text-red-700',
  member_approved: 'bg-green-50 text-green-800',
  member_rejected: 'bg-amber-100 text-amber-800',
  member_level_changed: 'bg-primary/10 text-primary',
  member_status_changed: 'bg-amber-100 text-amber-800',
  member_edited: 'bg-secondary text-secondary-foreground',
  member_deleted: 'bg-red-50 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '대기 중',
  active: '승인됨',
  suspended: '정지됨',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-green-50 text-green-800',
  suspended: 'bg-red-50 text-red-700',
}

const PRESETS = [
  { days: 7, label: '최근 7일' },
  { days: 30, label: '최근 30일' },
  { days: 90, label: '최근 90일' },
]

const SORT_LABEL = {
  recent: '최근 로그인 순',
  logins: '로그인 많은 순',
  stale: '오래 안 들어온 순',
  name: '이름 순',
} as const
type SortKey = keyof typeof SORT_LABEL

type GroupKey = 'all' | 'active' | 'idle' | 'never'
const GROUPS: { key: GroupKey; label: string; style: string }[] = [
  { key: 'all', label: '전체', style: 'bg-secondary text-foreground' },
  { key: 'active', label: '기간 내 접속', style: 'bg-green-50 text-green-800' },
  { key: 'idle', label: `${STALE_DAYS}일 넘게 미접속`, style: 'bg-amber-50 text-amber-900' },
  { key: 'never', label: '로그인 기록 없음', style: 'bg-red-50 text-red-700' },
]

interface MemberAccess {
  id: string
  name: string | null
  position: string | null
  member_status: string
  access_level: number
  joined_at: string | null
  logins: number
  events: number
  denied: number
  active_days: number
  last_login_at: string | null
  last_seen_at: string | null
}

interface LogRow {
  id: number
  occurred_at: string
  event_type: string
  resource: string | null
}

const route = useRoute()
const router = useRouter()

const preset = ref(30)
const fromDate = ref('')
const toDate = ref('')
const sortKey = ref<SortKey>('recent')
const keyword = ref('')
const group = ref<GroupKey>('all')

const members = ref<MemberAccess[]>([])
const loading = ref(false)
const errorMsg = ref('')

const selectedId = ref(typeof route.query.user === 'string' ? route.query.user : '')
const events = ref<LogRow[]>([])
const detailLoading = ref(false)
const detailEl = ref<HTMLElement | null>(null)

function applyPreset(days: number) {
  preset.value = days
  toDate.value = todayYmd()
  fromDate.value = shiftYmd(toDate.value, -(days - 1))
  void search()
}

/** 종료일은 그날 하루를 통째로 포함해야 하므로 다음 날 0시를 상한으로 쓴다. */
function rangeIso(): { from: string; to: string } {
  return {
    from: new Date(`${fromDate.value}T00:00:00${WIB}`).toISOString(),
    to: new Date(`${shiftYmd(toDate.value, 1)}T00:00:00${WIB}`).toISOString(),
  }
}

function groupOf(m: MemberAccess): Exclude<GroupKey, 'all'>[] {
  const out: Exclude<GroupKey, 'all'>[] = []
  if (m.events > 0) out.push('active')
  if (!m.last_login_at) out.push('never')
  else if (daysAgo(m.last_login_at) > STALE_DAYS) out.push('idle')
  return out
}

const groupCount = computed(() => {
  const c: Record<GroupKey, number> = { all: members.value.length, active: 0, idle: 0, never: 0 }
  for (const m of members.value) for (const g of groupOf(m)) c[g]++
  return c
})

/** 마지막 로그인 시각. 기록이 없으면 가장 오래된 것으로 친다. */
function lastLoginMs(m: MemberAccess): number {
  return m.last_login_at ? new Date(m.last_login_at).getTime() : 0
}

const visible = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const list = members.value.filter(m =>
    (group.value === 'all' || groupOf(m).includes(group.value))
    && (!kw || `${m.name ?? ''} ${m.position ?? ''}`.toLowerCase().includes(kw)),
  )
  const byName = (a: MemberAccess, b: MemberAccess) => (a.name ?? '').localeCompare(b.name ?? '', 'ko')
  const cmp: Record<SortKey, (a: MemberAccess, b: MemberAccess) => number> = {
    recent: (a, b) => lastLoginMs(b) - lastLoginMs(a) || byName(a, b),
    logins: (a, b) => b.logins - a.logins || lastLoginMs(b) - lastLoginMs(a),
    stale: (a, b) => lastLoginMs(a) - lastLoginMs(b) || byName(a, b),
    name: byName,
  }
  return [...list].sort(cmp[sortKey.value])
})

const selected = computed(() => members.value.find(m => m.id === selectedId.value) ?? null)

function agoLabel(iso: string): string {
  const n = daysAgo(iso)
  return n === 0 ? '오늘' : `${n}일 전`
}

function staleClass(iso: string): string {
  return daysAgo(iso) > STALE_DAYS ? 'text-amber-800 font-semibold' : 'text-muted-foreground'
}

/* ── 한 사람의 이력 ───────────────────────────────────────────── */

const eventsByDay = computed(() => {
  const out: { day: string; items: LogRow[] }[] = []
  for (const e of events.value) {
    const day = ymdOf(e.occurred_at)
    const last = out[out.length - 1]
    if (last?.day === day) last.items.push(e)
    else out.push({ day, items: [e] })
  }
  return out
})

/** 기간의 모든 날을 빠짐없이. 아무 일 없던 날도 빈칸으로 보여야 공백이 보인다. */
const calendar = computed(() => {
  if (!fromDate.value || !toDate.value || fromDate.value > toDate.value) return []
  const counts = new Map<string, number>()
  for (const g of eventsByDay.value) counts.set(g.day, g.items.length)
  const out: { day: string; total: number }[] = []
  for (let d = fromDate.value; d <= toDate.value; d = shiftYmd(d, 1)) {
    out.push({ day: d, total: counts.get(d) ?? 0 })
  }
  return out
})

const activeDayCount = computed(() => calendar.value.filter(d => d.total).length)

function heatClass(n: number): string {
  if (!n) return 'bg-secondary'
  if (n < 3) return 'bg-primary/30'
  if (n < 10) return 'bg-primary/60'
  return 'bg-primary'
}

async function fetchDetail() {
  if (!selectedId.value || !fromDate.value) {
    events.value = []
    return
  }
  detailLoading.value = true
  const { from, to } = rangeIso()
  const { data, error } = await supabase
    .from('v_access_audit_log')
    .select('id, occurred_at, event_type, resource')
    .eq('user_id', selectedId.value)
    .gte('occurred_at', from)
    .lt('occurred_at', to)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(DETAIL_LIMIT)
  if (error) {
    console.warn('[회원별 접속] 이력 조회 실패:', error.message)
    errorMsg.value = '이력을 불러오지 못했습니다. 기간을 좁혀 다시 시도해 주세요.'
    events.value = []
  } else {
    events.value = (data ?? []) as LogRow[]
  }
  detailLoading.value = false
}

/** 주소에 ?user= 를 남긴다. 접속 기록 화면에서 이 사람으로 바로 건너올 수 있게. */
async function select(id: string) {
  selectedId.value = selectedId.value === id ? '' : id
  void router.replace({ query: { ...route.query, user: selectedId.value || undefined } })
  await fetchDetail()
  if (selectedId.value) {
    await nextTick()
    detailEl.value?.focus()
    detailEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/* ── 조회 ───────────────────────────────────────────────────── */

async function fetchMembers() {
  loading.value = true
  const { from, to } = rangeIso()
  const { data, error } = await supabase.rpc('member_access_overview', { p_from: from, p_to: to })
  if (error) {
    console.warn('[회원별 접속] 조회 실패:', error.message)
    errorMsg.value = error.code === '42501'
      ? '이 화면은 슈퍼관리자만 볼 수 있습니다.'
      : '기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } else {
    members.value = (data ?? []) as MemberAccess[]
  }
  loading.value = false
}

async function search() {
  if (!fromDate.value || !toDate.value) return
  errorMsg.value = ''
  if (fromDate.value > toDate.value) {
    errorMsg.value = '시작일이 종료일보다 뒤입니다. 날짜를 다시 골라 주세요.'
    return
  }
  await Promise.all([fetchMembers(), fetchDetail()])
}

function exportCsv() {
  const list = visible.value
  const csv = toCsv(
    ['이름', '직분', '상태', '가입일', '마지막 로그인(자카르타)', '마지막 활동(자카르타)',
      `로그인(${fromDate.value}~${toDate.value})`, '이용일', '전체 기록', '거부'],
    list.map(m => [
      m.name ?? '',
      m.position ?? '',
      STATUS_LABEL[m.member_status] ?? m.member_status,
      m.joined_at ? fullDateTime(m.joined_at) : '',
      m.last_login_at ? fullDateTime(m.last_login_at) : '',
      m.last_seen_at ? fullDateTime(m.last_seen_at) : '',
      m.logins,
      m.active_days,
      m.events,
      m.denied,
    ]),
  )
  downloadCsv(`member_access_${todayCompact()}.csv`, csv)
  void logEvent('view_sensitive', `${ROUTE_PATHS.ADMIN_MEMBER_ACCESS}/export`, { rows: list.length })
}

onMounted(() => applyPreset(30))
</script>
