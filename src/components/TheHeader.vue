<template>
  <header
    ref="headerRef"
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/95 backdrop-blur-sm shadow-md' : 'bg-white shadow-sm'
    ]"
  >
    <!-- Top info bar -->
    <!-- h-8 로 고정한다. TheLayout 의 md:pt-24(96px) = 이 띠 32px + 아래 h-16. -->
    <div class="bg-primary text-primary-foreground h-8 hidden md:flex items-center">
      <div class="container mx-auto px-4 flex w-full items-center justify-between text-xs">
        <div class="text-xs opacity-80">
          2026년 표어: 주안에 뿌리내리고 함께 자라나 열매 맺는 성도의 교회 (요 15:5)
        </div>
        <div class="flex items-center">
          <!--
            예전에는 [회원 승인][접속 기록][관리자][이름 · 내 정보][로그아웃] 이
            다섯 개가 나란히 걸려 있어, 정작 왼쪽의 표어보다 눈에 먼저 들어왔다.
            매일 누르는 것도 아닌데 늘 펼쳐 둘 이유가 없다. 이름 하나만 남기고
            나머지는 그 안에 접는다.
          -->
          <div v-if="isLoggedIn" class="relative" @focusout="onUserMenuFocusOut">
            <button
              id="userbtn"
              type="button"
              class="flex items-center gap-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              :aria-expanded="userMenuOpen"
              aria-haspopup="true"
              aria-controls="usermenu"
              @click="userMenuOpen = !userMenuOpen"
              @keydown.escape="userMenuOpen = false"
            >
              <span v-if="isAdmin" class="bg-white/20 text-xs px-1.5 py-0.5 rounded-full font-medium">{{ isSuperAdmin ? '슈퍼관리자' : '관리자' }}</span>
              {{ displayName }}님
              <ChevronDown
                aria-hidden="true"
                :class="['w-3 h-3 transition-transform duration-200', userMenuOpen ? 'rotate-180' : '']"
              />
            </button>

            <Transition name="dropdown">
              <!--
                담는 상자일 뿐이라 role 을 주지 않는다. 안의 링크에 포커스가
                있을 때도 ESC 로 닫히도록 여기서 keydown 을 받는다.

                z-50 이 필요하다. 이 메뉴는 위쪽 띠 안에 있는데 아래 대메뉴가
                문서 순서상 뒤에 오고 그쪽 항목도 position:relative 라, 쌓임
                순서를 정해 주지 않으면 '소식과나눔' 글자가 이 흰 판 위로
                올라와 겹쳐 보인다.
              -->
              <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
              <div
                v-if="userMenuOpen"
                id="usermenu"
                aria-labelledby="userbtn"
                class="absolute top-full right-0 z-50 mt-1.5 bg-white text-foreground rounded-xl shadow-xl border border-border/50 py-1.5 min-w-36 overflow-hidden"
                @keydown.escape="userMenuOpen = false"
              >
                <RouterLink
                  :to="ROUTE_PATHS.PROFILE"
                  class="block px-4 py-2 text-xs hover:bg-muted hover:text-primary transition-colors"
                  active-class="bg-primary/10 !text-primary font-medium"
                >
                  내 정보
                </RouterLink>
                <!-- 관리자 전용 입구. 2등급이 아니면 메뉴 자체를 보여주지 않는다. -->
                <template v-if="accessLevel >= 2">
                  <div class="my-1 border-t border-border/60" />
                  <RouterLink
                    :to="ROUTE_PATHS.ADMIN_MEMBERS"
                    class="block px-4 py-2 text-xs hover:bg-muted hover:text-primary transition-colors"
                    active-class="bg-primary/10 !text-primary font-medium"
                  >
                    회원 승인
                  </RouterLink>
                  <RouterLink
                    v-if="accessLevel >= 3"
                    :to="ROUTE_PATHS.ADMIN_AUDIT_LOG"
                    class="block px-4 py-2 text-xs hover:bg-muted hover:text-primary transition-colors"
                    active-class="bg-primary/10 !text-primary font-medium"
                  >
                    접속 기록
                  </RouterLink>
                </template>
                <div class="my-1 border-t border-border/60" />
                <button
                  type="button"
                  class="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-muted transition-colors cursor-pointer"
                  @click="handleLogout"
                >
                  로그아웃
                </button>
              </div>
            </Transition>
          </div>

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
          class="lg:hidden -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :aria-label="isMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
          :aria-expanded="isMenuOpen"
          aria-controls="mobile-menu"
          @click="isMenuOpen = !isMenuOpen"
          @keydown.escape="isMenuOpen = false"
        >
          <X v-if="isMenuOpen" class="w-5 h-5" aria-hidden="true" />
          <Menu v-else class="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition name="slide-down">
      <!--
        패널 안에서 스크롤한다. 대메뉴를 다 펼치면 작은 폰(667px)에서는 로그아웃·
        회원가입이 화면 밖으로 나가므로 높이를 헤더(4rem) 뺀 뷰포트로 묶는다.
        키보드 핸들러는 안의 버튼·링크가 맡고 이 div 는 ESC 만 받는다.
      -->
      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
      <div
        v-if="isMenuOpen"
        id="mobile-menu"
        class="lg:hidden border-t border-border bg-white overflow-y-auto overscroll-contain max-h-[calc(100dvh-4rem)]"
        @keydown.escape="isMenuOpen = false"
      >
        <div class="container mx-auto px-4 py-3 space-y-1">
          <div v-for="item in NAV_ITEMS" :key="item.label">
            <button
              type="button"
              :aria-expanded="mobileOpenMenu === item.label"
              :aria-controls="`mobile-${item.label}`"
              class="w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                  class="block px-3 py-2.5 min-h-10 text-sm rounded-lg mb-0.5 transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
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
              <RouterLink :to="ROUTE_PATHS.PROFILE" class="px-3 py-2.5 min-h-10 text-sm text-muted-foreground flex items-center gap-2 rounded-lg hover:bg-muted transition-colors">
                <span v-if="isAdmin" class="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">{{ isSuperAdmin ? '슈퍼관리자' : '관리자' }}</span>
                {{ displayName }}님 · 내 정보
              </RouterLink>
              <RouterLink
                v-if="accessLevel >= 2"
                :to="ROUTE_PATHS.ADMIN_MEMBERS"
                class="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors font-medium text-primary"
              >
                회원 승인
              </RouterLink>
              <RouterLink
                v-if="accessLevel >= 3"
                :to="ROUTE_PATHS.ADMIN_AUDIT_LOG"
                class="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors font-medium text-primary"
              >
                접속 기록
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

  <!-- 모바일 메뉴 뒤 딤. 헤더는 z-50 이라 위에 남고, 딤을 누르면 닫힌다. -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isMenuOpen"
        class="fixed inset-0 top-16 z-40 bg-black/30 lg:hidden"
        aria-hidden="true"
        @click="isMenuOpen = false"
      />
    </Transition>
  </Teleport>
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
const userMenuOpen = ref(false)

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
/** 위 메뉴와 같은 이유로 relatedTarget 을 본다 - onDropdownFocusOut 설명 참고. */
function onUserMenuFocusOut(e: FocusEvent) {
  const wrap = e.currentTarget as HTMLElement | null
  const next = e.relatedTarget as Node | null
  if (wrap && next && wrap.contains(next)) return
  userMenuOpen.value = false
}

const mobileOpenMenu = ref<string | null>(null)
const headerRef = ref<HTMLDivElement | null>(null)

const { scrolled } = useScrolled(10)
const { isLoggedIn, isAdmin, isSuperAdmin, displayName, accessLevel, logout } = useAuth()
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
  userMenuOpen.value = false
})

function toggleMobileMenu(label: string) {
  mobileOpenMenu.value = mobileOpenMenu.value === label ? null : label
}

// 모바일 메뉴가 열린 동안 뒤 본문이 스크롤되지 않게 한다. 패널 안에서만 스크롤.
watch(isMenuOpen, open => {
  document.body.style.overflow = open ? 'hidden' : ''
})

function handleClickOutside(e: MouseEvent | TouchEvent) {
  if (!activeDropdown.value && !userMenuOpen.value && !isMenuOpen.value) return
  if (headerRef.value && !headerRef.value.contains(e.target as Node)) {
    activeDropdown.value = null
    userMenuOpen.value = false
    isMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('touchstart', handleClickOutside, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('touchstart', handleClickOutside)
  document.body.style.overflow = ''
})
</script>
