<template>
  <div class="min-h-screen bg-muted flex items-center justify-center px-4 py-10">
    <div class="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md p-6 sm:p-8 text-center">
      <div class="mx-auto mb-6 h-16 w-16 rounded-full bg-green-50 flex items-center justify-center" aria-hidden="true">
        <Clock class="h-8 w-8 text-green-700" />
      </div>

      <!--
        프로필을 통신 오류로 못 받은 경우. 승인된 교인이 회선 문제로 여기 왔을
        수 있으므로 '가입 신청' 문구를 보이면 안 된다 - 재가입으로 이어진다.
      -->
      <template v-if="profileUnknown">
        <h1 class="text-xl font-bold text-foreground">회원 정보를 불러오지 못했습니다</h1>
        <p class="mt-5 text-sm leading-relaxed text-muted-foreground">
          인터넷 연결을 확인하신 뒤 아래 버튼을 눌러 주세요.<br />
          이미 승인된 분이라면 바로 열립니다.
        </p>
      </template>

      <!--
        T26 부터 가입하면 바로 열린다. 여기 오는 사람은 정지·반려된 계정이다.
        '기다리면 열린다' 고 안내하면 안 된다 - 사무실 문의가 유일한 길이다.
      -->
      <template v-else-if="restricted">
        <h1 class="text-xl font-bold text-foreground">이용이 제한된 계정입니다</h1>
        <p role="alert" class="mt-5 text-sm leading-relaxed text-muted-foreground">
          <strong class="text-foreground">{{ displayName || '성도' }}</strong>님 계정은 지금 교인 자료를 볼 수 없습니다.<br />
          교회 사무실로 문의해 주세요.
        </p>
      </template>

      <!-- 일괄 승인(T26) 전에 남은 대기 계정 등 드문 경우. -->
      <template v-else>
        <h1 class="text-xl font-bold text-foreground">가입 처리 중입니다</h1>
        <p class="mt-5 text-sm leading-relaxed text-muted-foreground">
          <strong class="text-foreground">{{ displayName || '성도' }}</strong>님, 반갑습니다.<br />
          잠시 뒤 아래 버튼을 눌러 주세요. 계속 열리지 않으면 교회 사무실로 연락 주세요.
        </p>
      </template>

      <div class="mt-8 space-y-3">
        <button
          type="button"
          :disabled="checking"
          class="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          @click="recheck"
        >
          {{ checking ? '확인하는 중...' : '다시 확인' }}
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
const restricted = computed(() => memberStatus.value === 'rejected' || memberStatus.value === 'suspended')

/*
  '다시 확인' 버튼을 두는 이유. 통신 오류였거나 관리자가 정지를 풀었을 때
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
