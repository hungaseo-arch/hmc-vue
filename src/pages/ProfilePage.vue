<template>
  <TheLayout>
    <PageHeader title="내 정보" subtitle="개인 정보를 조회하고 수정할 수 있습니다" />
    <section class="py-16">
      <div class="container mx-auto px-4 max-w-2xl">

        <div class="bg-white rounded-2xl shadow-sm border border-border p-8">
          <!-- 이메일 (읽기 전용) -->
          <div class="mb-6 pb-6 border-b border-border">
            <p class="text-xs text-muted-foreground mb-1">이메일 (변경 불가)</p>
            <p class="text-sm font-medium">{{ user?.email }}</p>
          </div>

          <form class="space-y-5" @submit.prevent="handleSave">
            <!-- 이름 / 성별 -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5">이름</label>
                <input v-model="form.name" type="text" placeholder="이름"
                  class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">성별</label>
                <select v-model="form.gender"
                  class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-white">
                  <option value="">선택</option>
                  <option value="남">남</option>
                  <option value="여">여</option>
                </select>
              </div>
            </div>

            <!-- 전화번호 / 직책 -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5">전화번호</label>
                <input v-model="form.phone" type="tel" placeholder="010-0000-0000"
                  class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">직책</label>
                <input v-model="form.position" type="text" placeholder="집사, 장로, 권사 등"
                  class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
            </div>

            <!-- 가족 -->
            <div>
              <label class="block text-sm font-medium mb-1.5">가족대표</label>
              <input v-model="form.family_head" type="text" placeholder="가족대표 이름"
                class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5">자녀 1</label>
                <input v-model="form.child1" type="text" placeholder="이름"
                  class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">자녀 2</label>
                <input v-model="form.child2" type="text" placeholder="이름"
                  class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">자녀 3</label>
                <input v-model="form.child3" type="text" placeholder="이름"
                  class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
              </div>
            </div>

            <p v-if="successMsg" class="text-sm text-green-600 text-center">{{ successMsg }}</p>
            <p v-if="errorMsg" class="text-sm text-red-500 text-center">{{ errorMsg }}</p>

            <button
              type="submit"
              :disabled="saving"
              class="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {{ saving ? '저장 중...' : '저장' }}
            </button>
          </form>
        </div>

      </div>
    </section>
  </TheLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import TheLayout from '@/components/TheLayout.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuth } from '@/composables/useAuth'

const { user, profile, updateProfile, refreshProfile } = useAuth()

onMounted(refreshProfile)

const form = ref({
  name: '',
  phone: '',
  position: '',
  gender: '' as '남' | '여' | '',
  family_head: '',
  child1: '',
  child2: '',
  child3: '',
})

watch(profile, (p) => {
  if (!p) return
  form.value = {
    name: p.name ?? '',
    phone: p.phone ?? '',
    position: p.position ?? '',
    gender: p.gender ?? '',
    family_head: p.family_head ?? '',
    child1: p.child1 ?? '',
    child2: p.child2 ?? '',
    child3: p.child3 ?? '',
  }
}, { immediate: true })

const saving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

async function handleSave() {
  saving.value = true
  successMsg.value = ''
  errorMsg.value = ''
  try {
    await updateProfile({
      name: form.value.name || null,
      phone: form.value.phone || null,
      position: form.value.position || null,
      gender: form.value.gender || null,
      family_head: form.value.family_head || null,
      child1: form.value.child1 || null,
      child2: form.value.child2 || null,
      child3: form.value.child3 || null,
    })
    successMsg.value = '저장되었습니다.'
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>
