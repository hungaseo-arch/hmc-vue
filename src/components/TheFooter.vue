<template>
  <footer class="bg-foreground text-background mt-auto pb-[env(safe-area-inset-bottom)]">
    <div class="container mx-auto px-5 py-5">
      <!--
        헌금 계좌. 예전에는 모든 방문자에게 늘 보였다. 교회 계좌를 공개된
        자리에 상시 걸어두면 사칭·스팸의 재료가 되므로, 승인된 교인에게만
        보인다. 로그인만으로는 부족하다 - 승인 대기 상태는 아직 교인이
        아니다.
      -->
      <div v-if="isApproved">
        <h2 class="text-sm font-bold mb-3">헌금 계좌</h2>
        <dl class="flex flex-col gap-1.5 lg:flex-row lg:flex-nowrap lg:items-baseline lg:gap-x-6 text-xs text-background/60">
          <div>
            <dt class="sr-only">예금주</dt>
            <dd class="whitespace-nowrap">YAYASAN SEHATI SEIMAN</dd>
          </div>
          <div class="flex gap-2">
            <dt class="shrink-0">IDR</dt>
            <dd class="whitespace-nowrap">KEB HANA BANK 111521200000811</dd>
          </div>
          <div class="flex gap-2">
            <dt class="shrink-0">USD</dt>
            <dd class="whitespace-nowrap">KEB HANA BANK 15656130670</dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="border-t border-background/10">
      <div class="container mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-background/50">
        <span class="font-bold">© 2026 자카르타 한마음교회. All rights reserved.</span>
        <span class="font-bold">내가 이 반석 위에 교회를 세우리니 (마 16:18)</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { isApproved } = useAuth()
</script>
