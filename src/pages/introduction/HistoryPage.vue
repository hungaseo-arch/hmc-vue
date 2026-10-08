<template>
  <TheLayout>
    <PageHeader title="연혁" subtitle="하나님과 함께한 한마음교회의 발자취입니다" />
    <section class="py-16">
      <div class="container mx-auto px-4">
        <!--
          가로 타임라인은 쓰지 않는다. 2026-10 에 2019~2026 을 더하자 옛 연도가
          가로 스크롤 오른쪽 끝으로 밀려 "연혁이 지워졌다"는 말이 나왔다. 격자로
          펼치면 한 화면에서 전부 보인다. 최근 연도가 앞이다.
        -->
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(item, i) in historyData"
            :key="item.year"
            class="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up"
            :style="{ animationDelay: `${Math.min(i, 12) * 0.04}s` }"
          >
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
