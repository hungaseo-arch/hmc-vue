<template>
  <TheLayout>
    <PageHeader title="인사말" subtitle="한마음교회 홈페이지에 오신 것을 환영합니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">
        <div class="bg-white rounded-2xl shadow-sm border border-border p-8 md:p-12 animate-fade-in-up">
          <h2
            class="text-2xl font-bold mb-8 text-primary"
            style="font-family: 'Noto Serif KR', serif"
          >
            할렐루야!<br />한마음교회 홈페이지를 방문해주셔서 감사드립니다.
          </h2>
          <div class="space-y-5 text-muted-foreground leading-loose text-base">
            <p>
              세계에서 인구가 4번째로 많은 인도네시아, 무슬림들이 85%이상이 되는 이 땅,
              선교지임과 동시에 삶의 터전이기에 이곳에서 예수의 이름을 부르며 2002년도에 한마음 공동체가 세워졌습니다.
            </p>
            <!-- React: 하드코딩 → Vue: v-for로 리스트 렌더링 -->
            <div class="border-l-4 border-primary pl-6 space-y-3">
              <p
                v-for="value in communityIdentities"
                :key="value"
                class="font-medium text-foreground"
              >
                {{ value }}
              </p>
            </div>
            <p>
              외롭고 힘든 이 세상 속에서 함께 울고 웃고 기도하고 감격하며 함께 살아계신 주님을
              경험하기 원하시는 분들은 언제든지 오시기 바랍니다. 환영합니다.
            </p>
          </div>
          <div class="mt-10 pt-8 border-t border-border text-right">
            <p
              class="text-lg font-semibold text-primary"
              style="font-family: 'Noto Serif KR', serif"
            >
              한마음교회 성도 일동
            </p>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'

const communityIdentities = [
  '삼위일체 하나님을 예배하는 예배공동체입니다.',
  '자신과 공동체와 열방을 위해 기도하는 기도공동체입니다.',
  '성경을 배우고 훈련하며 행하는 말씀공동체입니다.',
  '예수님이 다시 오실 때까지 전도와 선교를 쉬지 않는 선교공동체입니다.',
  '함께 서로 사랑하는 사랑공동체입니다.',
]
</script>
