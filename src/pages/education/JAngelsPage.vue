<template>
  <MinistryPage
    name="J-Angels"
    subtitle="영유아·유치부 어린이들과 선생님들의 예배공동체"
    bg-color="from-green-600 to-green-500"
    accent-color="bg-green-500"
    image="/pict/angels.webp"
    description="인도네시아 자카르타에 소재한 한마음교회 J-Angels는 영유아, 유치부 어린이들과 선생님들이 주님의 사랑을 함께 배우며 경험하는 예배공동체 입니다. 유치부 또래의 아이들은 설명이 아닌 경험을 통해서 신앙을 배웁니다. 아이들이 예배와 활동을 통해 하나님의 사랑을 경험하고 하나님의 자녀로 바르게 자라나도록 돕는 것 그것이 한마음교회 J-Angels 사명입니다."
    :details="details"
  />
</template>

<script setup lang="ts">
import MinistryPage from '@/components/MinistryPage.vue'

const details = [
  { label: '예배 정보', items: ['매주 주일 오전 11:00', '소예배당', '영유아 ~ 유치원생 대상'] },
  { label: '사역 목표', items: ['경험을 통한 신앙교육', '하나님의 사랑 체험', '예배와 활동 중심의 교육', '하나님의 자녀로 바르게 성장'] },
  { label: '섬기는 이', items: ['부장: 유현주 권사', '지도: 현명해 전도사', '교사: 김선희, 허순경, 이장미'] },
]
</script>
