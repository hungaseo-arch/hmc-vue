<template>
  <header
    ref="headerRef"
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/95 backdrop-blur-sm shadow-md' : 'bg-white shadow-sm'
    ]"
  >
    <!-- Top info bar -->
    <div class="bg-primary text-primary-foreground py-1.5 hidden md:block">
      <div class="container mx-auto px-4 flex items-center justify-between text-xs">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1">
            <MapPin class="w-3 h-3" />
            Darmawangsa Square, Jakarta 12160, Indonesia
          </span>
          <span class="flex items-center gap-1">
            <Phone class="w-3 h-3" />
            021-739-5035
          </span>
        </div>
        <div class="text-xs opacity-80">
          2026년 표어: 주안에 뿌리내리고 함께 자라나 열매 맺는 성도의 교회 (요 15:5)
        </div>
      </div>
    </div>

    <!-- Main nav -->
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <RouterLink :to="ROUTE_PATHS.HOME" class="flex items-center group">
          <img
            src="/logo_hmc.png"
            alt="자카르타 한마음교회"
            class="h-12 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
        </RouterLink>

        <!-- Desktop nav -->
        <!-- React: onMouseEnter/Leave → Vue: @mouseenter/@mouseleave -->
        <nav class="hidden lg:flex items-center gap-1">
          <div
            v-for="item in NAV_ITEMS"
            :key="item.label"
            class="relative"
            @mouseenter="activeDropdown = item.label"
            @mouseleave="activeDropdown = null"
          >
            <button
              :class="[
                'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeDropdown === item.label
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted hover:text-primary'
              ]"
            >
              {{ item.label }}
              <!-- React: className 조건 → Vue: :class 바인딩 -->
              <ChevronDown
                :class="[
                  'w-3.5 h-3.5 transition-transform duration-200',
                  activeDropdown === item.label ? 'rotate-180' : ''
                ]"
              />
            </button>

            <!-- React: AnimatePresence + motion.div → Vue: <Transition> -->
            <Transition name="dropdown">
              <div
                v-if="activeDropdown === item.label"
                class="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-border/50 py-1.5 min-w-[160px] overflow-hidden"
              >
                <!-- React: NavLink isActive prop → Vue: RouterLink + useLink or active-class -->
                <RouterLink
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="block px-4 py-2 text-sm transition-colors duration-150 text-foreground hover:bg-muted hover:text-primary"
                  active-class="bg-primary/10 !text-primary font-medium"
                >
                  {{ child.label }}
                </RouterLink>
              </div>
            </Transition>
          </div>
        </nav>

        <!-- Mobile menu button -->
        <!-- React: onClick={() => setState(!state)} → Vue: @click="toggle()" -->
        <button
          class="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="메뉴 열기"
          @click="isMenuOpen = !isMenuOpen"
        >
          <X v-if="isMenuOpen" class="w-5 h-5" />
          <Menu v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <!-- React: AnimatePresence height → Vue: <Transition name="slide-down"> -->
    <Transition name="slide-down">
      <div
        v-if="isMenuOpen"
        class="lg:hidden border-t border-border bg-white overflow-hidden"
      >
        <div class="container mx-auto px-4 py-3 space-y-1">
          <div v-for="item in NAV_ITEMS" :key="item.label">
            <button
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              @click="toggleMobileMenu(item.label)"
            >
              {{ item.label }}
              <ChevronDown
                :class="[
                  'w-4 h-4 transition-transform duration-200',
                  mobileOpenMenu === item.label ? 'rotate-180' : ''
                ]"
              />
            </button>

            <Transition name="slide-down">
              <div
                v-if="mobileOpenMenu === item.label"
                class="overflow-hidden pl-3"
              >
                <RouterLink
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="block px-3 py-2 text-sm rounded-lg mb-0.5 transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                  active-class="bg-primary/10 !text-primary font-medium"
                >
                  {{ child.label }}
                </RouterLink>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X, ChevronDown, Phone, MapPin } from 'lucide-vue-next'
import { NAV_ITEMS, ROUTE_PATHS } from '@/lib/index'
import { useScrolled } from '@/composables/useScrolled'

// React: useState(false) → Vue: ref(false)
const isMenuOpen = ref(false)
const activeDropdown = ref<string | null>(null)
const mobileOpenMenu = ref<string | null>(null)
const headerRef = ref<HTMLDivElement | null>(null)

// composable로 분리된 스크롤 감지
// React: useEffect + window.addEventListener → composable 내부에서 처리
const { scrolled } = useScrolled(10)

const route = useRoute()

// React: useEffect([location]) → Vue: watch(route, ...)
watch(route, () => {
  isMenuOpen.value = false
  activeDropdown.value = null
  mobileOpenMenu.value = null
})

function toggleMobileMenu(label: string) {
  mobileOpenMenu.value = mobileOpenMenu.value === label ? null : label
}

// React: useEffect + document.addEventListener → Vue: onMounted/onUnmounted
function handleClickOutside(e: MouseEvent) {
  if (headerRef.value && !headerRef.value.contains(e.target as Node)) {
    activeDropdown.value = null
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>
