<template>
  <TheLayout>
    <PageHeader title="연혁" subtitle="하나님과 함께한 한마음교회의 발자취입니다" />
    <section class="py-16">
      <div class="container mx-auto px-4">
        <!--
          가로 타임라인. 예전엔 한 줄로 길게 늘여 가로 스크롤했는데, 2026-10 에
          2019~2026 을 더하자 옛 연도가 스크롤 오른쪽 끝에 숨어 "연혁이 지워졌다"는
          말이 나왔다. 그래서 줄이 차면 다음 줄로 이어진다 — 선은 카드마다 한 토막씩
          그려 옆 카드와 이어 붙인다(-mx 가 gap 을 메운다). 좁은 화면은 세로로 쌓는다.
        -->
        <div class="overflow-hidden md:px-4">
          <div class="grid gap-6 md:grid-cols-3 md:gap-x-8 md:gap-y-10 lg:grid-cols-4">
            <div
              v-for="(item, i) in historyData"
              :key="item.year"
              class="relative animate-fade-in-up"
              :style="{ animationDelay: `${Math.min(i, 12) * 0.04}s` }"
            >
              <!-- 가로 타임라인 선 한 토막 (넓은 화면에서만) -->
              <div class="hidden md:block absolute top-6 -left-4 -right-4 h-0.5 bg-border" />
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
