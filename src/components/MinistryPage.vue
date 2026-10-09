<template>
  <TheLayout>
    <PageHeader :title="name" :subtitle="subtitle" :bg-color="bgColor" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="grid md:grid-cols-2 gap-10 items-stretch mb-10">
          <!-- Left column -->
          <div class="flex flex-col animate-fade-in-up">
            <!--
              사진 주소가 죽으면 깨진 이미지 자리만 남는다. 그럴 바에는
              자리를 통째로 접는 편이 낫다 - 아래 소개 글이 그대로 올라온다.
            -->
            <img
              v-if="image && !imageFailed"
              :src="image"
              :alt="`한마음교회 ${name}`"
              class="w-full h-56 shrink-0 object-cover rounded-2xl shadow-sm mb-6"
              loading="lazy"
              @error="imageFailed = true"
            />
            <div class="flex-1 bg-white rounded-2xl border border-border p-6 shadow-sm">
              <h2 class="font-bold text-lg mb-4">안녕하세요? 한마음교회 {{ name }}입니다.</h2>
              <p class="text-muted-foreground leading-loose text-sm">{{ description }}</p>
              <div v-if="verse" class="mt-5 p-4 rounded-xl bg-muted/50 border-l-4 border-primary">
                <p class="text-sm font-medium leading-relaxed">{{ verse }}</p>
              </div>
            </div>
          </div>

          <!-- Right column -->
          <div class="flex flex-col gap-4 animate-fade-in-up" style="animation-delay: 0.1s">
            <template v-if="details">
              <div
                v-for="(section, i) in details"
                :key="i"
                class="bg-white rounded-2xl border border-border p-6 shadow-sm last:flex-1"
              >
                <h2 class="font-bold mb-3 flex items-center gap-2">
                  <span :class="['w-2 h-2 rounded-full', accentColor ?? 'bg-primary']" />
                  {{ section.label }}
                </h2>
                <ul class="space-y-2 px-2.5">
                  <li
                    v-for="(item, j) in section.items"
                    :key="j"
                    class="text-sm text-muted-foreground flex gap-2"
                  >
                    <span class="text-primary/60">▪</span>
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'

const imageFailed = ref(false)

withDefaults(defineProps<{
  name: string
  subtitle: string
  description: string
  details?: { label: string; items: string[] }[]
  bgColor?: string
  accentColor?: string
  image?: string
  verse?: string
}>(), {
  bgColor: 'from-primary to-primary/80',
})
</script>
