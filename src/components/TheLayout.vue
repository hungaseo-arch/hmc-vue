<template>
  <div class="flex flex-col min-h-screen">
    <TheHeader />
    <main class="flex-1 pt-26 md:pt-28">
      <slot />
    </main>
    <TheFooter />
  </div>
</template>

<script setup lang="ts">
import TheHeader from './TheHeader.vue'
import TheFooter from './TheFooter.vue'
</script>
