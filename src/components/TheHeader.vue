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
          <!-- 관리자 전용 입구. 2등급이 아니면 메뉴 자체를 보여주지 않는다. -->
          <RouterLink
            v-if="accessLevel >= 2"
            :to="ROUTE_PATHS.ADMIN_MEMBERS"
            class="text-xs opacity-80 hover:opacity-100 transition-opacity underline underline-offset-2"
          >
            회원 승인
          </RouterLink>
          <RouterLink
            v-if="isLoggedIn"
            :to="ROUTE_PATHS.PROFILE"
            class="flex items-center gap-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity underline underline-offset-2"
          >
            <span v-if="isAdmin" class="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium no-underline" style="text-decoration: none;">관리자</span>
            <!-- '로그인 중' 을 붙인다. 이름만 있으면 지금 로그인 상태인지
                 확인하러 눌러 보게 된다. -->
            {{ displayName }}님, 로그인 중
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
            src="/logo_hmc.webp"
            alt="자카르타 한마음교회"
            width="320"
            height="122"
            fetchpriority="high"
            class="h-12 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
        </RouterLink>

        <!-- Desktop nav -->
        <nav class="hidden lg:flex items-center gap-1">
          <!--
            마우스를 올리면 열리는 메뉴다. 키보드로도 같게 동작해야 하므로
            focusin/focusout 을 같이 단다. 탭으로 메뉴 버튼에 닿으면 열리고,
            하위 링크를 다 지나 밖으로 나가면 닫힌다.
            이 div 자체는 위치 잡기용 껍데기고 실제 조작은 안의 <button> 이
            맡는다. 그래서 정적 요소 규칙만 끈다.
          -->
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
          <div
            v-for="item in NAV_ITEMS"
            :key="item.label"
            class="relative"
            @mouseenter="activeDropdown = item.label"
            @mouseleave="activeDropdown = null"
            @focusin="activeDropdown = item.label"
            @focusout="onDropdownFocusOut($event, item.label)"
          >
            <button
              type="button"
              :id="`navbtn-${item.label}`"
              :aria-expanded="activeDropdown === item.label"
              aria-haspopup="true"
              :aria-controls="`navmenu-${item.label}`"
              :class="[
                'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                activeDropdown === item.label
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted hover:text-primary'
              ]"
              @click="activeDropdown = activeDropdown === item.label ? null : item.label"
              @keydown.escape="activeDropdown = null"
            >
              {{ item.label }}
              <ChevronDown
                aria-hidden="true"
                :class="[
                  'w-3.5 h-3.5 transition-transform duration-200',
                  activeDropdown === item.label ? 'rotate-180' : ''
                ]"
              />
            </button>

            <Transition name="dropdown">
              <!--
                펼침 목록. 안의 링크에 포커스가 있을 때도 ESC 로 닫히도록
                여기서 keydown 을 받는다. 조작은 링크와 버튼이 하고 이 div 는
                담는 상자라서 role 을 따로 주지 않는다.
              -->
              <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
              <div
                v-if="activeDropdown === item.label"
                :id="`navmenu-${item.label}`"
                :aria-labelledby="`navbtn-${item.label}`"
                class="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-border/50 py-1.5 min-w-40 overflow-hidden"
                @keydown.escape="activeDropdown = null"
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
          type="button"
          class="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :aria-label="isMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
          :aria-expanded="isMenuOpen"
          aria-controls="mobile-menu"
          @click="isMenuOpen = !isMenuOpen"
        >
          <X v-if="isMenuOpen" class="w-5 h-5" aria-hidden="true" />
          <Menu v-else class="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition name="slide-down">
      <div
        v-if="isMenuOpen"
        id="mobile-menu"
        class="lg:hidden border-t border-border bg-white overflow-hidden"
      >
        <div class="container mx-auto px-4 py-3 space-y-1">
          <div v-for="item in NAV_ITEMS" :key="item.label">
            <button
              type="button"
              :aria-expanded="mobileOpenMenu === item.label"
              :aria-controls="`mobile-${item.label}`"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="toggleMobileMenu(item.label)"
            >
              {{ item.label }}
              <ChevronDown
                aria-hidden="true"
                :class="[
                  'w-4 h-4 transition-transform duration-200',
                  mobileOpenMenu === item.label ? 'rotate-180' : ''
                ]"
              />
            </button>

            <Transition name="slide-down">
              <div
                v-if="mobileOpenMenu === item.label"
                :id="`mobile-${item.label}`"
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
                {{ displayName }}님, 로그인 중
              </RouterLink>
              <RouterLink
                v-if="accessLevel >= 2"
                :to="ROUTE_PATHS.ADMIN_MEMBERS"
                class="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors font-medium text-primary"
              >
                회원 승인
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
import { Menu, X, ChevronDown } from 'lucide-vue-next'
import { NAV_ITEMS, ROUTE_PATHS } from '@/lib/index'
import { useScrolled } from '@/composables/useScrolled'
import { useAuth } from '@/composables/useAuth'

const isMenuOpen = ref(false)
const activeDropdown = ref<string | null>(null)

/*
  focusout 은 같은 메뉴 안에서 버튼 → 하위 링크로 옮겨갈 때도 터진다.
  그때 닫아버리면 탭을 한 번 누르는 순간 메뉴가 사라진다.
  새로 포커스를 받는 곳(relatedTarget)이 이 메뉴 밖일 때만 닫는다.
*/
function onDropdownFocusOut(e: FocusEvent, label: string) {
  const wrap = e.currentTarget as HTMLElement | null
  const next = e.relatedTarget as Node | null
  if (wrap && next && wrap.contains(next)) return
  if (activeDropdown.value === label) activeDropdown.value = null
}
const mobileOpenMenu = ref<string | null>(null)
const headerRef = ref<HTMLDivElement | null>(null)

const { scrolled } = useScrolled(10)
const { isLoggedIn, isAdmin, displayName, accessLevel, logout } = useAuth()
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
