<template>
  <nav v-if="totalPages > 1" class="flex items-center justify-center gap-1 mt-6" aria-label="페이지 이동">
    <button
      type="button"
      class="p-2 rounded-lg text-muted-foreground hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="modelValue === 1"
      aria-label="이전 페이지"
      @click="go(modelValue - 1)"
    >
      <ChevronLeft class="w-4 h-4" />
    </button>

    <template v-for="(page, i) in pages" :key="i">
      <span v-if="page === '…'" class="w-6 text-center text-sm text-muted-foreground select-none">…</span>
      <button
        v-else
        type="button"
        :class="[
          'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
          page === modelValue
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        ]"
        :aria-label="`${page}페이지`"
        :aria-current="page === modelValue ? 'page' : undefined"
        @click="go(page)"
      >
        {{ page }}
      </button>
    </template>

    <button
      type="button"
      class="p-2 rounded-lg text-muted-foreground hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="modelValue === totalPages"
      aria-label="다음 페이지"
      @click="go(modelValue + 1)"
    >
      <ChevronRight class="w-4 h-4" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: number
  totalPages: number
  /** 현재 페이지 좌우로 보여줄 개수. 좁은 화면에서 버튼이 넘치지 않게 한다. */
  siblings?: number
}>(), { siblings: 1 })

const emit = defineEmits<{ 'update:modelValue': [number] }>()

// 1 … 4 [5] 6 … 16 — 페이지 수가 늘어도 버튼 개수는 고정이다.
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

function go(page: number) {
  if (page < 1 || page > props.totalPages || page === props.modelValue) return
  emit('update:modelValue', page)
}
</script>
