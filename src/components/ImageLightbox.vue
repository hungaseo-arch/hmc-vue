<!--
  사진·주보 확대 보기. 목록 화면의 사진을 누르면 전체 화면으로 띄운다.

  - 처음엔 화면에 맞춰 보여주고, 사진을 한 번 더 누르면 실제 크기(원본 픽셀)로
    바뀌어 스크롤하며 본다. 주보처럼 글씨가 작은 스캔본을 읽을 때 쓴다.
  - 좌우 화살표·버튼으로 다음 장. Esc 와 바깥 클릭으로 닫는다.
  - 휴대폰은 두 손가락 확대(브라우저 기본)도 그대로 된다.
  - index 를 v-model 로 받는다. null 이면 닫힌 상태.
-->
<template>
  <Teleport to="body">
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
    <div
      v-if="current !== null"
      role="dialog"
      aria-modal="true"
      :aria-label="`${label} 확대 보기`"
      class="fixed inset-0 z-50 bg-black/95 text-white flex flex-col"
      @click.self="close"
    >
      <div class="flex items-center justify-between gap-3 px-4 py-3 text-sm shrink-0">
        <span class="text-white/80">{{ label }} · {{ current + 1 }} / {{ images.length }}</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1 min-h-11 rounded-lg bg-white/10 hover:bg-white/20 px-3 transition"
            @click="zoomed = !zoomed"
          >
            <component :is="zoomed ? Minimize2 : Maximize2" class="w-4 h-4" aria-hidden="true" />
            {{ zoomed ? '화면에 맞추기' : '실제 크기' }}
          </button>
          <button
            type="button"
            aria-label="닫기"
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition"
            @click="close"
          >
            <X class="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!--
        좌우로 밀어 넘기기(pointerdown/up). 버튼·화살표 키와 병행하는 추가 동작이다.
        touch-action 은 세로 스크롤과 두 손가락 확대만 브라우저에 맡기고 가로는 우리가 본다.
      -->
      <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
      <div
        ref="scroller"
        class="flex-1 overflow-auto overscroll-contain"
        :style="{ touchAction: zoomed ? 'auto' : 'pan-y pinch-zoom' }"
        @click.self="onBackdropClick"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
      >
        <div :class="zoomed ? 'inline-block min-w-full p-4' : 'min-h-full flex items-center justify-center p-4'">
          <button
            type="button"
            :class="['block mx-auto', zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in']"
            :aria-label="zoomed ? '화면에 맞추기' : '실제 크기로 보기'"
            @click="zoomed = !zoomed"
          >
            <img
              :src="images[current]"
              :alt="`${label} ${current + 1}`"
              :class="zoomed ? 'max-w-none w-auto h-auto' : 'max-w-full max-h-[calc(100vh-7rem)] object-contain'"
              decoding="async"
              draggable="false"
            />
          </button>
        </div>
      </div>

      <template v-if="images.length > 1">
        <button
          type="button"
          aria-label="이전"
          class="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 sm:bg-white/10 hover:bg-white/25 transition"
          @click="go(-1)"
        >
          <ChevronLeft class="w-6 h-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="다음"
          class="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 sm:bg-white/10 hover:bg-white/25 transition"
          @click="go(1)"
        >
          <ChevronRight class="w-6 h-6" aria-hidden="true" />
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-vue-next'

const props = defineProps<{
  images: string[]
  label: string
}>()
const current = defineModel<number | null>('index', { default: null })

const zoomed = ref(false)
const scroller = ref<HTMLElement | null>(null)

function close() { current.value = null }

function go(delta: number) {
  if (current.value === null || props.images.length === 0) return
  const n = props.images.length
  current.value = (current.value + delta + n) % n
}

// 장을 넘기면 확대를 풀고 맨 위로. 열려 있는 동안은 뒤 화면이 스크롤되지 않게.
watch(current, (v) => {
  zoomed.value = false
  if (scroller.value) scroller.value.scrollTop = 0
  document.body.style.overflow = v === null ? '' : 'hidden'
})

// 좌우 스와이프. 실제 크기(zoomed)에서는 가로 스크롤이 필요하므로 끈다.
let startX = 0
let startY = 0
function onPointerDown(e: PointerEvent) {
  startX = e.clientX
  startY = e.clientY
}
let swipedAt = 0
function onPointerUp(e: PointerEvent) {
  if (zoomed.value || props.images.length < 2) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
  swipedAt = Date.now()
  go(dx < 0 ? 1 : -1)
}
// 마우스로 빈 곳을 끌어 넘긴 직후에 따라오는 click 으로 닫히지 않게.
function onBackdropClick() {
  if (Date.now() - swipedAt < 300) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (current.value === null) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>
