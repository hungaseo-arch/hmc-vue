<template>
  <TheLayout>
    <PageHeader
      title="처음 오신 분"
      subtitle="한마음교회에 관심을 가져주셔서 감사합니다. 처음이라 낯설 수 있는 것들을 미리 안내해 드립니다"
    />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl space-y-10">
        <!-- 예배 시간 요약 -->
        <div class="bg-white rounded-2xl shadow-sm border border-border p-8">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <Clock class="w-5 h-5 text-primary" />
              예배 시간
            </h2>
            <RouterLink :to="ROUTE_PATHS.WORSHIP_GUIDE" class="text-sm text-primary hover:underline font-medium">
              전체 예배 보기 →
            </RouterLink>
          </div>
          <ul class="space-y-2">
            <li
              v-for="ws in mainSchedules"
              :key="ws.name"
              class="flex items-center justify-between text-sm border-b border-border last:border-0 py-2"
            >
              <span class="font-medium">{{ ws.name }}</span>
              <span class="text-muted-foreground">{{ ws.time }}</span>
            </li>
          </ul>
        </div>

        <!-- 오시는 길 요약 -->
        <div class="bg-white rounded-2xl shadow-sm border border-border p-8">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <MapPin class="w-5 h-5 text-primary" />
              오시는 길
            </h2>
            <RouterLink :to="ROUTE_PATHS.DIRECTIONS" class="text-sm text-primary hover:underline font-medium">
              지도로 보기 →
            </RouterLink>
          </div>
          <p class="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{{ address }}</p>
          <p class="text-sm text-muted-foreground mt-2">
            <a :href="`tel:${CHURCH.phoneTel}`" class="hover:text-primary transition-colors">{{ CHURCH.phone }}</a>
          </p>
        </div>

        <!-- 새가족 등록 CTA -->
        <div class="bg-primary text-primary-foreground rounded-2xl p-8 text-center">
          <h2 class="text-xl font-bold mb-2">함께하고 싶으신가요?</h2>
          <p class="text-sm text-primary-foreground/80 mb-6">새가족으로 등록하시면 정착을 도와드립니다</p>
          <RouterLink
            :to="ROUTE_PATHS.SIGNUP"
            class="inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-white/90 transition-colors"
          >
            새가족 등록하기
          </RouterLink>
        </div>

        <!-- FAQ -->
        <div>
          <h2 class="text-xl font-bold mb-5 flex items-center gap-2">
            <HelpCircle class="w-5 h-5 text-primary" />
            자주 묻는 질문
          </h2>
          <div class="space-y-3">
            <details
              v-for="faq in faqs"
              :key="faq.q"
              class="group bg-white rounded-2xl shadow-sm border border-border px-6 py-4"
            >
              <summary class="flex items-center justify-between cursor-pointer font-medium list-none">
                {{ faq.q }}
                <ChevronDown class="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p class="text-sm text-muted-foreground leading-relaxed mt-3">{{ faq.a }}</p>
            </details>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Clock, MapPin, HelpCircle, ChevronDown } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { ROUTE_PATHS } from '@/lib/index'
import { worshipSchedules } from '@/data/index'
import { CHURCH } from '@/data/church'

// 주보에 있는 예배를 모두 보여준다(교육부·새벽예배 포함, 2026-10 목사님 요청).
const mainSchedules = computed(() => worshipSchedules)

const address = CHURCH.addressLines.join('\n')

const faqs = [
  { q: '주차는 가능한가요?', a: `Darmawangsa Square 건물 내 주차장을 이용하실 수 있습니다. 교회는 2층(Lantai 1, 101호텔 반대편, Ranch Market 위층)에 있습니다. 예배 시간에는 안내 인원이 배치되어 있으니 어려움이 있으시면 문의해 주세요. (Tel. ${CHURCH.phone})` },
  { q: '자녀를 위한 예배가 따로 있나요?', a: '네, 영유아·유치부(J-Angels)와 아동부(J-Kids)는 주일 11시 예배와 같은 시간에 별도로 모입니다. 중고등부(Ja-You)는 토요일에 예배를 드리고, 주일에는 11시 예배를 부모님과 함께 드린 뒤 자체 모임을 갖습니다. 자세한 내용은 교육과양육 메뉴를 참고해 주세요.' },
  { q: '한국어와 인도네시아어 중 어느 언어로 예배하나요?', a: '주일예배는 한국어로만 진행됩니다. 인도네시아어 통역과 예배는 현재 논의 중이며, 적정 인원이 되면 제공할 예정입니다.' },
  { q: '처음 가면 무엇을 준비해야 하나요?', a: '따로 준비하실 것은 없습니다. 편한 복장으로 예배 시작 10~15분 전에 도착하시면 안내를 받으실 수 있습니다.' },
  { q: '등록은 꼭 해야 하나요?', a: '등록 없이도 예배에 참석하실 수 있습니다. 다만 새가족으로 등록하시면 공동체 소식과 활동에 좀 더 적극적으로 참여하실 수 있고, 교회의 돌봄을 받으실 수 있습니다.' },
  { q: '헌금은 처음부터 해야 하나요?', a: '헌금은 자발적인 신앙의 표현입니다. 처음 방문하신 분들께는 전혀 부담을 드리지 않으니 편안하게 예배에만 집중하셔도 됩니다.' },
]
</script>
