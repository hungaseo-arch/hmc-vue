<template>
  <TheLayout>
    <PageHeader :title="name" :subtitle="subtitle" :bg-color="bgColor" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="grid md:grid-cols-2 gap-10 items-start mb-10">
          <!-- Left column -->
          <div class="animate-fade-in-up">
            <img
              v-if="image"
              :src="image"
              :alt="name"
              class="w-full h-56 object-cover rounded-2xl shadow-sm mb-6"
            />
            <div class="bg-white rounded-2xl border border-border p-6 shadow-sm">
              <h3 class="font-bold text-lg mb-4">안녕하세요? 한마음교회 {{ name }}입니다.</h3>
              <p class="text-muted-foreground leading-loose text-sm">{{ description }}</p>
              <div v-if="verse" class="mt-5 p-4 rounded-xl bg-muted/50 border-l-4 border-primary">
                <p class="text-sm font-medium leading-relaxed">{{ verse }}</p>
              </div>
            </div>
          </div>

          <!-- Right column -->
          <div class="space-y-4 animate-fade-in-up" style="animation-delay: 0.1s">
            <template v-if="details">
              <div
                v-for="(section, i) in details"
                :key="i"
                class="bg-white rounded-2xl border border-border p-6 shadow-sm"
              >
                <h3 class="font-bold mb-3 flex items-center gap-2">
                  <span :class="['w-2 h-2 rounded-full', accentColor ?? 'bg-primary']" />
                  {{ section.label }}
                </h3>
                <ul class="space-y-2">
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
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'

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
