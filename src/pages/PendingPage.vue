<template>
  <div class="min-h-screen bg-muted flex items-center justify-center px-4 py-10">
    <div class="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md p-6 sm:p-8 text-center">
      <div class="mx-auto mb-6 h-16 w-16 rounded-full bg-green-50 flex items-center justify-center" aria-hidden="true">
        <Clock class="h-8 w-8 text-green-700" />
      </div>

      <!--
        프로필을 통신 오류로 못 받은 경우. 승인된 교인이 회선 문제로 여기 왔을
        수 있으므로 '가입 신청' 문구를 보이면 안 된다 — 재가입으로 이어진다.
      -->
      <template v-if="profileUnknown">
        <h1 class="text-xl font-bold text-foreground">회원 정보를 불러오지 못했습니다</h1>
        <p class="mt-5 text-sm leading-relaxed text-muted-foreground">
          인터넷 연결을 확인하신 뒤 아래 버튼을 눌러 주세요.<br />
          이미 승인된 분이라면 바로 열립니다.
        </p>
      </template>

      <template v-else>
        <h1 class="text-xl font-bold text-foreground">가입 신청이 접수되었습니다</h1>

        <!--
          '거부' 가 아니라 '기다리는 중' 이라는 걸 분명히 한다. 실패로 오해하면
          같은 분이 계정을 여러 개 만들고, 그만큼 승인 업무도 늘어난다.
        -->
        <p class="mt-5 text-sm leading-relaxed text-muted-foreground">
          <strong class="text-foreground">{{ displayName || '성도' }}</strong>님, 반갑습니다.<br />
          교인 자료는 교회에서 확인한 뒤에 열립니다.
        </p>

        <div class="mt-6 rounded-xl bg-secondary px-5 py-4 text-left text-sm leading-relaxed text-secondary-foreground space-y-3">
          <p>· 보통 <strong>하루 이내</strong>에 처리됩니다.</p>
          <p>· 승인되면 다시 로그인하지 않아도 바로 열립니다.</p>
          <p>· 급하시면 교회 사무실로 연락 주세요.</p>
        </div>

        <p v-if="rejected" role="alert" class="mt-6 text-sm leading-relaxed text-red-700">
          신청이 반려되었습니다. 교회 사무실로 문의해 주세요.
        </p>
      </template>

      <div class="mt-8 space-y-3">
        <button
          type="button"
          :disabled="checking"
          class="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          @click="recheck"
        >
          {{ checking ? '확인하는 중...' : profileUnknown ? '다시 확인' : '승인되었는지 다시 확인' }}
        </button>
        <RouterLink
          :to="ROUTE_PATHS.PROFILE"
          class="block w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition"
        >
          내 정보 확인하기
        </RouterLink>
        <RouterLink :to="ROUTE_PATHS.HOME" class="block pt-2 text-sm text-muted-foreground hover:underline">
          홈으로 돌아가기
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Clock } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'

const router = useRouter()
const { displayName, memberStatus, profileUnknown, refreshProfile } = useAuth()

const checking = ref(false)
const rejected = computed(() => memberStatus.value === 'rejected')

/*
  '다시 확인' 버튼을 두는 이유. 승인은 다른 사람이 다른 시간에 누르는 일이라
  이 화면에는 아무 신호도 오지 않는다. 새로고침을 안내하는 대신 버튼 하나로
  끝내는 편이 훨씬 쉽다.
*/
async function recheck() {
  checking.value = true
  try {
    await refreshProfile()
    if (memberStatus.value === 'active') await router.push(ROUTE_PATHS.HOME)
  } finally {
    checking.value = false
  }
}
</script>
