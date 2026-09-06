<template>
  <TheLayout>
    <PageHeader title="연혁" subtitle="하나님과 함께한 한마음교회의 발자취입니다" />
    <section class="py-16 overflow-hidden">
      <div class="container mx-auto px-4">
        <!--
          좁은 화면에서는 세로로 쌓는다. 가로 타임라인은 손가락으로 옆으로
          밀어야만 다음 해가 보여서, 스크롤할 곳이 있다는 사실 자체를
          모르고 지나치기 쉽다.
        -->
        <div class="md:overflow-x-auto pb-6">
          <div class="relative flex flex-col gap-6 md:flex-row md:gap-8 md:min-w-max md:px-4">
            <!-- 가로 타임라인 선 (넓은 화면에서만) -->
            <div class="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-border" />

            <div
              v-for="(item, i) in historyData"
              :key="item.year"
              class="relative md:min-w-55 md:max-w-60 animate-fade-in-up"
              :style="{ animationDelay: `${i * 0.04}s` }"
            >
              <!-- 연도 표시점 -->
              <div class="hidden md:block absolute top-3.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full border-4 border-white shadow-md z-10" />
              <div class="bg-white border border-border rounded-2xl p-5 md:mt-14 shadow-sm hover:shadow-md transition-shadow">
                <div class="text-2xl font-bold text-primary mb-3">{{ item.year }}</div>
                <ul class="space-y-1.5">
                  <li
                    v-for="(event, j) in item.events"
                    :key="j"
                    class="text-sm text-muted-foreground leading-relaxed flex gap-2"
                  >
                    <span class="text-primary/40">•</span>
                    <span>{{ event }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { historyData } from '@/data/index'

/*
  historyData 는 최근 연도가 앞이다. 예전에는 여기서 뒤집어 2002 년부터
  보여줬는데, 그러면 최근 소식이 가로 스크롤 맨 오른쪽 끝에 숨어 아무도
  보지 못했다. 지금 이 교회가 어디까지 왔는지가 먼저 보여야 한다.
*/
</script>
