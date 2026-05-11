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
        <div class="text-xs opacity-80">
          2026년 표어: 주안에 뿌리내리고 함께 자라나 열매 맺는 성도의 교회 (요 15:5)
        </div>
        <div class="flex items-center gap-3">
          <RouterLink
            v-if="isLoggedIn"
            :to="ROUTE_PATHS.PROFILE"
            class="flex items-center gap-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity underline underline-offset-2"
          >
            <span v-if="isAdmin" class="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium no-underline" style="text-decoration: none;">관리자</span>
            {{ displayName }}
          </RouterLink>
          <button
            v-if="isLoggedIn"
            class="text-xs opacity-80 hover:opacity-100 transition-opacity underline underline-offset-2 cursor-pointer"
            @click="handleLogout"
          >
            로그아웃
          </button>
          <RouterLink
            v-else
            :to="ROUTE_PATHS.LOGIN"
            class="text-xs opacity-80 hover:opacity-100 transition-opacity underline underline-offset-2 cursor-pointer"
          >
            로그인
          </RouterLink>
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
              <ChevronDown
                :class="[
                  'w-3.5 h-3.5 transition-transform duration-200',
                  activeDropdown === item.label ? 'rotate-180' : ''
                ]"
              />
            </button>

            <Transition name="dropdown">
              <div
                v-if="activeDropdown === item.label"
                class="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-border/50 py-1.5 min-w-40 overflow-hidden"
              >
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

          <!-- 모바일 인증 버튼 -->
          <div class="border-t border-border pt-3 mt-2">
            <template v-if="isLoggedIn">
              <RouterLink :to="ROUTE_PATHS.PROFILE" class="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2 rounded-lg hover:bg-muted transition-colors">
                <span v-if="isAdmin" class="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">관리자</span>
                {{ displayName }}
              </RouterLink>
              <button class="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors text-red-500" @click="handleLogout">로그아웃</button>
            </template>
            <template v-else>
              <RouterLink :to="ROUTE_PATHS.LOGIN" class="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors">로그인</RouterLink>
              <RouterLink :to="ROUTE_PATHS.SIGNUP" class="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors font-medium text-primary">회원가입</RouterLink>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, X, ChevronDown, Phone, MapPin } from 'lucide-vue-next'
import { NAV_ITEMS, ROUTE_PATHS } from '@/lib/index'
import { useScrolled } from '@/composables/useScrolled'
import { useAuth } from '@/composables/useAuth'

const isMenuOpen = ref(false)
const activeDropdown = ref<string | null>(null)
const mobileOpenMenu = ref<string | null>(null)
const headerRef = ref<HTMLDivElement | null>(null)

const { scrolled } = useScrolled(10)
const { isLoggedIn, isAdmin, displayName, logout } = useAuth()
const router = useRouter()

async function handleLogout() {
  try {
    await logout()
  } finally {
    router.push(ROUTE_PATHS.HOME)
  }
}

const route = useRoute()

watch(route, () => {
  isMenuOpen.value = false
  activeDropdown.value = null
  mobileOpenMenu.value = null
})

function toggleMobileMenu(label: string) {
  mobileOpenMenu.value = mobileOpenMenu.value === label ? null : label
}

function handleClickOutside(e: MouseEvent) {
  if (!activeDropdown.value) return
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
