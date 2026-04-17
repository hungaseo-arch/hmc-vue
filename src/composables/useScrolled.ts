import { ref, onMounted, onUnmounted } from 'vue'

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
