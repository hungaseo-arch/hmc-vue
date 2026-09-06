<template>
  <TheLayout>
    <PageHeader title="섬기는 사람들" subtitle="한마음교회를 함께 섬기는 분들입니다" />
    <section class="py-16">
      <div class="container mx-auto px-4">
        <div v-if="loading" class="text-center py-20 text-muted-foreground">불러오는 중...</div>
        <div v-else-if="error" class="text-center py-20 text-red-500">{{ error }}</div>
        <div v-else class="flex flex-wrap justify-center gap-10 max-w-4xl mx-auto">
          <div
            v-for="(staff, i) in staffMembers"
            :key="staff.id"
            class="text-center animate-fade-in-up w-56"
            :style="{ animationDelay: `${i * 0.15}s` }"
          >
            <div class="w-48 h-60 rounded-2xl overflow-hidden bg-muted shadow-md mb-5 mx-auto flex items-center justify-center">
              <img
                v-if="staff.image && !failed.has(i)"
                :src="staff.image"
                :alt="`${staff.name} ${staff.role}`"
                width="192"
                height="240"
                loading="lazy"
                decoding="async"
                class="w-full h-full object-cover"
                @error="failed.add(i)"
              />
              <!--
                사진이 없을 때 사람 모양 아이콘을 두면 '아직 아무도 없다'
                처럼 보인다. 이름의 첫 글자를 크게 두면 빈자리가 아니라
                사진을 기다리는 자리로 읽힌다.
              -->
              <div
                v-else
                aria-hidden="true"
                class="w-full h-full bg-linear-to-br from-primary/15 to-primary/5 flex items-center justify-center"
              >
                <span
                  class="text-6xl font-bold text-primary/60"
                  style="font-family: 'Noto Serif KR', serif"
                >{{ staff.name.charAt(0) }}</span>
              </div>
            </div>
            <h2 class="text-xl font-bold mb-1">{{ staff.name }}</h2>
            <p class="text-muted-foreground font-medium">{{ staff.role }}</p>

            <!--
              교역자 개인 휴대폰·메일이다. 공개된 자리에 그대로 걸어두면
              수집돼 스팸과 사칭 문자의 표적이 된다. 푸터 헌금 계좌와 같은
              기준으로 승인된 교인에게만 보인다.
            -->
            <dl v-if="isApproved" class="mt-3 space-y-1 text-sm">
              <div v-if="staff.phone" class="flex items-center justify-center gap-1.5">
                <dt><Phone class="w-3.5 h-3.5 text-muted-foreground" aria-label="전화" /></dt>
                <dd>
                  <a :href="`tel:${staff.phone.replace(/-/g, '')}`" class="text-muted-foreground hover:text-primary transition-colors">
                    {{ staff.phone }}
                  </a>
                </dd>
              </div>
              <div v-if="staff.email" class="flex items-center justify-center gap-1.5">
                <dt><Mail class="w-3.5 h-3.5 text-muted-foreground" aria-label="이메일" /></dt>
                <dd class="min-w-0">
                  <a :href="`mailto:${staff.email}`" class="text-muted-foreground hover:text-primary transition-colors break-all">
                    {{ staff.email }}
                  </a>
                </dd>
              </div>
            </dl>
            <!--
              연락처는 승인 교인일 때만 아예 내려받는다. 그래서 여기서
              staff.phone 유무로 조건을 걸면 안내가 영영 뜨지 않는다.
            -->
            <p v-else class="mt-3 text-xs text-muted-foreground/70">
              연락처는 교인만 볼 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted } from 'vue'
import { Phone, Mail } from 'lucide-vue-next'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useStaff } from '@/composables/useStaff'
import { useAuth } from '@/composables/useAuth'

const { isApproved } = useAuth()
const { items: staffMembers, loading, error, fetchStaff } = useStaff()

onMounted(() => fetchStaff(isApproved.value))
// 이 화면에 머문 채 승인 상태가 바뀌면(로그인 등) 연락처 포함 여부도 다시 맞춘다.
watch(isApproved, v => fetchStaff(v))

// 사진 주소가 죽어 있으면 깨진 이미지 대신 첫 글자를 보여준다.
const failed = reactive(new Set<number>())
</script>
