<!--
  "공유하기" 버튼. 소식·주보·사진첩 상세에서 쓴다.

  - 휴대폰(카카오톡·WhatsApp 이 깔린 곳)은 브라우저의 공유창(navigator.share)을
    띄운다 - 거기서 카카오톡·WhatsApp 을 고른다. 앱 SDK 없이도 된다.
  - PC 처럼 공유창이 없는 환경은 작은 메뉴: 링크 복사 / WhatsApp 으로 보내기.
    카카오톡 PC 는 주소를 받는 창이 없어 링크 복사로 붙여 넣는다.
  - 공유하는 것은 페이지 주소뿐이다. 사진의 서명 URL(1시간짜리)은 넣지 않는다.
    교인 전용 페이지라 받는 사람은 로그인해야 열린다(로그인 뒤 원래 페이지로 온다).
-->
<template>
  <div class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition"
      :aria-expanded="menuOpen"
      @click="onClick"
    >
      <Share2 class="w-4 h-4" aria-hidden="true" />
      공유하기
    </button>

    <div
      v-if="menuOpen"
      role="menu"
      class="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-white shadow-lg p-1.5 z-20"
    >
      <button type="button" role="menuitem" class="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted text-left" @click="copyLink">
        <LinkIcon class="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        {{ copied ? '복사됐습니다' : '링크 복사 (카카오톡에 붙여넣기)' }}
      </button>
      <a role="menuitem" :href="waHref" target="_blank" rel="noopener noreferrer" class="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted" @click="menuOpen = false">
        <MessageCircle class="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        WhatsApp 으로 보내기
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Share2, Link as LinkIcon, MessageCircle } from 'lucide-vue-next'
import { SITE_URL, SITE_NAME } from '@/lib/seo'

const props = defineProps<{
  title: string
  /** 공유할 경로. 비우면 현재 주소. */
  path?: string
}>()

const url = computed(() => `${SITE_URL}${props.path ?? window.location.pathname}`)
const text = computed(() => `[${SITE_NAME}] ${props.title}`)
const waHref = computed(() => `https://wa.me/?text=${encodeURIComponent(`${text.value}\n${url.value}`)}`)

const menuOpen = ref(false)
const copied = ref(false)

async function onClick() {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: text.value, text: text.value, url: url.value })
      return
    } catch {
      // 사용자가 공유창을 닫은 경우 - 아무것도 하지 않는다.
      return
    }
  }
  menuOpen.value = !menuOpen.value
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(`${text.value}\n${url.value}`)
    copied.value = true
    setTimeout(() => { copied.value = false; menuOpen.value = false }, 1200)
  } catch {
    // 클립보드가 막힌 환경: 주소창에서 복사하도록 둔다.
    window.prompt('아래 주소를 복사해 주세요', url.value)
    menuOpen.value = false
  }
}

// 메뉴 바깥을 누르면 닫는다.
function onDocClick(e: MouseEvent) {
  if (!menuOpen.value) return
  const el = e.target as HTMLElement
  if (!el.closest('[role="menu"]') && !el.closest('[aria-expanded]')) menuOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
