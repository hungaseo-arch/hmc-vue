<template>
  <TheLayout>
    <PageHeader title="접속 기록" subtitle="누가 언제 무엇을 열람했는지 확인합니다." />

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
              <label for="f-from" class="block text-sm font-semibold mb-2 text-foreground">시작일</label>
              <input id="f-from" v-model="fromDate" type="date" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm" @change="preset = 0" />
            </div>
            <div>
              <label for="f-to" class="block text-sm font-semibold mb-2 text-foreground">종료일</label>
              <input id="f-to" v-model="toDate" type="date" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm" @change="preset = 0" />
            </div>
            <div>
              <label for="f-event" class="block text-sm font-semibold mb-2 text-foreground">유형</label>
              <select id="f-event" v-model="eventType" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm bg-white">
                <option value="">전체</option>
                <option v-for="(label, key) in EVENT_LABEL" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div>
              <label for="f-user" class="block text-sm font-semibold mb-2 text-foreground">사용자</label>
              <select id="f-user" v-model="userId" class="w-full py-2.5 border border-border rounded-xl px-4 text-sm bg-white">
                <option value="">전체</option>
                <option v-for="u in people" :key="u.id" :value="u.id">{{ u.name || '이름 미설정' }}</option>
              </select>
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
              :disabled="exporting || !total"
              class="py-2.5 flex-1 min-w-35 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              @click="exportCsv"
            >
              {{ exporting ? '내보내는 중...' : 'CSV로 내려받기' }}
            </button>
          </div>
        </div>

        <p v-if="errorMsg" role="alert" class="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm leading-relaxed text-red-700">
          {{ errorMsg }}
        </p>

        <!-- ── 분석 ──────────────────────────────────────────────── -->
        <div v-if="summary" class="bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-6 mb-8">
          <h2 class="text-lg font-bold text-foreground mb-5">이 기간 요약</h2>

          <div class="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
            <div class="rounded-xl bg-secondary px-4 py-3">
              <p class="text-xs text-muted-foreground">전체 기록</p>
              <p class="text-xl font-bold text-foreground">{{ summary.total.toLocaleString('ko-KR') }}건</p>
            </div>
            <div class="rounded-xl bg-secondary px-4 py-3">
              <p class="text-xs text-muted-foreground">이용한 사람</p>
              <p class="text-xl font-bold text-foreground">{{ summary.users }}명</p>
            </div>
            <div class="rounded-xl bg-green-50 px-4 py-3">
              <p class="text-xs text-green-800/70">로그인</p>
              <p class="text-xl font-bold text-green-800">{{ eventCount('login') }}회</p>
            </div>
            <div class="rounded-xl px-4 py-3" :class="eventCount('access_denied') ? 'bg-red-50' : 'bg-secondary'">
              <p class="text-xs" :class="eventCount('access_denied') ? 'text-red-700/70' : 'text-muted-foreground'">접근 거부</p>
              <p class="text-xl font-bold" :class="eventCount('access_denied') ? 'text-red-700' : 'text-foreground'">
                {{ eventCount('access_denied') }}회
              </p>
            </div>
          </div>

          <!-- 날짜별 흐름. 막대 하나가 하루다. -->
          <div v-if="summary.by_day.length" class="mb-6">
            <h3 class="text-sm font-semibold text-foreground mb-3">날짜별 기록</h3>
            <ul class="space-y-1.5">
              <li v-for="d in summary.by_day" :key="d.day" class="flex items-center gap-3">
                <span class="w-24 shrink-0 text-sm text-muted-foreground tabular-nums">{{ dayLabel(d.day) }}</span>
                <span class="flex-1 h-6 rounded-md bg-secondary overflow-hidden">
                  <span class="block h-full bg-primary" :style="{ width: barWidth(d.total) }" />
                </span>
                <span class="w-20 shrink-0 text-right text-sm text-foreground tabular-nums">{{ d.total }}건</span>
              </li>
            </ul>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <div v-if="summary.top_users.length">
              <h3 class="text-sm font-semibold text-foreground mb-3">많이 이용한 분</h3>
              <ol class="space-y-2">
                <li v-for="u in summary.top_users.slice(0, 8)" :key="u.user_id ?? u.name" class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="text-foreground truncate">{{ u.name }}</span>
                  <span class="shrink-0 text-muted-foreground tabular-nums">
                    {{ u.total }}건 · {{ shortDateTime(u.last_at) }}
                  </span>
                </li>
              </ol>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-foreground mb-3">막힌 경로</h3>
              <ol v-if="summary.denied.length" class="space-y-2">
                <li v-for="d in summary.denied" :key="d.resource" class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="text-foreground truncate font-mono text-xs">{{ d.resource }}</span>
                  <span class="shrink-0 text-red-700 tabular-nums">{{ d.total }}회</span>
                </li>
              </ol>
              <p v-else class="text-sm text-muted-foreground">막힌 접근이 없습니다.</p>
            </div>
          </div>

          <p v-if="summary.never_logged_in" class="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            승인은 되었지만 한 번도 들어오지 않은 분이 <strong>{{ summary.never_logged_in }}명</strong> 있습니다.
            로그인을 도와드리면 좋겠습니다. (이 항목만 조회 기간과 무관합니다.)
          </p>
        </div>

        <!-- ── 목록 ──────────────────────────────────────────────── -->
        <div class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div class="px-5 sm:px-6 py-4 border-b border-border flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-lg font-bold text-foreground">기록 목록</h2>
            <p class="text-sm text-muted-foreground">
              전체 {{ total.toLocaleString('ko-KR') }}건 중 {{ rows.length.toLocaleString('ko-KR') }}건 표시
            </p>
          </div>

          <p v-if="!loading && !rows.length" class="py-16 text-center text-sm text-muted-foreground">
            해당 기간에 기록이 없습니다.
          </p>

          <p v-else class="sm:hidden px-5 py-2 text-xs text-muted-foreground">표를 옆으로 밀어 보세요 →</p>
          <div v-if="loading || rows.length" class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-left">
              <caption class="sr-only">접속 기록 목록. 최근 순으로 정렬되어 있습니다.</caption>
              <thead class="bg-secondary">
                <tr class="text-sm text-secondary-foreground">
                  <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap">시각 (자카르타)</th>
                  <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap">이름</th>
                  <th scope="col" class="px-5 py-3 font-semibold whitespace-nowrap">유형</th>
                  <th scope="col" class="px-5 py-3 font-semibold">경로</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.id" class="border-t border-border align-top">
                  <td class="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap tabular-nums">{{ fullDateTime(r.occurred_at) }}</td>
                  <td class="px-5 py-3 text-sm text-foreground whitespace-nowrap">{{ r.display_name }}</td>
                  <td class="px-5 py-3 whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="EVENT_STYLE[r.event_type] ?? 'bg-secondary text-secondary-foreground'">
                      {{ EVENT_LABEL[r.event_type] ?? r.event_type }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-xs text-muted-foreground font-mono break-all">{{ r.resource || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="rows.length < total" class="px-5 sm:px-6 py-5 border-t border-border">
            <button
              type="button"
              :disabled="loading"
              class="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition disabled:opacity-50"
              @click="loadMore"
            >
              {{ loading ? '불러오는 중...' : `더 보기 (${(total - rows.length).toLocaleString('ko-KR')}건 남음)` }}
            </button>
          </div>
        </div>

        <!--
          보관 기간을 화면에 밝혀 둔다. 1년 전 기록을 찾다가 "사라졌다" 고
          놀라는 일이 없도록. 이 화면에는 수정·삭제 기능이 없다.
        -->
        <p class="mt-6 text-xs leading-relaxed text-muted-foreground">
          접속 기록은 12개월간 보관되며, 그 이후에는 자동으로 삭제됩니다.
          기록은 수정하거나 지울 수 없습니다. CSV 내보내기는 한 번에 최대
          {{ CSV_LIMIT.toLocaleString('ko-KR') }}건까지 가능합니다.
        </p>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import { toCsv, downloadCsv } from '@/lib/csv'
import { logEvent } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'
/*
  날짜는 모두 자카르타 기준이다. 날짜 칸에 적은 '8월 9일' 은 자카르타의
  8월 9일이어야 한다 - 브라우저 시간대로 해석하면 한국에서 볼 때 두 시간이
  어긋난다. 포맷터를 매번 새로 짓지 않도록 lib/jakarta 에 모아 두었다.
*/
import { WIB, fullDateTime, shortDateTime, dayLabel, todayYmd, shiftYmd, todayCompact } from '@/lib/jakarta'

const PAGE = 50
const CSV_LIMIT = 5000

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

const PRESETS = [
  { days: 7, label: '최근 7일' },
  { days: 30, label: '최근 30일' },
  { days: 90, label: '최근 90일' },
]

interface LogRow {
  id: number
  occurred_at: string
  user_id: string | null
  display_name: string
  event_type: string
  resource: string | null
  detail: Record<string, unknown> | null
}

interface Summary {
  total: number
  users: number
  by_event: Record<string, number>
  by_day: { day: string; total: number; logins: number }[]
  top_users: { user_id: string | null; name: string; total: number; last_at: string }[]
  denied: { resource: string; total: number }[]
  never_logged_in: number
}

const preset = ref(7)
const fromDate = ref('')
const toDate = ref('')
const eventType = ref('')
const userId = ref('')

const rows = ref<LogRow[]>([])
const total = ref(0)
const summary = ref<Summary | null>(null)
const people = ref<{ id: string; name: string | null }[]>([])
const loading = ref(false)
const exporting = ref(false)
const errorMsg = ref('')

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

function eventCount(key: string): number {
  return summary.value?.by_event[key] ?? 0
}

/*
  막대 하나를 그릴 때마다 전체 최댓값을 다시 구하면 날짜 수의 제곱만큼 일한다.
  90일 조회에서 눈에 띈다. 요약이 바뀔 때만 한 번 구한다.
*/
const maxDayTotal = computed(() =>
  Math.max(1, ...(summary.value?.by_day ?? []).map(d => d.total)),
)

function barWidth(n: number): string {
  return `${Math.max(2, Math.round((n / maxDayTotal.value) * 100))}%`
}

/** 조건은 목록·CSV 가 똑같이 써야 한다. 한 곳에서만 만든다. */
function baseQuery(withCount: boolean) {
  const { from, to } = rangeIso()
  let q = withCount
    ? supabase.from('v_access_audit_log').select('*', { count: 'exact' })
    : supabase.from('v_access_audit_log').select('*')
  q = q.gte('occurred_at', from).lt('occurred_at', to)
  if (eventType.value) q = q.eq('event_type', eventType.value)
  if (userId.value) q = q.eq('user_id', userId.value)
  return q
}

async function fetchPage(offset: number) {
  loading.value = true
  errorMsg.value = ''
  /*
    전체 건수는 첫 장에서만 센다. count:'exact' 는 조건에 걸리는 행을 매번 전부
    세는 질의라, [더 보기] 를 누를 때마다 되풀이하면 기록이 쌓일수록 느려진다.
    같은 조건 안에서 세는 값이므로 첫 장의 답을 그대로 쓰면 된다.
  */
  const first = offset === 0
  const { data, error, count } = await baseQuery(first)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE - 1)

  if (error) {
    console.warn('[접속 기록] 조회 실패:', error.message)
    errorMsg.value = '기록을 불러오지 못했습니다. 기간을 좁혀 다시 시도해 주세요.'
  } else {
    if (first) total.value = count ?? 0
    rows.value = first ? (data as LogRow[]) : [...rows.value, ...(data as LogRow[])]
  }
  loading.value = false
}

async function fetchSummary() {
  const { from, to } = rangeIso()
  const { data, error } = await supabase.rpc('audit_summary', { p_from: from, p_to: to })
  if (error) {
    console.warn('[접속 기록] 요약 실패:', error.message)
    summary.value = null
  } else {
    summary.value = data as Summary
  }
}

async function search() {
  if (!fromDate.value || !toDate.value) return
  if (fromDate.value > toDate.value) {
    errorMsg.value = '시작일이 종료일보다 뒤입니다. 날짜를 다시 골라 주세요.'
    return
  }
  await Promise.all([fetchPage(0), fetchSummary()])
}

function loadMore() {
  void fetchPage(rows.value.length)
}

async function exportCsv() {
  exporting.value = true
  errorMsg.value = ''
  const { data, error } = await baseQuery(false)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(CSV_LIMIT)

  if (error) {
    console.warn('[접속 기록] 내보내기 실패:', error.message)
    errorMsg.value = '내보내기에 실패했습니다. 기간을 좁혀 다시 시도해 주세요.'
    exporting.value = false
    return
  }

  const list = (data ?? []) as LogRow[]
  const csv = toCsv(
    ['시각(자카르타)', '이름', '사용자ID', '유형', '경로', '상세'],
    list.map(r => [
      fullDateTime(r.occurred_at),
      r.display_name,
      r.user_id ?? '',
      EVENT_LABEL[r.event_type] ?? r.event_type,
      r.resource ?? '',
      r.detail ? JSON.stringify(r.detail) : '',
    ]),
  )
  downloadCsv(`audit_log_${todayCompact()}.csv`, csv)
  void logEvent('view_sensitive', `${ROUTE_PATHS.ADMIN_AUDIT_LOG}/export`, { rows: list.length })

  if (list.length === CSV_LIMIT) {
    errorMsg.value = `최대 ${CSV_LIMIT.toLocaleString('ko-KR')}건까지만 내려받았습니다. 기간을 나누어 다시 내려받아 주세요.`
  }
  exporting.value = false
}

/** 사용자 선택 목록. 관리자만 전체 프로필을 볼 수 있다(RLS). */
async function loadPeople() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .order('name', { ascending: true, nullsFirst: false })
  // 사람 목록은 거르기용이라 실패해도 기록 자체는 볼 수 있다. 조용히
  // 빈 목록이 되면 왜 선택지가 없는지 알 수 없으니 콘솔에는 남긴다.
  if (error) console.warn('[접속 기록] 사용자 목록 조회 실패:', error.message)
  people.value = data ?? []
}

onMounted(() => {
  // 기록 조회를 사람 목록 뒤로 줄 세우지 않는다. 서로 필요 없는 질의라
  // 함께 보내면 화면이 한 왕복 빨리 찬다.
  void loadPeople()
  applyPreset(7)
})
</script>
