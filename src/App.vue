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
      <p class="text-[20px] font-semibold text-foreground">로그인하는 중입니다</p>
      <p class="mt-3 text-[18px] leading-relaxed text-muted-foreground">
        잠시만 기다려 주세요.<br />
        이 화면에서 뒤로가기를 누르지 마세요.
      </p>
    </div>
  </div>

  <RouterView v-else />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { oauthReturn, supabase } from '@/lib/supabase'
import { init, RETURN_TO_KEY, setAuthNotice } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'

const router = useRouter()

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
  // replaceState 라서 히스토리에 남지 않는다 — 뒤로가기로 인가 코드가 붙은
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
    await router.replace(takeReturnTo())
  }

  oauthPending.value = false
})
</script>
