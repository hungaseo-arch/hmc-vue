<template>
  <TheLayout>
    <PageHeader title="회원 승인" subtitle="가입 신청을 확인하고 교인 자료 열람을 허용합니다." />

    <section class="py-12">
      <div class="container mx-auto px-4 max-w-3xl">
        <!-- 탭. 기본은 '대기 중' — 여기 들어오는 이유가 그것이기 때문이다. -->
        <div class="flex gap-2 mb-6" role="tablist" aria-label="회원 상태">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="tab === t.key"
            class="min-h-14 flex-1 rounded-xl text-[18px] font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            :class="tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:brightness-95'"
            @click="tab = t.key"
          >
            {{ t.label }}<span v-if="t.key === 'pending' && pendingCount"> ({{ pendingCount }})</span>
          </button>
        </div>

        <p v-if="errorMsg" role="alert" class="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[18px] leading-relaxed text-red-700">
          {{ errorMsg }}
        </p>
        <p v-if="okMsg" role="status" class="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-[18px] leading-relaxed text-green-800">
          {{ okMsg }}
        </p>

        <p v-if="loading" class="py-16 text-center text-[18px] text-muted-foreground">불러오는 중...</p>

        <p v-else-if="!visible.length" class="py-16 text-center text-[18px] text-muted-foreground">
          {{ tab === 'pending' ? '승인을 기다리는 분이 없습니다.' : '표시할 회원이 없습니다.' }}
        </p>

        <ul v-else class="space-y-4">
          <li
            v-for="m in visible"
            :key="m.id"
            class="bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-6"
          >
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 class="text-[20px] font-bold text-foreground">{{ m.name || '이름 미설정' }}</h2>
              <span class="px-2.5 py-1 rounded-full text-[14px] font-medium" :class="STATUS_STYLE[m.member_status]">
                {{ STATUS_LABEL[m.member_status] }}
              </span>
              <span v-if="m.access_level >= 2 || m.role === 'admin'" class="px-2.5 py-1 rounded-full text-[14px] font-medium bg-primary/10 text-primary">
                관리자
              </span>
            </div>

            <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[18px] leading-relaxed">
              <dt class="text-muted-foreground">가입 방법</dt>
              <dd class="text-foreground">{{ PROVIDER_LABEL[m.provider ?? 'email'] ?? m.provider }}</dd>
              <dt class="text-muted-foreground">신청일</dt>
              <dd class="text-foreground">{{ formatDate(m.created_at) }}</dd>
              <template v-if="m.phone">
                <dt class="text-muted-foreground">연락처</dt>
                <dd class="text-foreground">{{ m.phone }}</dd>
              </template>
              <template v-if="m.position">
                <dt class="text-muted-foreground">직분</dt>
                <dd class="text-foreground">{{ m.position }}</dd>
              </template>
            </dl>

            <div v-if="m.member_status !== 'active'" class="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                :disabled="busyId === m.id"
                class="min-h-14 flex-1 min-w-35 rounded-xl bg-primary text-primary-foreground text-[18px] font-semibold hover:bg-primary/90 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                @click="onApprove(m)"
              >
                {{ busyId === m.id ? '처리 중...' : '승인' }}
              </button>
              <button
                v-if="m.member_status === 'pending'"
                type="button"
                :disabled="busyId === m.id"
                class="min-h-14 flex-1 min-w-35 rounded-xl bg-secondary text-secondary-foreground text-[18px] font-semibold hover:brightness-95 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                @click="onReject(m)"
              >
                반려
              </button>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { supabase } from '@/lib/supabase'
import type { MemberStatus } from '@/composables/useAuth'

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
  { key: 'pending', label: '대기 중' },
  { key: 'all', label: '전체' },
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

const tab = ref<'pending' | 'all'>('pending')
const members = ref<MemberRow[]>([])
const loading = ref(true)
const busyId = ref<string | null>(null)
const errorMsg = ref('')
const okMsg = ref('')

const pendingCount = computed(() => members.value.filter(m => m.member_status === 'pending').length)
const visible = computed(() =>
  tab.value === 'pending' ? members.value.filter(m => m.member_status === 'pending') : members.value,
)

/** 자카르타 기준으로 읽는다. 교회가 거기 있고 관리자도 거기서 본다. */
function formatDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  // 대기 중을 맨 위로. 그다음 최근 신청 순.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone, position, role, member_status, access_level, provider, created_at')
    .order('member_status', { ascending: true })
    .order('created_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.warn('[회원 승인] 목록 조회 실패:', error.message)
    errorMsg.value = '회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } else {
    members.value = (data ?? []) as MemberRow[]
  }
  loading.value = false
}

/*
  승인·반려는 반드시 RPC 로 한다. 화면에서 profiles 를 직접 UPDATE 하지
  않는 이유는 두 가지다. 하나, 등급 컬럼에는 클라이언트 쓰기 권한이 아예
  없다. 둘, 누가 언제 승인했는지를 같은 트랜잭션에서 감사 로그에 남겨야
  기록이 빠지지 않는다.
*/
async function call(fn: 'approve_member' | 'reject_member', m: MemberRow, done: string) {
  busyId.value = m.id
  errorMsg.value = ''
  okMsg.value = ''
  const { error } = await supabase.rpc(fn, { p_target: m.id })
  if (error) {
    console.warn(`[회원 승인] ${fn} 실패:`, error.message)
    errorMsg.value = '처리하지 못했습니다. 권한을 확인하시고 다시 시도해 주세요.'
  } else {
    okMsg.value = `${m.name || '이름 미설정'}님을 ${done}했습니다.`
    await load()
  }
  busyId.value = null
}

async function onApprove(m: MemberRow) {
  if (!confirm(`${m.name || '이름 미설정'}님의 교인 자료 열람을 허용할까요?`)) return
  await call('approve_member', m, '승인')
}

async function onReject(m: MemberRow) {
  if (!confirm(`${m.name || '이름 미설정'}님의 신청을 반려할까요?`)) return
  await call('reject_member', m, '반려')
}

onMounted(load)
</script>
