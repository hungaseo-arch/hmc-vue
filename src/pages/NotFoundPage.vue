<template>
  <TheLayout>
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 class="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 class="text-2xl font-semibold mb-3">페이지를 찾을 수 없습니다</h2>
      <p class="text-muted-foreground mb-8">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <RouterLink
        to="/"
        class="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
      >
        홈으로 돌아가기
      </RouterLink>
    </div>
  </TheLayout>
</template>

<script setup lang="ts">
import TheLayout from '@/components/TheLayout.vue'
</script>
