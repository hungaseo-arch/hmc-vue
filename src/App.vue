<template>
  <!--
    카카오에서 돌아오는 그 잠깐 동안은 화면을 비워 두지 않는다. 빈 화면이나
    깜빡이는 홈 화면이 보이면 "안 됐나?" 하고 뒤로가기를 누르게 되고,
    그러면 인가 코드가 날아가 정말로 로그인이 실패한다.
  -->
  <div
    v-if="oauthPending"
    class="min-h-screen bg-muted flex items-center justify-center px-6"
    role="status"
    aria-live="polite"
  >
    <div class="text-center">
      <div
        class="mx-auto mb-6 h-14 w-14 rounded-full border-4 border-border border-t-primary motion-safe:animate-spin"
        aria-hidden="true"
      />
      <p class="text-lg font-semibold text-foreground">로그인하는 중입니다</p>
      <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
        잠시만 기다려 주세요.<br />
        이 화면에서 뒤로가기를 누르지 마세요.
      </p>
    </div>
  </div>

  <!-- 상세 → 다른 상세(관련 설교 링크)로 갈 때 같은 컴포넌트가 재사용돼 옛 글이 남지 않게 경로로 키를 준다. -->
  <RouterView v-else :key="$route.path" />

  <!--
    자동 로그아웃 1분 전 알림. 예배 영상을 보거나 주보를 오래 읽는 동안에는
    아무 조작도 하지 않으므로, 예고 없이 로그아웃되면 갑자기 화면이 바뀐 것처럼
    보인다. 남은 시간을 보여 주고 이어서 볼 기회를 준다.
    role="alertdialog" 라서 화면낭독기가 하던 말을 멈추고 이 내용을 읽는다.
  -->
  <div
    v-if="warning"
    class="fixed inset-0 z-100 bg-black/40 flex items-center justify-center px-6"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="idle-title"
  >
    <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full px-7 py-7 text-center">
      <h2 id="idle-title" class="text-lg font-semibold text-foreground">
        잠시 후 로그아웃됩니다
      </h2>
      <p class="mt-3 text-sm leading-relaxed text-muted-foreground" aria-live="polite">
        30분 동안 사용하지 않아
        <strong class="text-primary font-semibold">{{ secondsLeft }}초</strong> 뒤에
        자동으로 로그아웃됩니다.
      </p>
      <button
        type="button"
        class="mt-6 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="stay"
      >
        계속 이용하기
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { oauthReturn, supabase } from '@/lib/supabase'
import { init, logEvent, RETURN_TO_KEY, setAuthNotice } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'
import { useIdleLogout } from '@/composables/useIdleLogout'

const router = useRouter()

// 공용 컴퓨터에 로그인된 채로 남지 않게 한다 - useIdleLogout 설명 참고.
const { warning, secondsLeft, stay } = useIdleLogout()

// oauthReturn 은 supabase 클라이언트를 만들기 전에 찍어 둔 값이다.
// 여기서 window.location 을 다시 읽으면 이미 ?code= 가 지워졌을 수 있다.
const oauthPending = ref(oauthReturn.pending)

/** 주소에서 인증 관련 흔적만 걷어낸다. 다른 질의 문자열은 건드리지 않는다. */
function stripOAuthParams() {
  const url = new URL(window.location.href)
  let touched = false
  for (const key of ['code', 'error', 'error_code', 'error_description', 'state']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      touched = true
    }
  }
  if (!touched) return
  // replaceState 라서 히스토리에 남지 않는다 - 뒤로가기로 인가 코드가 붙은
  // 주소로 되돌아가지 않게 하려는 것이다. 이미 쓴 코드는 재사용할 수 없다.
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
}

/** 저장해 둔 복귀 경로. 외부 주소로 튕겨 보내지 못하게 좁게 검사한다. */
function takeReturnTo(): string {
  let saved: string | null = null
  try {
    saved = sessionStorage.getItem(RETURN_TO_KEY)
    if (saved) sessionStorage.removeItem(RETURN_TO_KEY)
  } catch {
    // 무시
  }
  if (!saved) return ROUTE_PATHS.HOME
  // '//evil.com' 이나 'https://...' 은 같은 사이트가 아니다.
  if (!saved.startsWith('/') || saved.startsWith('//')) return ROUTE_PATHS.HOME
  if (saved === ROUTE_PATHS.LOGIN || saved === ROUTE_PATHS.SIGNUP) return ROUTE_PATHS.HOME
  return saved
}

onMounted(async () => {
  // 인증 상태 판정이 끝날 때까지 기다린다. detectSessionInUrl 이 켜져 있어
  // 이 안에서 인가 코드가 세션으로 교환된다. 평소 방문에서는 즉시 끝난다.
  await init()

  if (!oauthReturn.pending) return

  const { data: { session } } = await supabase.auth.getSession()
  stripOAuthParams()

  if (oauthReturn.failed || !session) {
    setAuthNotice('카카오 로그인이 완료되지 않았습니다. 다시 한 번 [카카오로 시작하기]를 눌러 주세요.')
    await router.replace(ROUTE_PATHS.LOGIN)
  } else {
    // 'login' 기록은 여기서 남긴다. onAuthStateChange 의 SIGNED_IN 은 탭을
    // 다시 볼 때마다 재발신될 수 있어 거기서 세면 중복된다(useAuth 참고).
    void logEvent('login')
    await router.replace(takeReturnTo())
  }

  oauthPending.value = false
})
</script>
