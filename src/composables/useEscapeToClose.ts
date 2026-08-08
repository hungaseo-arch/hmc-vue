import { onMounted, onUnmounted } from 'vue'

export interface EscapeTarget {
  isOpen: () => boolean
  close: () => void
}

/**
 * Esc 키로 모달을 닫는다.
 *
 * 모달이 Teleport 로 body 에 붙어 있어 오버레이에 @keydown 을 걸어도 포커스가
 * 그 안에 없으면 안 잡힌다. 그래서 document 에 한 번만 건다.
 *
 * 한 페이지에 모달이 여럿이면 배열 뒤쪽(= 나중에 열리는 쪽)부터 닫는다.
 */
export function useEscapeToClose(targets: EscapeTarget[]) {
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    for (let i = targets.length - 1; i >= 0; i--) {
      if (targets[i].isOpen()) {
        targets[i].close()
        return
      }
    }
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onUnmounted(() => document.removeEventListener('keydown', onKeydown))
}
