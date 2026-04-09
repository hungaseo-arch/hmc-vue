import { ref, onMounted, onUnmounted } from 'vue'

/**
 * React: useState + useEffect + window.addEventListener
 * Vue:   ref + onMounted + onUnmounted (자동 cleanup)
 */
export function useScrolled(threshold = 10) {
  const scrolled = ref(false)

  const handleScroll = () => {
    scrolled.value = window.scrollY > threshold
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  return { scrolled }
}
