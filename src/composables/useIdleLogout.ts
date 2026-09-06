import { ref, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth, setAuthNotice } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'

/*
  아무 조작 없이 30분이 지나면 스스로 로그아웃한다.

  왜 필요한가: 교회 사무실이나 로비의 공용 컴퓨터에서 교인 명부·접속 기록을
  열어 둔 채 자리를 뜨는 일이 실제로 생긴다. '이 기기는 제 것입니다'(authStorage)
  는 브라우저를 닫을 때를 대비하지만, 창을 열어 둔 채 떠나면 아무 소용이 없다.

  남은 시간을 세는 기준은 타이머가 아니라 '마지막 조작 시각'이다. setTimeout 은
  노트북 덮개를 닫거나 배경 탭이 되면 멈추거나 늦게 깨어난다. 시각을 저장해 두고
  깨어날 때마다 지금과 견주면, 잠자는 사이에 흐른 시간도 그대로 셈에 들어간다.

  그 시각을 localStorage 에 두는 이유는 탭 여러 개 때문이다. 한 탭에서 글을
  쓰는 동안 옆 탭이 혼자 시간을 세어 로그아웃시키면 안 된다.
*/
const IDLE_MS = 30 * 60 * 1000

/** 끝나기 얼마 전부터 알릴지. 영상 보는 중처럼 조작 없이 머무는 때를 위한 것. */
const WARN_MS = 60 * 1000

/*
  사용자 id 를 키에 붙인다. 공용 컴퓨터에서 A 가 로그아웃하고 B 가 바로
  로그인했을 때, A 가 남긴 마지막 활동 시각을 B 의 것으로 읽지 않기 위해서다.
*/
function activityKey(uid: string | undefined) {
  return `hmc:last-activity:${uid ?? 'anon'}`
}

let currentKey = activityKey(undefined)

/*
  mousemove 는 넣지 않는다. 이 사이트에는 떠오르는 애니메이션이 많아서, 커서가
  가만히 있어도 그 아래로 요소가 지나가면 mousemove 가 뜬다. 그러면 빈 화면을
  띄워 둔 컴퓨터가 영원히 '사용 중'이 된다.
*/
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

/** localStorage 를 못 쓰는 환경(사생활 보호 모드)에서 쓰는 대비책. */
let fallbackAt = Date.now()

function readActivity(): number {
  try {
    const n = Number(localStorage.getItem(currentKey))
    if (Number.isFinite(n) && n > 0) return n
  } catch {
    // 아래 fallbackAt 으로 넘어간다.
  }
  return fallbackAt
}

function writeActivity(at: number) {
  fallbackAt = at
  try {
    localStorage.setItem(currentKey, String(at))
  } catch {
    // 이 탭에서만 시간을 세게 된다. 로그아웃 자체는 그대로 동작한다.
  }
}

/**
 * App.vue 에서 한 번만 부른다. 로그인 중일 때만 시계가 돈다.
 * 반환값은 남은 시간을 알리는 창(App.vue)이 쓴다.
 */
export function useIdleLogout() {
  const { isLoggedIn, logout, user } = useAuth()
  const router = useRouter()
  const route = useRoute()

  const warning = ref(false)
  const secondsLeft = ref(0)

  let ticker: ReturnType<typeof setInterval> | null = null

  function markActivity() {
    writeActivity(Date.now())
    warning.value = false
  }

  async function expire() {
    stop()
    warning.value = false
    // logout() 이 감사 로그의 'logout' 을 먼저 남긴다. 세션이 사라진 뒤에는
    // 남길 수 없다 — useAuth.logout 설명 참고.
    await logout()
    setAuthNotice('30분 동안 사용하지 않아 자동으로 로그아웃되었습니다. 계속하시려면 다시 로그인해 주세요.')
    /*
      교인 전용 화면에 남아 있다면 로그인 화면으로 보낸다. 그대로 두면 이미
      권한이 없는 화면을 계속 보고 있게 되고, 무엇이 잘못됐는지 알 수 없다.
      공개 화면이라면 그 자리에 그대로 둔다 — 읽던 설교를 빼앗을 이유가 없다.
    */
    const guarded = ((route.meta.access as number | undefined) ?? 0) >= 1 || !!route.meta.requiresAuth
    if (guarded) await router.replace(ROUTE_PATHS.LOGIN)
  }

  function tick() {
    const idle = Date.now() - readActivity()
    if (idle >= IDLE_MS) {
      void expire()
      return
    }
    const left = IDLE_MS - idle
    warning.value = left <= WARN_MS
    if (warning.value) secondsLeft.value = Math.ceil(left / 1000)
  }

  function start() {
    if (ticker) return
    currentKey = activityKey(user.value?.id)
    markActivity()
    for (const e of ACTIVITY_EVENTS) {
      window.addEventListener(e, markActivity, { passive: true })
    }
    // 덮개를 닫았다 연 직후에는 다음 tick 을 기다리지 않고 바로 셈한다.
    document.addEventListener('visibilitychange', onVisible)
    ticker = setInterval(tick, 1000)
  }

  function stop() {
    if (ticker) {
      clearInterval(ticker)
      ticker = null
    }
    for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, markActivity)
    document.removeEventListener('visibilitychange', onVisible)
  }

  function onVisible() {
    if (document.visibilityState === 'visible') tick()
  }

  /** '더 있겠습니다' 를 누른 것. 남은 시간을 처음부터 다시 센다. */
  function stay() {
    markActivity()
  }

  // 로그인 상태가 될 때 켜고, 풀리면 끈다. immediate 로 새로고침 직후에도 켜진다.
  watch(isLoggedIn, on => (on ? start() : stop()), { immediate: true })

  onUnmounted(stop)

  return { warning, secondsLeft, stay }
}
