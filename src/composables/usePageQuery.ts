import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * 현재 페이지 번호를 ?page= 와 맞춘다. 상세로 갔다가 돌아와도, 새로고침해도
 * 보던 페이지가 유지되고 특정 페이지를 링크로 공유할 수 있다.
 * 1페이지는 쿼리를 지워 주소를 깨끗하게 둔다.
 */
export function usePageQuery() {
  const route = useRoute()
  const router = useRouter()
  const path = route.path
  let last = 1
  return computed<number>({
    get() {
      // 다른 경로로 떠나는 중에는 마지막 값을 유지한다(불필요한 재요청 방지).
      if (route.path !== path) return last
      const n = Number(route.query.page)
      last = Number.isInteger(n) && n > 0 ? n : 1
      return last
    },
    set(n) {
      if (route.path !== path) return
      void router.replace({ query: { ...route.query, page: n > 1 ? String(n) : undefined } })
    },
  })
}
