import { useRouter } from 'vue-router'

/**
 * 뒤로가기 버튼. 목록에서 들어왔으면 history.back 으로 스크롤 위치까지
 * 돌려주고, 링크로 바로 들어와 앞 기록이 없으면 fallback 목록으로 보낸다.
 */
export function useBackTo(fallback: string) {
  const router = useRouter()
  return () => {
    if (window.history.state?.back) router.back()
    else void router.replace(fallback)
  }
}
