<template>
  <div :class="`bg-linear-to-r ${bgColor} text-white py-10 px-4`">
    <div class="container mx-auto text-center">
      <!--
        상세 페이지에서는 이 자리가 글의 제목이 아니라 '어느 게시판인지' 를
        가리키는 딱지다. 그런 곳까지 h1 로 두면 한 페이지에 h1 이 둘이 되어
        검색엔진과 화면낭독기가 무엇이 그 페이지의 제목인지 알 수 없다.
        그래서 as="p" 를 받는다.
      -->
      <component
        :is="as"
        class="text-3xl md:text-4xl font-bold mb-3 animate-fade-in-up"
        style="font-family: 'Noto Serif KR', serif"
      >
        {{ title }}
      </component>
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
withDefaults(defineProps<{
  title: string
  subtitle?: string
  bgColor?: string
  /** 페이지의 실제 제목이 본문 안에 따로 있으면 'p' 를 준다. */
  as?: 'h1' | 'p'
}>(), {
  bgColor: 'from-primary to-primary/80',
  as: 'h1',
})
</script>
