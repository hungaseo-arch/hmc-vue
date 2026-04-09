# React → Vue 3 마이그레이션 가이드
## 자카르타 한마음교회 (hmc-react → hmc-vue)

---

## 🚀 빠른 시작

```bash
cd hmc-vue
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드
```

---

## 📁 프로젝트 구조 비교

```
React (이전)                          Vue 3 (이후)
──────────────────────────────────   ──────────────────────────────────
src/
├── components/
│   └── Layout.tsx          →        components/
│       (Header+Footer+Layout)  →    ├── TheHeader.vue   ← 헤더 전용
│                                    ├── TheFooter.vue   ← 푸터 전용
│                                    ├── TheLayout.vue   ← 래퍼 (slot)
│                                    ├── PageHeader.vue  ← 공통 페이지헤더 (중복제거)
│                                    ├── SermonCard.vue  ← 설교 카드
│                                    ├── NewsCard.vue    ← 뉴스 카드
│                                    └── MinistryPage.vue ← 교육부서 공통
├── pages/
│   ├── home/Index.tsx      →        pages/home/HomePage.vue
│   ├── introduction/       →        pages/introduction/*.vue
│   ├── worship/            →        pages/worship/*.vue
│   ├── education/          →        pages/education/*.vue
│   └── admin/              →        pages/admin/*.vue
├── hooks/
│   └── use-mobile.tsx      →        composables/
│   (useEffect 직접사용)     →        ├── useScrolled.ts
│                                    └── useScrollReveal.ts
├── App.tsx (react-router)  →        router/index.ts + App.vue
└── main.tsx                →        main.ts
```

---

## 🔄 핵심 변환 규칙

### 1. 상태 관리: useState → ref / reactive

```tsx
// ❌ React
const [isMenuOpen, setIsMenuOpen] = useState(false);
const [count, setCount] = useState(0);
setIsMenuOpen(true);
setCount(prev => prev + 1);
```

```vue
<!-- ✅ Vue 3 -->
<script setup lang="ts">
import { ref } from 'vue'

const isMenuOpen = ref(false)
const count = ref(0)
isMenuOpen.value = true
count.value++
</script>
```

### 2. 파생 상태: useMemo → computed

```tsx
// ❌ React (렌더마다 재실행)
const sorted = [...sermons].sort((a, b) =>
  sortDesc ? b.id - a.id : a.id - b.id
);

// 또는
const sorted = useMemo(() =>
  [...sermons].sort(...), [sortDesc]
);
```

```vue
<!-- ✅ Vue 3 (sortDesc 변경 시만 재계산, 자동 캐싱) -->
<script setup lang="ts">
import { computed } from 'vue'

const sortedSermons = computed(() =>
  [...sermons].sort((a, b) => sortDesc.value ? b.id - a.id : a.id - b.id)
)
</script>
```

### 3. 사이드 이펙트: useEffect → onMounted / watch

```tsx
// ❌ React
useEffect(() => {
  const timer = setInterval(() => { ... }, 5000);
  return () => clearInterval(timer); // cleanup
}, []);

useEffect(() => {
  setIsMenuOpen(false); // location 변경 시 실행
}, [location]);
```

```vue
<!-- ✅ Vue 3 -->
<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

let timer: ReturnType<typeof setInterval>

onMounted(() => {
  timer = setInterval(() => { ... }, 5000)
})

onUnmounted(() => {          // cleanup 자동화
  clearInterval(timer)
})

const route = useRoute()
watch(route, () => {         // route 변경 감지
  isMenuOpen.value = false
})
</script>
```

### 4. 이벤트 처리: onClick → @click

```tsx
// ❌ React
<button onClick={() => setIsMenuOpen(!isMenuOpen)}>
<button onClick={handleClick}>
<div onMouseEnter={() => setActive(item.label)}>
```

```vue
<!-- ✅ Vue 3 -->
<button @click="isMenuOpen = !isMenuOpen">
<button @click="handleClick">
<div @mouseenter="activeDropdown = item.label">
```

### 5. 조건부 렌더링: 삼항/&&  → v-if / v-show

```tsx
// ❌ React
{isMenuOpen && <div>...</div>}
{staff.image ? <img src={staff.image} /> : <UserIcon />}
```

```vue
<!-- ✅ Vue 3 -->
<div v-if="isMenuOpen">...</div>

<img v-if="staff.image" :src="staff.image" />
<UserIcon v-else />
```

### 6. 리스트 렌더링: .map() → v-for

```tsx
// ❌ React
{NAV_ITEMS.map((item) => (
  <div key={item.label} className="relative">
    {item.label}
  </div>
))}
```

```vue
<!-- ✅ Vue 3 -->
<div
  v-for="item in NAV_ITEMS"
  :key="item.label"
  class="relative"
>
  {{ item.label }}
</div>
```

### 7. Props: 인터페이스 → defineProps

```tsx
// ❌ React
function PageHeader({ title, subtitle }: {
  title: string;
  subtitle?: string;
}) { ... }
```

```vue
<!-- ✅ Vue 3 -->
<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
  bgColor?: string
}>(), {
  bgColor: 'from-primary to-primary/80',
})
</script>
```

### 8. children → slot

```tsx
// ❌ React
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

// 사용
<Layout><PageContent /></Layout>
```

```vue
<!-- ✅ Vue 3 TheLayout.vue -->
<template>
  <div>
    <TheHeader />
    <main><slot /></main>
    <TheFooter />
  </div>
</template>

<!-- 사용 -->
<TheLayout>
  <PageContent />
</TheLayout>
```

### 9. 클래스 바인딩: className 템플릿 → :class

```tsx
// ❌ React
<button className={`px-4 py-2 ${
  isActive ? 'bg-primary text-white' : 'bg-muted'
}`}>
```

```vue
<!-- ✅ Vue 3 -->
<button :class="[
  'px-4 py-2',
  isActive ? 'bg-primary text-white' : 'bg-muted'
]">

<!-- 또는 객체 문법 -->
<button :class="{
  'bg-primary text-white': isActive,
  'bg-muted': !isActive
}">
```

### 10. 애니메이션: framer-motion → Transition + CSS

```tsx
// ❌ React (framer-motion 의존성)
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >...</motion.div>
  )}
</AnimatePresence>
```

```vue
<!-- ✅ Vue 3 (내장 Transition, 의존성 없음) -->
<Transition name="dropdown">
  <div v-if="isOpen">...</div>
</Transition>

<!-- index.css에 CSS 정의 -->
<style>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
</style>
```

### 11. 라우팅: react-router-dom → vue-router

```tsx
// ❌ React
import { Link, NavLink, useLocation } from 'react-router-dom';
<Link to="/path">링크</Link>
<NavLink to="/path" className={({ isActive }) => isActive ? 'active' : ''}>
```

```vue
<!-- ✅ Vue 3 -->
<RouterLink to="/path">링크</RouterLink>
<RouterLink
  to="/path"
  active-class="bg-primary/10 text-primary font-medium"
>
```

### 12. Hooks → Composables

```tsx
// ❌ React Hook
function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, [threshold]);
  return scrolled;
}
```

```ts
// ✅ Vue Composable (src/composables/useScrolled.ts)
export function useScrolled(threshold = 10) {
  const scrolled = ref(false)
  const handleScroll = () => {
    scrolled.value = window.scrollY > threshold
  }
  onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }))
  onUnmounted(() => window.removeEventListener('scroll', handleScroll))
  return { scrolled }
}
```

---

## 📦 의존성 변경

| 항목 | React (이전) | Vue 3 (이후) |
|------|-------------|-------------|
| 프레임워크 | react + react-dom | vue |
| 라우팅 | react-router-dom | vue-router |
| 상태관리 | (없음/Context) | pinia (준비) |
| 애니메이션 | **framer-motion** | **내장 Transition + CSS** |
| 아이콘 | lucide-react | lucide-vue-next |
| 유틸리티 훅 | (custom hooks) | @vueuse/core |
| 빌드 | Vite | Vite |
| 스타일 | Tailwind CSS v4 | Tailwind CSS v4 |
| 타입 | TypeScript | TypeScript |

> 💡 **framer-motion 제거**: Vue 내장 `<Transition>`과 CSS animation으로 대체하여 번들 크기 약 40KB 절감

---

## 🏗️ 아키텍처 개선 사항

### 중복 제거 (DRY)
- React: 5개 파일에 `PageHeader` 함수 각각 정의 → Vue: `PageHeader.vue` 단일 컴포넌트
- React: `MinistryPage` 내부 함수 → Vue: `MinistryPage.vue` 재사용 컴포넌트
- Vue 교육 페이지 (`JAngelsPage`, `JKidsPage` 등): 데이터만 변경, 구조 100% 공유

### 성능 최적화
- `computed` 캐싱: 설교 정렬, 연혁 역순 등 파생 데이터를 computed로 캐싱
- `IntersectionObserver`: framer-motion `whileInView` 대신 네이티브 API 사용
- 라우터 lazy loading: 모든 페이지 컴포넌트를 동적 import로 분리

### 상태 관리 구조
```
현재: ref/reactive (컴포넌트 로컬 상태)
향후 확장: Pinia store 추가 가능
  - useSermonStore: 설교 필터/정렬 상태
  - useUIStore: 전역 로딩/알림 상태
```

---

## 🎨 디자인 시스템 유지

CSS 변수 기반 디자인 토큰 완전 이식:
- `--primary`, `--muted`, `--border` 등 모든 토큰 동일
- Tailwind v4 `@theme inline` 매핑 동일
- 한국어 폰트 (Noto Sans KR, Noto Serif KR) 동일
- 다크모드 `.dark` 클래스 동일

---

## 📝 파일별 변환 요약

| React 파일 | Vue 파일 | 주요 변환 포인트 |
|-----------|---------|----------------|
| `Layout.tsx` | `TheHeader.vue` + `TheFooter.vue` + `TheLayout.vue` | useEffect→watch, AnimatePresence→Transition |
| `home/Index.tsx` | `home/HomePage.vue` | useState+useEffect→ref+onMounted, framer→CSS |
| `introduction/Greeting.tsx` | `GreetingPage.vue` | 반복 `<p>` → v-for |
| `introduction/History.tsx` | `HistoryPage.vue` | `.reverse()` → computed |
| `introduction/Staff.tsx` | `StaffPage.vue` | 삼항 → v-if/v-else |
| `introduction/WorshipGuide.tsx` | `WorshipGuidePage.vue` | 중첩 삼항 → 함수로 분리 |
| `introduction/Directions.tsx` | `DirectionsPage.vue` | 하드코딩 → 데이터 배열+v-for |
| `worship/Worship.tsx` | `SundaySermonPage.vue` 등 | useState+sort → computed |
| `education/Education.tsx` | `MinistryPage.vue` + 5개 페이지 | render prop → slot+props |
| `admin/Admin.tsx` | 3개 Admin 페이지 | 인라인 배열 → script 데이터 분리 |
