<template>
  <footer class="bg-foreground text-background mt-auto">

    <!-- <div class="container px-4 py-8 hidden md:block">
      <div class="grid grid-cols-1 md:grid-cols-3 mx-auto">

        <div class="md:col-span-2">
          <div class="mb-5">
            <img
              src="/logo_hmc.png"
              alt="자카르타 한마음교회"
              class="h-14 w-auto object-contain brightness-0 invert"
            />
          </div>
          <p class="text-background/70 text-sm leading-relaxed mb-4">
            인도네시아 자카르타에서 삼위일체 하나님을 예배하고 기도하며,
            말씀을 배우고 행하며, 전도와 선교를 쉬지 않는 공동체입니다.
          </p>
          <div class="space-y-2 mx-2 text-sm text-background/70">
            <div class="flex items-start gap-2">
              <MapPin class="w-4 h-4 mt-0.5 text-primary shrink-0"/>
              <span>
                Pengelola Darmawangsa Square - The City Walk Lt. 1 Lot. 1 Area A,<br />
                Jl. Darmawangsa VI &amp; IX Jakarta 12160, Indonesia
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Phone class="w-4 h-4 text-primary shrink-0" />
              <span>021-739-5035</span>
            </div>
          </div>
        </div>


        <div class="w-64 mx-auto">
          <h3 class="font-semibold text-background mb-4 text-sm uppercase tracking-wider">예배 안내</h3>
          <ul class="space-y-1 mx-2 text-sm text-background/70" >
            <li
              v-for="ws in footerSchedules"
              :key="ws.name"
              class="grid grid-cols-2 gap-4"
            >
              <span>{{ ws.name }}</span>
              <span class="text-primary-foreground/70 text-right">{{ ws.shortTime }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div> -->

    <div class="border-t border-background/10">
      <div class="container mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-background/50">
        <span>© 2026 자카르타 한마음교회. All rights reserved.</span>
        <span>내가 이 반석 위에 교회를 세우리니 (마 16:18)</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { MapPin, Phone } from 'lucide-vue-next'

// 푸터용 예배 시간 (데이터를 컴포넌트 내에서 정의)
const footerSchedules = [
  { name: '주일 1부 예배', shortTime: '오전 9:30' },
  { name: '주일 2부 예배', shortTime: '오전 11:00' },
  { name: '수요 기도회', shortTime: '오전 10:30' },
  { name: '새벽 온라인 기도회', shortTime: '오전 4:00' },
]
</script>
