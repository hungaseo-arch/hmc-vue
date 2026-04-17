<template>
  <TheLayout>
    <PageHeader title="섬기는 사람들" subtitle="한마음교회를 함께 섬기는 분들입니다" />
    <section class="py-16">
      <div class="container mx-auto px-4">
        <div class="flex flex-wrap justify-center gap-10 max-w-4xl mx-auto">
          <div
            v-for="(staff, i) in staffMembers"
            :key="i"
            class="text-center animate-fade-in-up"
            :style="{ animationDelay: `${i * 0.15}s` }"
          >
            <div class="w-48 h-60 rounded-2xl overflow-hidden bg-muted shadow-md mb-5 mx-auto flex items-center justify-center">
              <img
                v-if="staff.image"
                :src="staff.image"
                :alt="staff.name"
                class="w-full h-full object-cover"
              />
              <User v-else class="w-24 h-24 text-muted-foreground/30" />
            </div>
            <h3 class="text-xl font-bold mb-1">{{ staff.name }}</h3>
            <p class="text-muted-foreground font-medium">{{ staff.role }}</p>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { User } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { staffMembers } from '@/data/index'
</script>
