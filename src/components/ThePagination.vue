<template>
  <!--
    버튼이 아니라 링크(?page=N)다. 크롤러가 따라가 2페이지 이후 상세 글을 찾을 수 있고,
    새 탭으로 열기·주소 복사도 된다. 1페이지는 쿼리 없이 깨끗한 주소로 보낸다.
  -->
  <nav v-if="totalPages > 1" class="flex items-center justify-center gap-1 mt-6" aria-label="페이지 이동">
    <span
      v-if="modelValue === 1"
      class="inline-flex h-10 w-10 lg:h-9 lg:w-9 items-center justify-center rounded-lg text-muted-foreground opacity-40"
      aria-hidden="true"
    >
      <ChevronLeft class="w-4 h-4" />
    </span>
    <RouterLink
      v-else
      :to="target(modelValue - 1)"
      class="inline-flex h-10 w-10 lg:h-9 lg:w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition"
      aria-label="이전 페이지"
    >
      <ChevronLeft class="w-4 h-4" />
    </RouterLink>

    <template v-for="(page, i) in pages" :key="i">
      <span v-if="page === '…'" class="w-6 text-center text-sm text-muted-foreground select-none">…</span>
      <RouterLink
        v-else
        :to="target(page)"
        :class="[
          'inline-flex items-center justify-center h-10 w-10 lg:h-9 lg:w-9 rounded-lg text-sm font-medium transition-colors',
          page === modelValue
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        ]"
        :aria-label="`${page}페이지`"
        :aria-current="page === modelValue ? 'page' : undefined"
      >
        {{ page }}
      </RouterLink>
    </template>

    <span
      v-if="modelValue === totalPages"
      class="inline-flex h-10 w-10 lg:h-9 lg:w-9 items-center justify-center rounded-lg text-muted-foreground opacity-40"
      aria-hidden="true"
    >
      <ChevronRight class="w-4 h-4" />
    </span>
    <RouterLink
      v-else
      :to="target(modelValue + 1)"
      class="inline-flex h-10 w-10 lg:h-9 lg:w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition"
      aria-label="다음 페이지"
    >
      <ChevronRight class="w-4 h-4" />
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: number
  totalPages: number
  /** 현재 페이지 좌우로 보여줄 개수. 좁은 화면에서 버튼이 넘치지 않게 한다. */
  siblings?: number
}>(), { siblings: 1 })

const route = useRoute()

// 1 … 4 [5] 6 … 16 - 페이지 수가 늘어도 버튼 개수는 고정이다.
const pages = computed<(number | '…')[]>(() => {
  const total = props.totalPages
  const cur = props.modelValue
  const s = props.siblings
  const window = s * 2 + 5 // 처음·끝·생략 2개 + 현재 주변

  if (total <= window) return Array.from({ length: total }, (_, i) => i + 1)

  const left = Math.max(2, cur - s)
  const right = Math.min(total - 1, cur + s)
  const out: (number | '…')[] = [1]
  if (left > 2) out.push('…')
  for (let p = left; p <= right; p++) out.push(p)
  if (right < total - 1) out.push('…')
  out.push(total)
  return out
})

/** 다른 쿼리(정렬 등)는 두고 page 만 바꾼 이동 대상. 1페이지는 page 를 뺀다. */
function target(page: number) {
  return { query: { ...route.query, page: page > 1 ? String(page) : undefined } }
}
</script>
