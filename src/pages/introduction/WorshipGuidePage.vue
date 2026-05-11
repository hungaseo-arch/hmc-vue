<template>
  <TheLayout>
    <PageHeader
      title="예배안내"
      subtitle="하나님은 영이시니 예배하는 자가 영과 진리로 예배할지니라 (요한복음 4:24)"
    />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-3xl">
        <div class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden animate-fade-in-up">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-primary text-primary-foreground">
                  <th class="py-4 px-4 text-left font-semibold whitespace-nowrap">예배구분</th>
                  <th class="py-4 px-2 text-center font-semibold">
                    <span class="flex items-center justify-center gap-1 whitespace-nowrap">
                      <Clock class="w-2 h-4" /> 예배시간
                    </span>
                  </th>
                  <th class="py-4 px-2 text-center font-semibold">
                    <span class="flex items-center justify-center gap-1 whitespace-nowrap">
                      <MapPin class="w-2 h-4" /> 예배장소
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(ws, i) in worshipSchedules"
                  :key="i"
                  :class="['border-b border-border last:border-0', i % 2 === 0 ? 'bg-white' : 'bg-muted/40']"
                >
                  <td class="py-4 px-4 font-medium text-foreground">{{ ws.name }}</td>
                  <td class="py-4 px-2 text-center text-muted-foreground">{{ ws.time }}</td>
                  <td class="py-4 px-2 text-center">
                    <span :class="['px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap', locationBadgeClass(ws.location)]">
                      {{ ws.location }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p class="text-center text-muted-foreground text-sm mt-6 animate-fade-in-up" style="animation-delay: 0.4s">
          예배 시간은 교회 사정에 따라 변동될 수 있습니다. 자세한 사항은 교회로 문의해 주세요.
        </p>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { Clock, MapPin } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { worshipSchedules } from '@/data/index'

function locationBadgeClass(location: string): string {
  if (location === '온라인') return 'bg-chart-1/10 text-chart-1'
  if (location === '소예배당') return 'bg-chart-3/10 text-chart-3'
  return 'bg-primary/10 text-primary'
}
</script>
