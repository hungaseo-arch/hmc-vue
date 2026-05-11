<template>
  <div class="min-h-screen bg-muted flex items-center justify-center px-4">
    <div class="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm p-8">
      <div class="text-center mb-8">
        <img src="/logo_hmc.png" alt="한마음교회" class="h-14 w-auto mx-auto mb-4 object-contain" />
        <h1 class="text-xl font-bold">로그인</h1>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="block text-sm font-medium mb-1.5">이메일</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="이메일 주소"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5">비밀번호</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="비밀번호"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <p v-if="errorMsg" class="text-sm text-red-500 text-center">{{ errorMsg }}</p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
        >
          {{ submitting ? '로그인 중...' : '로그인' }}
        </button>
      </form>

      <div class="mt-6 text-center text-xs text-muted-foreground space-y-2">
        <p>
          계정이 없으신가요?
          <RouterLink :to="ROUTE_PATHS.SIGNUP" class="text-primary hover:underline font-medium">회원가입</RouterLink>
        </p>
        <RouterLink :to="ROUTE_PATHS.HOME" class="block hover:underline">홈으로 돌아가기</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'

const router = useRouter()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  submitting.value = true
  errorMsg.value = ''
  try {
    await login(email.value, password.value)
    router.push(ROUTE_PATHS.HOME)
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '로그인에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>
