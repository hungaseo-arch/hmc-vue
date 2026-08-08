<template>
  <div class="flex flex-col min-h-screen">
    <!-- 키보드 사용자가 헤더 메뉴 전체를 지나치지 않아도 되도록. 포커스 전에는 안 보인다. -->
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
    >
      본문으로 건너뛰기
    </a>
    <TheHeader />
    <main id="main" tabindex="-1" class="flex-1 pt-26 md:pt-28">
      <slot />
    </main>
    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import TheHeader from './TheHeader.vue'
import TheFooter from './TheFooter.vue'
</script>
