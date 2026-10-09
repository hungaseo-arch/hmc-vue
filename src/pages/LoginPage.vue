<template>
  <div class="min-h-screen bg-muted flex items-center justify-center px-4 py-10">
    <div class="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md p-6 sm:p-8">
      <div class="text-center mb-8">
        <img src="/logo_hmc.webp" alt="한마음교회" width="320" height="122" class="h-16 w-auto mx-auto mb-5 object-contain" />
        <h1 class="text-xl font-bold text-foreground">로그인</h1>
        <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
          교인 전용 자료를 보시려면<br />로그인이 필요합니다.
        </p>
      </div>

      <!-- role=alert: 화면 낭독기가 실패 사유를 즉시 읽어준다. -->
      <p
        v-if="errorMsg"
        role="alert"
        class="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm leading-relaxed text-red-700"
      >
        {{ errorMsg }}
      </p>

      <!--
        카카오 버튼이 첫 번째다. 노년 사용자에게 이메일과 비밀번호를 새로
        외우게 하는 것이 이 화면에서 가장 큰 장벽이기 때문이다.

        색과 문구는 카카오 로그인 디자인 가이드를 따른다. 배경 #FEE500,
        글자는 검정 85%, 문구는 '카카오'로 시작한다. 이 두 색은 브랜드가
        정한 값이라 사이트 팔레트로 바꿔 쓸 수 없다.
        https://developers.kakao.com/docs/latest/ko/kakaologin/design-guide
      -->
      <!--
        체크박스를 버튼 '위' 에 둔다. 아래에 있으면 이미 카카오로 넘어간 뒤라
        고를 기회가 없다. 기본은 켜짐 - 대부분 본인 휴대폰으로 들어오고,
        매번 로그인하게 만드는 것이 이 사이트에서 가장 큰 이탈 요인이다.
      -->
      <label class="mb-4 flex items-start gap-3 cursor-pointer select-none">
        <input
          v-model="rememberMe"
          type="checkbox"
          class="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
        />
        <span class="text-sm leading-relaxed text-foreground">
          이 기기는 제 것입니다
          <span class="block text-muted-foreground">
            {{ rememberMe
              ? '다음에 오실 때 로그인이 유지됩니다.'
              : '브라우저를 닫으면 로그아웃됩니다. 공용 컴퓨터에 알맞습니다.' }}
          </span>
        </span>
      </label>

      <button
        type="button"
        :disabled="kakaoBusy"
        class="w-full py-2.5 rounded-xl flex items-center justify-center gap-3 text-base font-semibold transition hover:brightness-95 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
        style="background-color: #FEE500; color: rgba(0, 0, 0, 0.85)"
        @click="handleKakao"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
          <path d="M12 3C6.477 3 2 6.463 2 10.735c0 2.756 1.86 5.174 4.653 6.545-.153.55-.986 3.542-1.016 3.777 0 0-.02.17.09.235.11.065.24.015.24.015.31-.043 3.594-2.35 4.162-2.75.61.086 1.24.131 1.871.131 5.523 0 10-3.463 10-7.735S17.523 3 12 3z" />
        </svg>
        {{ kakaoBusy ? '카카오로 이동 중...' : '카카오로 시작하기' }}
      </button>

      <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
        카카오톡에 로그인되어 있으면 비밀번호를 넣지 않아도 됩니다.
        처음이시면 카카오 화면에서 [동의하고 계속하기]를 눌러 주세요.
      </p>

      <!-- 기존 이메일 로그인은 그대로 남긴다. 이미 쓰고 계신 분들이 있다. -->
      <div class="mt-8 pt-6 border-t border-border">
        <button
          type="button"
          class="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold transition hover:brightness-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          :aria-expanded="showEmail"
          aria-controls="email-login"
          @click="showEmail = !showEmail"
        >
          {{ showEmail ? '이메일 로그인 닫기' : '이메일로 로그인하기' }}
        </button>

        <form v-show="showEmail" id="email-login" class="mt-5 space-y-4" @submit.prevent="handleLogin">
          <div>
            <label for="login-email" class="block text-sm font-semibold mb-2 text-foreground">이메일</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              :required="showEmail"
              autocomplete="email"
              inputmode="email"
              placeholder="이메일 주소"
              class="w-full py-2.5 border border-border rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
          <div>
            <label for="login-password" class="block text-sm font-semibold mb-2 text-foreground">비밀번호</label>
            <input
              id="login-password"
              v-model="password"
              type="password"
              :required="showEmail"
              autocomplete="current-password"
              placeholder="비밀번호"
              class="w-full py-2.5 border border-border rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            {{ submitting ? '로그인 중...' : '로그인' }}
          </button>
        </form>
      </div>

      <div class="mt-8 text-center text-sm space-y-3">
        <p class="text-muted-foreground">
          계정이 없으신가요?
          <RouterLink :to="ROUTE_PATHS.SIGNUP" class="text-primary hover:underline font-semibold">회원가입</RouterLink>
        </p>
        <RouterLink :to="ROUTE_PATHS.HOME" class="block text-muted-foreground hover:underline">홈으로 돌아가기</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth, takeAuthNotice } from '@/composables/useAuth'
import { isRemembering, setRememberMe } from '@/lib/authStorage'
import { ROUTE_PATHS } from '@/lib/index'

const route = useRoute()
const router = useRouter()
const { login, signInWithKakao } = useAuth()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const kakaoBusy = ref(false)
const showEmail = ref(false)
const errorMsg = ref('')

/*
  체크를 바꾸는 즉시 반영한다. 로그인 버튼을 누를 때 한 번에 적용하면,
  카카오로 넘어갔다 돌아오는 동안 PKCE 검증값이 엉뚱한 저장소에 남아
  교환이 실패한다. 검증값도 sb- 접두사라 같이 옮겨져야 한다.
*/
const rememberMe = ref(isRemembering())
watch(rememberMe, v => setRememberMe(v))

// 카카오에서 실패해 돌아온 경우 App.vue 가 남겨 둔 안내를 꺼내 보여준다.
onMounted(() => {
  errorMsg.value = takeAuthNotice()
})

async function handleKakao() {
  submitting.value = false
  kakaoBusy.value = true
  errorMsg.value = ''
  try {
    // 가드에 막혀 여기로 왔다면 원래 가려던 곳으로 되돌려 준다.
    const back = typeof route.query.next === 'string' ? route.query.next : ROUTE_PATHS.HOME
    await signInWithKakao(back)
    // 성공하면 카카오 화면으로 넘어가므로 여기 아래는 실행되지 않는다.
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '카카오 로그인을 시작하지 못했습니다.'
    kakaoBusy.value = false
  }
}

async function handleLogin() {
  submitting.value = true
  errorMsg.value = ''
  try {
    await login(email.value, password.value)
    const back = typeof route.query.next === 'string' ? route.query.next : ROUTE_PATHS.HOME
    router.push(back)
  } catch {
    // 원문(영어) 오류를 그대로 보여주지 않는다. 무엇을 다시 해야 하는지만 알린다.
    errorMsg.value = '이메일 또는 비밀번호가 맞지 않습니다. 다시 확인해 주세요.'
  } finally {
    submitting.value = false
  }
}
</script>
