<template>
  <!--
    React: 각 페이지 파일마다 PageHeader 함수를 중복 정의 (5개 파일)
    Vue:   재사용 가능한 단일 컴포넌트로 분리 → DRY 원칙 적용
  -->
  <div :class="`bg-gradient-to-r ${bgColor} text-white py-10 px-4`">
    <div class="container mx-auto text-center">
      <h1
        class="text-3xl md:text-4xl font-bold mb-3 animate-fade-in-up"
        style="font-family: 'Noto Serif KR', serif"
      >
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="text-white/80 text-sm md:text-base max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
        style="animation-delay: 0.15s"
      >
        {{ subtitle }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// React: Props interface + destructuring → Vue: defineProps<T>()
withDefaults(defineProps<{
  title: string
  subtitle?: string
  bgColor?: string
}>(), {
  bgColor: 'from-primary to-primary/80',
})
</script>
