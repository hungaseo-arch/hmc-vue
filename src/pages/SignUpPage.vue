<template>
  <div class="min-h-screen bg-muted flex items-center justify-center px-4 py-10">
    <div class="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm p-8">
      <div class="text-center mb-8">
        <img src="/logo_hmc.png" alt="한마음교회" class="h-14 w-auto mx-auto mb-4 object-contain" />
        <h1 class="text-xl font-bold">회원가입</h1>
      </div>

      <form class="space-y-4" @submit.prevent="handleSignUp">
        <div>
          <label class="block text-sm font-medium mb-1.5">이름 <span class="text-red-500">*</span></label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="이름"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">성별 <span class="text-red-500">*</span></label>
          <div class="flex gap-3">
            <label class="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl px-4 py-2.5 text-sm cursor-pointer transition"
              :class="form.gender === '남' ? 'border-primary bg-primary/5 text-primary font-medium' : 'hover:bg-muted'">
              <input v-model="form.gender" type="radio" value="남" required class="hidden" />
              남
            </label>
            <label class="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl px-4 py-2.5 text-sm cursor-pointer transition"
              :class="form.gender === '여' ? 'border-primary bg-primary/5 text-primary font-medium' : 'hover:bg-muted'">
              <input v-model="form.gender" type="radio" value="여" class="hidden" />
              여
            </label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">전화번호 <span class="text-red-500">*</span></label>
          <input
            v-model="form.phone"
            type="tel"
            required
            placeholder="010-0000-0000"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">이메일 <span class="text-red-500">*</span></label>
          <input
            v-model="form.email"
            type="email"
            required
            placeholder="이메일 주소"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">비밀번호 <span class="text-red-500">*</span></label>
          <input
            v-model="form.password"
            type="password"
            required
            minlength="6"
            placeholder="6자 이상"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">비밀번호 확인 <span class="text-red-500">*</span></label>
          <input
            v-model="form.passwordConfirm"
            type="password"
            required
            placeholder="비밀번호 재입력"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <p v-if="errorMsg" class="text-sm text-red-500 text-center">{{ errorMsg }}</p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50"
        >
          {{ submitting ? '가입 중...' : '회원가입' }}
        </button>
      </form>

      <div class="mt-6 text-center text-xs text-muted-foreground space-y-2">
        <p>
          이미 계정이 있으신가요?
          <RouterLink :to="ROUTE_PATHS.LOGIN" class="text-primary hover:underline font-medium">로그인</RouterLink>
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
const { signUp } = useAuth()

const form = ref({
  name: '',
  gender: '' as '남' | '여' | '',
  phone: '',
  email: '',
  password: '',
  passwordConfirm: '',
})

const submitting = ref(false)
const errorMsg = ref('')

async function handleSignUp() {
  errorMsg.value = ''

  if (!form.value.gender) {
    errorMsg.value = '성별을 선택해주세요.'
    return
  }
  if (form.value.password !== form.value.passwordConfirm) {
    errorMsg.value = '비밀번호가 일치하지 않습니다.'
    return
  }

  submitting.value = true
  try {
    await signUp(form.value.email, form.value.password, {
      name: form.value.name,
      gender: form.value.gender as '남' | '여',
      phone: form.value.phone,
    })
    router.push(ROUTE_PATHS.HOME)
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '회원가입에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>
