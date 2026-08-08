<template>
  <!--
    목록이 비었을 때 쓰는 공통 안내. 목회칼럼·주보에만 있던 것을 컴포넌트로 빼서
    설교·소식·앨범까지 같은 모양으로 맞춘다.
  -->
  <div class="bg-white rounded-2xl shadow-sm border border-border p-12 text-center">
    <div class="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
      <component :is="icon" class="w-8 h-8 text-muted-foreground" aria-hidden="true" />
    </div>
    <h3 class="text-xl font-semibold mb-3">{{ title }}</h3>
    <p class="text-muted-foreground">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description: string
}>()
</script>
