<template>
  <TheLayout>
    <PageHeader title="성인교육" subtitle="예수님의 제자이자 한마음 공동체의 일원으로 세워지는 양육과정" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="bg-white rounded-2xl border border-border p-8 shadow-sm mb-8 animate-fade-in-up">
          <h2 class="text-2xl font-bold mb-2 text-primary">한마음교회 양육과정</h2>
          <p class="text-muted-foreground leading-relaxed">
            한마음교회 장년들이면 모두 함께 공부하고 양육 받아야 하는 과정들입니다.
            단순히 지식을 배우는 과정이 아니라 예수님의 제자로 또한 한마음 공동체의 일원으로 세워지는 과정들입니다.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="(course, i) in courses"
            :key="i"
            class="bg-white rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up"
            :style="{ animationDelay: `${0.1 + i * 0.08}s` }"
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                {{ course.icon }}
              </div>
              <h3 class="font-bold text-base">{{ course.title }}</h3>
            </div>
            <ul class="space-y-2 px-10">
              <li
                v-for="(item, j) in course.items"
                :key="j"
                class="text-sm text-muted-foreground flex gap-2"
              >
                <span class="text-primary/60">▪</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'

const courses = [
  { title: '새가족성경공부', icon: '📖', items: ['반기 1회 - 4주 과정'] },
  { title: '일대일성경공부', icon: '🤝', items: ['정규과정 - 상반기(2월), 하반기(9월)', '특별과정 - 인원구성 및 요청시'] },
  { title: '믿음세우기과정', icon: '🏛️', items: ['정규과정 - 매년 상반기(2월), 하반기(9월)', '특별과정 - 인원구성 및 요청시'] },
  { title: '리더십성경공부', icon: '⭐', items: ['연간 1회 - 12주 과정(준비 중)'] },
  { title: '한마음아카데미', icon: '🎓', items: ['어성경 신구약', '인물별 성경공부', '성경책별 연구'] },
]
</script>
