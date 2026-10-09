<!-- 상세 화면의 삭제 버튼. 보일지 여부는 부르는 쪽이 canDelete() 로 정한다. -->
<template>
  <button
    type="button"
    :disabled="busy"
    class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-50"
    @click="onClick"
  >
    <Trash2 class="w-4 h-4" aria-hidden="true" />
    {{ busy ? '삭제 중...' : '삭제' }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { errorMessage } from '@/lib/errors'

const props = defineProps<{
  /** 확인 창에 보일 이름. 예: "2026년 10월 4일 주보" */
  label: string
  action: () => Promise<void>
}>()

const busy = ref(false)

async function onClick() {
  if (!confirm(`'${props.label}'을(를) 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.`)) return
  busy.value = true
  try {
    await props.action()
  } catch (e: unknown) {
    alert(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>
