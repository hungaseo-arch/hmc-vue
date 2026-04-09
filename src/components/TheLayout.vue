<template>
  <!-- React: <div className="flex flex-col min-h-screen"> → Vue: 동일한 Tailwind -->
  <div class="flex flex-col min-h-screen">
    <TheHeader />
    <main class="flex-1 pt-[104px] md:pt-[112px]">
      <!-- React: {children} → Vue: <slot /> -->
      <slot />
    </main>
    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import TheHeader from './TheHeader.vue'
import TheFooter from './TheFooter.vue'
</script>
