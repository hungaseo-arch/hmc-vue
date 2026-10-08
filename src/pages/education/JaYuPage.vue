<template>
  <MinistryPage
    name="Ja-You"
    subtitle="자유교회 (Jakarta Youth Church) - 중고등부 청소년 사역"
    bg-color="from-orange-600 to-orange-500"
    accent-color="bg-orange-500"
    image="https://images.unsplash.com/photo-1726679402113-beb32b857a59?w=800&q=80"
    description="2015년 1월부터 저희 교회와 꿈이있는교회, 동부교회, 참빛교회의 중고등부를 합쳐 청소년 전문사역자를 모시고 '자유교회(Ja-You)'로 독립시켰습니다. 질풍노도의 시기와 해외라는 상황을 다양하고 특별한 교육으로 준비된 다음세대를 세우는 데 밑거름이 되기를 기대합니다."
    verse="그 작은 자가 천 명을 이루겠고 그 약한 자가 강국을 이룰 것이라 때가 되면 나 여호와가 속히 이루리라 (사60:22)"
    :details="details"
  />
</template>

<script setup lang="ts">
import MinistryPage from '@/components/MinistryPage.vue'

// 지도 목사 연락처는 목사님이 홈페이지 게시용으로 주신 것이다(2026-10).
const details = [
  { label: '예배 정보', items: ['매주 토요일 오전 10:00 / 주일 오전 11:00', '토요일 예배: 각 교회 순회 (장소는 교회로 문의)', '주일 예배: 어른들과 함께 11시 예배 후 자체 모임'] },
  { label: '대상', items: ['중학생', '고등학생'] },
  { label: '섬기는 이', items: ['본교회 지원부장: (추후 안내)', '지도: 이주연 목사 / 0812-1555-2112', '본교회 파송교사: 여나영, 전남희'] },
]
</script>
