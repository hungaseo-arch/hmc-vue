import { useNewsBoard } from '@/composables/useNewsBoard'

/** 교회소식 저장소. 홈 화면이 쓴다. 구현은 useNewsBoard(교회소식·선교소식 공용). */
export function useChurchNews() {
  return useNewsBoard('church')
}
