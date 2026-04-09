<template>
  <TheLayout>
    <PageHeader title="오시는 길" subtitle="자카르타 한마음교회로 오시는 방법을 안내합니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="bg-white rounded-2xl shadow-sm border border-border overflow-hidden animate-fade-in-up">
          <!-- Map -->
          <div class="h-96">
            <iframe
              src="https://maps.google.com/maps?q=Hanmaum%20Church%20Jakarta&t=&z=15&ie=UTF8&iwloc=&output=embed"
              class="w-full h-full"
              style="border: 0"
              allowfullscreen
              loading="lazy"
              title="한마음교회 위치"
            />
          </div>

          <!-- Info -->
          <div class="p-8">
            <div class="grid md:grid-cols-2 gap-6">
              <div
                v-for="info in locationInfo"
                :key="info.label"
                class="flex items-start gap-4"
              >
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <component :is="info.icon" class="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p class="font-semibold mb-1">{{ info.label }}</p>
                  <!-- v-html 사용 (신뢰된 내부 데이터만) -->
                  <p class="text-sm text-muted-foreground leading-relaxed" v-html="info.content" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { MapPin, Phone } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'

const locationInfo = [
  {
    icon: MapPin,
    label: '주소',
    content: 'Pengelola Darmawangsa Square - The City Walk Lt. 1 Lot. 1 Area A<br/>Jl. Darmawangsa VI &amp; IX Jakarta 12160, Indonesia',
  },
  {
    icon: Phone,
    label: '전화',
    content: '021-739-5035',
  },
]
</script>
