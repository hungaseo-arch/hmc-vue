<template>
  <TheLayout>
    <!--
      이 페이지의 제목. 화면에는 로고와 슬라이드 문구가 이미 있어 굳이 한 번 더
      쓰지 않지만, 검색엔진과 화면낭독기에는 h1 이 하나 있어야 한다.
      (슬라이드 문구는 석 장이라 h1 로 둘 수 없다 - 페이지 제목은 하나다.)
    -->
    <h1 class="sr-only">자카르타 한마음교회</h1>

    <!-- ── Hero Carousel ─────────────────────────────────────────
      마우스를 올리거나 포커스가 들어오면 자동 넘김을 멈춘다. 글을 읽는 중에
      화면이 바뀌지 않게 하는 것이라 클릭 동작이 아니다. 키보드 사용자를 위해
      focusin/focusout 을 이미 쌍으로 달아 뒀다.
    -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
    <section
      class="relative h-[70svh] max-h-125 md:h-150 md:max-h-none overflow-hidden touch-pan-y select-none"
      aria-roledescription="carousel"
      aria-label="교회 소개 슬라이드"
      @mouseenter="pauseAuto"
      @mouseleave="resumeAuto"
      @focusin="pauseAuto"
      @focusout="resumeAuto"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
    >
      <div
        v-for="(slide, i) in heroSlides"
        :key="i"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} / ${heroSlides.length}`"
        :aria-hidden="i !== current"
        :inert="i !== current || undefined"
        :class="[
          'absolute inset-0 transition-opacity duration-1000',
          i === current ? 'opacity-100' : 'opacity-0'
        ]"
      >
        <!-- 제목·구절은 아래 텍스트로 읽히므로 alt 는 사진 자체를 설명한다. -->
        <img
          v-if="shown.has(i)"
          :src="heroSrc(slide.bg, 1600)"
          :srcset="heroSrcset(slide.bg)"
          sizes="100vw"
          :alt="slide.alt"
          width="1600"
          height="900"
          :fetchpriority="i === 0 ? 'high' : 'auto'"
          draggable="false"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-linear-to-b from-black/50 via-black/40 to-black/60" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center text-white px-14 sm:px-16 md:px-24">
            <p
              :class="[
                'text-sm md:text-base font-medium mb-3 text-white/80 uppercase tracking-widest transition-all duration-700',
                i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              ]"
            >
              {{ slide.title }}
            </p>
            <!-- 크기는 그대로 두고 태그만 낮춘다. 석 장 모두 h1 이면 h1 이 셋이 된다. -->
            <p
              :class="[
                'text-2xl md:text-4xl lg:text-5xl font-bold mb-4 leading-snug break-keep max-w-3xl mx-auto transition-all duration-700 delay-200',
                i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              ]"
              style="font-family: 'Noto Serif KR', serif"
            >
              {{ slide.subtitle }}
            </p>
            <p
              :class="[
                'text-sm md:text-lg text-white/70 transition-all duration-700 delay-300',
                i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              ]"
            >
              {{ slide.verse }}
            </p>
          </div>
        </div>
      </div>

      <!-- Carousel controls -->
      <button
        type="button"
        aria-label="이전 슬라이드"
        class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/30 sm:bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        @click="prev"
      >
        <ChevronLeft class="w-5 h-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="다음 슬라이드"
        class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/30 sm:bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        @click="next"
      >
        <ChevronRight class="w-5 h-5" aria-hidden="true" />
      </button>

      <!-- Dots -->
      <!-- 버튼은 24×24 로 손가락이 닿게, 보이는 점은 안쪽 span 이 그린다. -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1" role="tablist" aria-label="슬라이드 선택">
        <button
          v-for="(slide, i) in heroSlides"
          :key="i"
          type="button"
          role="tab"
          :aria-label="slide.title"
          :aria-selected="i === current"
          class="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          @click="current = i"
        >
          <span
            :class="[
              'block h-2 rounded-full transition-all duration-300',
              i === current ? 'w-6 bg-white' : 'w-2 bg-white/50'
            ]"
          />
        </button>
      </div>
    </section>

    <!-- ── 이번 주 설교 (히어로와 한 화면으로 이어지는 요약) ────────── -->
    <section class="py-12 bg-white border-b border-border">
      <div class="container mx-auto px-4 max-w-3xl">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-bold flex items-center gap-2">
            <div class="w-8 h-0.5 bg-primary" />
            이번 주 설교
          </h2>
          <RouterLink
            :to="ROUTE_PATHS.SUNDAY_SERMON"
            class="text-sm text-primary hover:underline font-medium"
          >
            전체 보기 →
          </RouterLink>
        </div>
        <SermonCard v-if="thisWeekSermon" :sermon="thisWeekSermon" />
      </div>
    </section>

    <!-- ── 예배시간 + 오시는 길 ─────────────────────────────────── -->
    <section class="py-20 bg-primary text-primary-foreground">
      <div class="container mx-auto px-4">
        <div class="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div>
            <div class="w-12 h-1 bg-primary-foreground/40 rounded-full mb-4" />
            <h2 class="text-3xl font-bold mb-6">예배 시간</h2>
            <ul class="space-y-3">
              <li
                v-for="ws in mainSchedules"
                :key="ws.name"
                class="flex items-center gap-3 text-sm border-b border-primary-foreground/15 pb-3 last:border-0"
              >
                <Clock class="w-4 h-4 text-primary-foreground/70 shrink-0" />
                <span class="font-medium">{{ ws.name }}</span>
                <span class="ml-auto text-right text-primary-foreground/80">{{ ws.time }}</span>
              </li>
            </ul>
            <RouterLink
              :to="ROUTE_PATHS.WORSHIP_GUIDE"
              class="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/90 hover:underline"
            >
              전체 예배 시간 보기 →
            </RouterLink>
          </div>
          <div>
            <div class="w-12 h-1 bg-primary-foreground/40 rounded-full mb-4" />
            <h2 class="text-3xl font-bold mb-6">오시는 길</h2>
            <div class="space-y-4 text-primary-foreground/80 mb-6">
              <div class="flex items-start gap-3">
                <MapPin class="w-5 h-5 mt-0.5 text-primary-foreground shrink-0" />
                <div>
                  <p class="font-medium text-primary-foreground">주소</p>
                  <p v-for="line in CHURCH.addressLines" :key="line" class="text-sm first:mt-1">{{ line }}</p>
                </div>
              </div>
            </div>
            <div class="rounded-2xl overflow-hidden shadow-2xl h-48">
              <iframe
                src="https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1sHanmaum+Church+Jakarta!6i15"
                class="w-full h-full"
                style="border: 0"
                allowfullscreen
                loading="lazy"
                title="한마음교회 위치"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 처음 오신 분 CTA ─────────────────────────────────────── -->
    <section class="py-16 bg-muted/50">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-2xl md:text-3xl font-bold mb-3">처음 오셨나요?</h2>
        <p class="text-muted-foreground mb-6">예배 시간, 오시는 길, 자주 묻는 질문을 미리 안내해 드립니다</p>
        <RouterLink
          :to="ROUTE_PATHS.WELCOME"
          class="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          처음 오신 분 안내 보기
        </RouterLink>
      </div>
    </section>

    <!-- ── News ───────────────────────────────────────────────── -->
    <section class="py-20 bg-white">
      <div class="container mx-auto px-4">
        <div class="flex items-end justify-between mb-10">
          <div>
            <div class="w-12 h-1 bg-primary rounded-full mb-3" />
            <h2 class="text-3xl font-bold">교회소식</h2>
          </div>
          <RouterLink
            :to="ROUTE_PATHS.CHURCH_NEWS"
            class="text-sm text-primary hover:underline font-medium"
          >
            전체 보기 →
          </RouterLink>
        </div>
        <div v-if="isApproved" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <NewsCard
            v-for="item in newsItems"
            :key="item.id"
            :item="item"
          />
        </div>
        <!-- 교회소식은 승인된 성도 전용이다. 그 전에는 아예 요청하지 않는다. -->
        <div
          v-else
          class="rounded-2xl border border-dashed border-border bg-muted/30 px-8 py-14 text-center"
        >
          <p class="text-muted-foreground mb-4">
            {{ isLoggedIn ? '교회소식은 승인이 끝난 뒤 볼 수 있습니다.' : '교회소식은 성도님께만 공개됩니다.' }}
          </p>
          <RouterLink
            :to="isLoggedIn ? ROUTE_PATHS.PENDING : ROUTE_PATHS.LOGIN"
            class="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {{ isLoggedIn ? '승인 상태 확인' : '로그인하고 보기' }}
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ── Education programs ─────────────────────────────────── -->
    <section class="py-20 bg-muted/50">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 text-primary font-medium text-sm mb-3">
            <div class="w-8 h-0.5 bg-primary" />
            교육과 양육
            <div class="w-8 h-0.5 bg-primary" />
          </div>
          <h2 class="text-3xl font-bold">모든 세대가 함께하는 교회</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
          <RouterLink
            v-for="(edu, i) in educationLinks"
            :key="i"
            :to="edu.path"
            :class="`block bg-linear-to-br ${edu.bg} rounded-2xl p-6 text-white text-center hover:shadow-lg transition-all hover:-translate-y-1`"
          >
            <div class="text-3xl mb-3">{{ edu.emoji }}</div>
            <div class="font-bold text-lg">{{ edu.label }}</div>
            <div class="text-xs opacity-80 mt-1">{{ edu.sub }}</div>
          </RouterLink>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import SermonCard from '@/components/SermonCard.vue'
import NewsCard from '@/components/NewsCard.vue'
import { ROUTE_PATHS } from '@/lib/index'
import { worshipSchedules } from '@/data/index'
import { CHURCH } from '@/data/church'
import { useChurchNews } from '@/composables/useChurchNews'
import { useSermons } from '@/composables/useSermons'
import { useAuth } from '@/composables/useAuth'

// ── 데이터 ──────────────────────────────────────────────────────
// bg 는 public/pict 의 확장자·폭 없는 경로. 폭은 heroSrc 가 붙인다.
// 이전 사진(Unsplash)은 photo-archive/replaced-photos.md 에 보관.
const heroSlides = [
  {
    bg: '/pict/main01',
    alt: '자카르타 한마음교회 주일예배 설교 - 고형돈 목사',
    title: '2026년 교회 표어',
    subtitle: '주안에 뿌리내리고 함께 자라나 열매 맺는 성도의 교회',
    verse: '요한복음 15:5',
  },
  {
    bg: '/pict/main02',
    alt: '한마음교회 교인 체육대회 게임 장면',
    title: '한마음교회 방문을 환영합니다',
    subtitle: '내가 이 반석 위에 교회를 세우리니',
    verse: '마태복음 16:18',
  },
  {
    bg: '/pict/main03',
    alt: '한마음교회 교인 체육대회 단체사진',
    title: '환영하며 축복합니다',
    subtitle: '교인으로 등록하시면 건강한 신앙인으로 함께 자라갈 수 있습니다',
    verse: '인도네시아 자카르타 한마음교회',
  },
]

/** 화면 폭에 맞는 크기만 받는다(640·1024·1600 webp 를 미리 만들어 두었다). */
function heroSrc(bg: string, w: number) {
  return `${bg}-${w}.webp`
}
function heroSrcset(bg: string) {
  return [640, 1024, 1600].map(w => `${heroSrc(bg, w)} ${w}w`).join(', ')
}

const educationLinks = [
  { label: 'J-Angels', sub: '영유아·유치부', path: ROUTE_PATHS.J_ANGELS, bg: 'from-green-400 to-green-600', emoji: '🌱' },
  { label: 'J-Kids', sub: '아동부', path: ROUTE_PATHS.J_KIDS, bg: 'from-blue-400 to-blue-600', emoji: '⭐' },
  { label: 'Ja-Yu', sub: '중고등부', path: ROUTE_PATHS.JA_YU, bg: 'from-orange-400 to-orange-600', emoji: '🔥' },
  { label: '청년부', sub: '대학·직장인', path: ROUTE_PATHS.YOUTH, bg: 'from-purple-400 to-purple-600', emoji: '✨' },
  { label: '성인교육', sub: '장년 양육', path: ROUTE_PATHS.ADULT_EDU, bg: 'from-primary to-primary/80', emoji: '📖' },
]

// ── 캐러셀 로직 ─────────────────────────────────────────────────
const current = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
let preloadTimer: ReturnType<typeof setTimeout> | undefined

// 화면에 들어온 적 있는 장만 <img> 를 만든다. 세 장을 한꺼번에 걸어두면
// opacity 0 이어도 브라우저는 전부 받아버려 첫 화면이 3배로 무거워진다.
const shown = ref(new Set([0]))
function reveal(i: number) {
  shown.value.add(i)
  // 다음 장을 미리 받아둬야 전환 순간이 비지 않는다.
  shown.value.add((i + 1) % heroSlides.length)
}
watch(current, reveal)

// WCAG 2.2.2 - 자동으로 움직이는 것은 멈출 수 있어야 한다.
// 마우스를 올리거나 키보드 포커스가 들어오면 넘김을 세운다.
const AUTOPLAY_MS = 5000
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function startAuto() {
  if (prefersReducedMotion) return
  clearInterval(timer)
  timer = setInterval(() => {
    current.value = (current.value + 1) % heroSlides.length
  }, AUTOPLAY_MS)
}
function pauseAuto() { clearInterval(timer) }
function resumeAuto() { startAuto() }

const { isLoggedIn, isApproved } = useAuth()
// 설교 목록 페이지와 같은 캐시. 어느 쪽을 먼저 열든 요청은 한 번이다.
const { recent: recentSermons, fetchSermons } = useSermons()
const thisWeekSermon = computed(() => recentSermons.value[0] ?? null)
const { items: newsAll, fetchNews } = useChurchNews()
const newsItems = computed(() => newsAll.value.slice(0, 3))

// 승인된 상태에서만 요청한다. 홈에 머문 채 로그인한 경우도 곧바로 채워진다.
watch(isApproved, v => { if (v) fetchNews() }, { immediate: true })

onMounted(() => {
  startAuto()

  // 첫 장이 뜨고 난 뒤에 두 번째를 받는다. LCP 와 대역폭을 다투지 않게.
  preloadTimer = setTimeout(() => reveal(0), 2500)

  void fetchSermons()
})

onUnmounted(() => {
  clearInterval(timer)
  clearTimeout(preloadTimer)
})

// 주보에 있는 예배를 모두 보여준다(교육부·새벽예배 포함, 2026-10 목사님 요청).
const mainSchedules = computed(() => worshipSchedules)

function prev() {
  current.value = (current.value - 1 + heroSlides.length) % heroSlides.length
}

function next() {
  current.value = (current.value + 1) % heroSlides.length
}

// 손가락으로 좌우로 밀어 넘기기. 버튼·키보드와 병행하는 추가 동작이다.
// 세로 스크롤 중에는 반응하지 않도록 가로 이동이 더 크고 50px 이상일 때만.
let startX = 0
let startY = 0
function onPointerDown(e: PointerEvent) {
  startX = e.clientX
  startY = e.clientY
}
function onPointerUp(e: PointerEvent) {
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
  if (dx < 0) next()
  else prev()
  // 방금 넘겼는데 곧바로 자동으로 또 넘어가지 않게 타이머를 처음부터.
  pauseAuto()
  resumeAuto()
}
</script>
