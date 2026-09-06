<template>
  <div class="min-h-screen bg-muted flex items-center justify-center px-4 py-10">
    <div class="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md p-6 sm:p-8 text-center">
      <div class="mx-auto mb-6 h-16 w-16 rounded-full bg-secondary flex items-center justify-center" aria-hidden="true">
        <Lock class="h-8 w-8 text-muted-foreground" />
      </div>

      <h1 class="text-xl font-bold text-foreground">열람 권한이 없습니다</h1>

      <!--
        잘못한 게 없다는 걸 먼저 말한다. 이 화면에 닿는 대부분은 오래된 링크를
        누른 교인이지 침입자가 아니다.
      -->
      <p class="mt-5 text-sm leading-relaxed text-muted-foreground">
        이 자료는 교회 관리자만 볼 수 있습니다.<br />
        잘못 누르신 것이 아니니 걱정하지 않으셔도 됩니다.
      </p>

      <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
        권한이 필요하시면 교회 사무실로 문의해 주세요.
      </p>

      <div class="mt-8 space-y-3">
        <RouterLink
          :to="ROUTE_PATHS.HOME"
          class="block w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
        >
          홈으로 돌아가기
        </RouterLink>
        <button
          type="button"
          class="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:brightness-95 transition"
          @click="router.back()"
        >
          이전 화면으로
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Lock } from 'lucide-vue-next'
import { ROUTE_PATHS } from '@/lib/index'

const router = useRouter()
</script>
