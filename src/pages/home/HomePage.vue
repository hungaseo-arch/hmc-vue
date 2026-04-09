<template>
  <TheLayout>
    <!-- ── Hero Carousel ───────────────────────────────────────── -->
    <section class="relative h-[500px] md:h-[600px] overflow-hidden">
      <!--
        React: {heroSlides.map((slide, i) => <div className={`... ${i === current ? 'opacity-100' : 'opacity-0'}`}>
        Vue:   v-for + :class 바인딩
      -->
      <div
        v-for="(slide, i) in heroSlides"
        :key="i"
        :class="[
          'absolute inset-0 transition-opacity duration-1000',
          i === current ? 'opacity-100' : 'opacity-0'
        ]"
      >
        <img :src="slide.bg" :alt="slide.title" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center text-white px-4">
            <p
              :class="[
                'text-sm md:text-base font-medium mb-3 text-white/80 uppercase tracking-widest transition-all duration-700',
                i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              ]"
            >
              {{ slide.title }}
            </p>
            <h1
              :class="[
                'text-2xl md:text-4xl lg:text-5xl font-bold mb-4 leading-snug max-w-3xl mx-auto transition-all duration-700 delay-200',
                i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              ]"
              style="font-family: 'Noto Serif KR', serif"
            >
              {{ slide.subtitle }}
            </h1>
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
      <!-- React: onClick={prev} → Vue: @click="prev()" -->
      <button
        class="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
        @click="prev"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>
      <button
        class="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors"
        @click="next"
      >
        <ChevronRight class="w-5 h-5" />
      </button>

      <!-- Dots -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        <button
          v-for="(_, i) in heroSlides"
          :key="i"
          :class="[
            'transition-all duration-300 rounded-full',
            i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'
          ]"
          @click="current = i"
        />
      </div>
    </section>

    <!-- ── Worship schedule bar ────────────────────────────────── -->
    <section class="bg-primary text-primary-foreground py-6">
      <div class="container mx-auto px-4">
        <div class="flex flex-wrap justify-center gap-6 md:gap-10">
          <!-- React: {worshipSchedules.slice(0,4).map()} → Vue: v-for with sliced computed -->
          <div
            v-for="(ws, i) in worshipSchedules.slice(0, 4)"
            :key="i"
            class="flex items-center gap-2 text-sm"
          >
            <Clock class="w-4 h-4 opacity-80" />
            <span class="font-medium">{{ ws.name }}</span>
            <span class="opacity-80">|</span>
            <span class="opacity-80">{{ ws.time }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Greeting ────────────────────────────────────────────── -->
    <section class="py-20 bg-white">
      <div class="container mx-auto px-4">
        <div class="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div>
            <div class="w-12 h-1 bg-primary rounded-full mb-4" />
            <h2
              class="text-3xl md:text-4xl font-bold mb-6 leading-snug"
              style="font-family: 'Noto Serif KR', serif"
            >
              할렐루야!<br />한마음교회 홈페이지를<br />방문해주셔서 감사드립니다.
            </h2>
            <div class="space-y-3 text-muted-foreground leading-relaxed">
              <p>세계에서 인구가 4번째로 많은 인도네시아, 무슬림들이 85% 이상이 되는 이 땅, 선교지임과 동시에 삶의 터전이기에 이곳에서 예수의 이름을 부르며 2002년도에 한마음 공동체가 세워졌습니다.</p>
              <p>외롭고 힘든 이 세상 속에서 함께 울고 웃고 기도하고 감격하며 함께 살아계신 주님을 경험하기 원하시는 분들은 언제든지 오시기 바랍니다.</p>
            </div>
            <p class="mt-6 font-semibold text-primary">한마음교회 성도 일동</p>
            <RouterLink
              :to="ROUTE_PATHS.GREETING"
              class="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              인사말 전문 보기 →
            </RouterLink>
          </div>
          <div class="relative">
            <img
              src="https://images.unsplash.com/photo-1583402435141-5fcbce5a18f4?w=800&q=80"
              alt="Jakarta"
              class="rounded-2xl w-full h-64 md:h-80 object-cover shadow-lg"
            />
            <div class="absolute -bottom-4 -left-4 bg-primary text-primary-foreground rounded-xl p-4 shadow-lg">
              <div class="text-2xl font-bold">2002</div>
              <div class="text-xs opacity-90">설립년도</div>
            </div>
            <div class="absolute -top-4 -right-4 bg-accent text-accent-foreground rounded-xl p-4 shadow-lg">
              <div class="text-2xl font-bold">24+</div>
              <div class="text-xs opacity-80">년의 역사</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Community values ───────────────────────────────────── -->
    <section class="py-20 bg-muted/50">
      <div class="container mx-auto px-4">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 text-primary font-medium text-sm mb-3">
            <div class="w-8 h-0.5 bg-primary" />
            우리는 어떤 공동체인가요
            <div class="w-8 h-0.5 bg-primary" />
          </div>
          <h2 class="text-3xl font-bold">한마음교회의 정체성</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <!--
            React: framer-motion whileInView → Vue: IntersectionObserver + CSS animation
            v-for로 반복, :style로 지연 적용
          -->
          <div
            v-for="(val, i) in communityValues"
            :key="i"
            ref="valueCards"
            class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-center opacity-0"
            :style="{ animationDelay: `${i * 0.1}s` }"
            :data-index="i"
          >
            <div :class="['w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4', val.color]">
              <component :is="val.icon" class="w-6 h-6" />
            </div>
            <h3 class="font-semibold mb-2">{{ val.label }}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">{{ val.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Recent sermons ─────────────────────────────────────── -->
    <section class="py-20 bg-white">
      <div class="container mx-auto px-4">
        <div class="flex items-end justify-between mb-10">
          <div>
            <div class="w-12 h-1 bg-primary rounded-full mb-3" />
            <h2 class="text-3xl font-bold">최근 주일설교</h2>
          </div>
          <RouterLink
            :to="ROUTE_PATHS.SUNDAY_SERMON"
            class="text-sm text-primary hover:underline font-medium hidden md:block"
          >
            전체 보기 →
          </RouterLink>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- SermonCard: 재사용 컴포넌트로 분리 -->
          <SermonCard
            v-for="(sermon, i) in sermons.slice(0, 3)"
            :key="sermon.id"
            :sermon="sermon"
            :style="{ animationDelay: `${i * 0.08}s` }"
          />
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
            :class="`block bg-gradient-to-br ${edu.bg} rounded-2xl p-6 text-white text-center hover:shadow-lg transition-all hover:-translate-y-1`"
          >
            <div class="text-3xl mb-3">{{ edu.emoji }}</div>
            <div class="font-bold text-lg">{{ edu.label }}</div>
            <div class="text-xs opacity-80 mt-1">{{ edu.sub }}</div>
          </RouterLink>
        </div>
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
            class="text-sm text-primary hover:underline font-medium hidden md:block"
          >
            전체 보기 →
          </RouterLink>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- NewsCard: 재사용 컴포넌트 -->
          <NewsCard
            v-for="item in newsItems"
            :key="item.id"
            :item="item"
          />
        </div>
      </div>
    </section>

    <!-- ── Location ───────────────────────────────────────────── -->
    <section class="py-20 bg-primary text-primary-foreground">
      <div class="container mx-auto px-4">
        <div class="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div>
            <div class="w-12 h-1 bg-primary-foreground/40 rounded-full mb-4" />
            <h2 class="text-3xl font-bold mb-6">오시는 길</h2>
            <div class="space-y-4 text-primary-foreground/80">
              <div class="flex items-start gap-3">
                <MapPin class="w-5 h-5 mt-0.5 text-primary-foreground shrink-0" />
                <div>
                  <p class="font-medium text-primary-foreground">주소</p>
                  <p class="text-sm mt-1">Pengelola Darmawangsa Square - The City Walk Lt. 1 Lot. 1 Area A</p>
                  <p class="text-sm">Jl. Darmawangsa VI &amp; IX Jakarta 12160, Indonesia</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <Clock class="w-5 h-5 mt-0.5 text-primary-foreground shrink-0" />
                <div>
                  <p class="font-medium text-primary-foreground">전화</p>
                  <p class="text-sm mt-1">021-739-5035</p>
                </div>
              </div>
            </div>
            <RouterLink
              :to="ROUTE_PATHS.DIRECTIONS"
              class="mt-8 inline-flex items-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              지도로 보기 →
            </RouterLink>
          </div>
          <div class="rounded-2xl overflow-hidden shadow-2xl h-64">
            <iframe
              src="https://maps.google.com/maps?q=Hanmaum%20Church%20Jakarta&t=&z=15&ie=UTF8&iwloc=&output=embed"
              class="w-full h-full"
              style="border: 0"
              allowfullscreen
              loading="lazy"
              title="한마음교회 위치"
            />
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight, Clock, MapPin, BookOpen, Users, Heart, Cross } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import SermonCard from '@/components/SermonCard.vue'
import NewsCard from '@/components/NewsCard.vue'
import { ROUTE_PATHS } from '@/lib/index'
import { sermons, newsItems, worshipSchedules } from '@/data/index'

// ── 데이터 ──────────────────────────────────────────────────────
const heroSlides = [
  {
    bg: 'https://images.unsplash.com/photo-1769755410067-a1ea14b0602a?w=1600&q=80',
    title: '2026년 교회 표어',
    subtitle: '주안에 뿌리내리고 함께 자라나 열매 맺는 성도의 교회',
    verse: '요한복음 15:5',
  },
  {
    bg: 'https://images.unsplash.com/photo-1759592702518-b0393a8f7eed?w=1600&q=80',
    title: '한마음교회 방문을 환영합니다',
    subtitle: '내가 이 반석 위에 교회를 세우리니',
    verse: '마태복음 16:18',
  },
  {
    bg: 'https://images.unsplash.com/photo-1583402435141-5fcbce5a18f4?w=1600&q=80',
    title: '환영하며 축복합니다',
    subtitle: '교인으로 등록하시면 건강한 신앙인으로 함께 자라갈 수 있습니다',
    verse: '인도네시아 자카르타 한마음교회',
  },
]

const communityValues = [
  { icon: BookOpen, label: '말씀공동체', desc: '성경을 배우고 훈련하며 행하는 공동체', color: 'text-chart-2' },
  { icon: Heart, label: '사랑공동체', desc: '함께 서로 사랑하는 공동체', color: 'text-destructive' },
  { icon: Users, label: '예배공동체', desc: '삼위일체 하나님을 예배하는 공동체', color: 'text-chart-1' },
  { icon: Cross, label: '선교공동체', desc: '전도와 선교를 쉬지 않는 공동체', color: 'text-chart-3' },
]

const educationLinks = [
  { label: 'J-Angels', sub: '영유아·유치부', path: ROUTE_PATHS.J_ANGELS, bg: 'from-green-400 to-green-600', emoji: '🌱' },
  { label: 'J-Kids', sub: '아동부', path: ROUTE_PATHS.J_KIDS, bg: 'from-blue-400 to-blue-600', emoji: '⭐' },
  { label: 'Ja-Yu', sub: '중고등부', path: ROUTE_PATHS.JA_YU, bg: 'from-orange-400 to-orange-600', emoji: '🔥' },
  { label: '청년부', sub: '대학·직장인', path: ROUTE_PATHS.YOUTH, bg: 'from-purple-400 to-purple-600', emoji: '✨' },
  { label: '성인교육', sub: '장년 양육', path: ROUTE_PATHS.ADULT_EDU, bg: 'from-primary to-primary/80', emoji: '📖' },
]

// ── 캐러셀 로직 ─────────────────────────────────────────────────
// React: useState(0) → Vue: ref(0)
const current = ref(0)
let timer: ReturnType<typeof setInterval>

// React: useEffect([]) → Vue: onMounted
onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % heroSlides.length
  }, 5000)

  // IntersectionObserver로 스크롤 reveal 처리
  const cards = document.querySelectorAll('[data-index]')
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          ;(entry.target as HTMLElement).classList.add('animate-fade-in-up')
          ;(entry.target as HTMLElement).style.opacity = '1'
        }
      })
    },
    { threshold: 0.1 }
  )
  cards.forEach((card) => observer.observe(card))
})

// React: useEffect return cleanup → Vue: onUnmounted
onUnmounted(() => {
  clearInterval(timer)
})

function prev() {
  current.value = (current.value - 1 + heroSlides.length) % heroSlides.length
}

function next() {
  current.value = (current.value + 1) % heroSlides.length
}
</script>
