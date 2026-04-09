import { ref, onMounted, onUnmounted } from 'vue'

/**
 * React: framer-motion whileInView
 * Vue:   IntersectionObserver composable (경량, 의존성 없음)
 */
export function useScrollReveal(threshold = 0.15) {
  const el = ref<HTMLElement | null>(null)
  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!el.value) return
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisible.value = true
          observer?.disconnect() // once: true 효과
        }
      },
      { threshold }
    )
    observer.observe(el.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { el, isVisible }
}
