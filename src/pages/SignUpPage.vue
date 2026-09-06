<template>
  <div class="min-h-screen bg-muted flex items-center justify-center px-4 py-10">
    <div class="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm p-8">
      <div class="text-center mb-8">
        <img src="/logo_hmc.webp" alt="한마음교회" width="320" height="122" class="h-14 w-auto mx-auto mb-4 object-contain" />
        <h1 class="text-xl font-bold">회원가입</h1>
      </div>

      <form class="space-y-4" @submit.prevent="handleSignUp">
        <div>
          <label for="signup-name" class="block text-sm font-medium mb-1.5">이름 <span class="text-red-500" aria-hidden="true">*</span></label>
          <input
            id="signup-name"
            v-model="form.name"
            type="text"
            required
            autocomplete="name"
            placeholder="이름"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <!--
          라디오는 sr-only 로 감춘다. display:none(=hidden)이면 키보드로 아예
          고를 수 없어 성별 선택이 마우스 전용이 되어버린다.
        -->
        <fieldset>
          <legend class="block text-sm font-medium mb-1.5">성별 <span class="text-red-500" aria-hidden="true">*</span></legend>
          <div class="flex gap-3">
            <label
              v-for="g in ['남', '여']"
              :key="g"
              class="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl px-4 py-2.5 text-sm cursor-pointer transition focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary"
              :class="form.gender === g ? 'border-primary bg-primary/5 text-primary font-medium' : 'hover:bg-muted'"
            >
              <input v-model="form.gender" type="radio" name="gender" :value="g" required class="sr-only" />
              {{ g }}
            </label>
          </div>
        </fieldset>

        <div>
          <label for="signup-phone" class="block text-sm font-medium mb-1.5">전화번호 <span class="text-red-500" aria-hidden="true">*</span></label>
          <input
            id="signup-phone"
            v-model="form.phone"
            type="tel"
            required
            autocomplete="tel"
            inputmode="tel"
            placeholder="010-0000-0000"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <div>
          <label for="signup-email" class="block text-sm font-medium mb-1.5">이메일 <span class="text-red-500" aria-hidden="true">*</span></label>
          <input
            id="signup-email"
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            inputmode="email"
            placeholder="이메일 주소"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <div>
          <label for="signup-password" class="block text-sm font-medium mb-1.5">비밀번호 <span class="text-red-500" aria-hidden="true">*</span></label>
          <input
            id="signup-password"
            v-model="form.password"
            type="password"
            required
            :minlength="MIN_PASSWORD"
            autocomplete="new-password"
            aria-describedby="signup-password-hint"
            :placeholder="`${MIN_PASSWORD}자 이상`"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
          <p id="signup-password-hint" class="text-xs text-muted-foreground mt-1">
            {{ MIN_PASSWORD }}자 이상으로 정해주세요. 다른 사이트에서 쓰는 비밀번호는 피해주세요.
          </p>
        </div>

        <div>
          <label for="signup-password-confirm" class="block text-sm font-medium mb-1.5">비밀번호 확인 <span class="text-red-500" aria-hidden="true">*</span></label>
          <input
            id="signup-password-confirm"
            v-model="form.passwordConfirm"
            type="password"
            required
            autocomplete="new-password"
            placeholder="비밀번호 재입력"
            class="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        <!-- 개인정보 수집·이용 동의. 체크하지 않으면 제출되지 않는다. -->
        <div class="rounded-xl border border-border bg-muted/40 p-4">
          <label for="signup-consent" class="flex items-start gap-2.5 text-sm cursor-pointer">
            <input
              id="signup-consent"
              v-model="form.consent"
              type="checkbox"
              required
              class="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              개인정보 수집·이용에 동의합니다 <span class="text-red-500" aria-hidden="true">*</span>
            </span>
          </label>
          <details class="mt-2 text-xs text-muted-foreground">
            <summary class="cursor-pointer hover:text-foreground">수집 항목과 이용 목적 보기</summary>
            <dl class="mt-2 space-y-1.5 leading-relaxed">
              <div><dt class="inline font-medium text-foreground">수집 항목: </dt><dd class="inline">이름, 성별, 전화번호, 이메일</dd></div>
              <div><dt class="inline font-medium text-foreground">이용 목적: </dt><dd class="inline">교인 확인, 교회 소식·주보 등 회원 전용 자료 제공</dd></div>
              <div><dt class="inline font-medium text-foreground">보유 기간: </dt><dd class="inline">회원 탈퇴 시까지. 탈퇴하면 지체 없이 파기합니다.</dd></div>
              <div><dt class="inline font-medium text-foreground">동의 거부: </dt><dd class="inline">동의하지 않으실 수 있으나, 그 경우 회원 가입과 회원 전용 자료 이용이 제한됩니다.</dd></div>
            </dl>
          </details>
        </div>

        <!-- role=alert: 화면 낭독기가 오류를 즉시 읽어준다. -->
        <p v-if="errorMsg" role="alert" class="text-sm text-red-500 text-center">{{ errorMsg }}</p>

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
import { useAuth, setAuthNotice } from '@/composables/useAuth'
import { ROUTE_PATHS } from '@/lib/index'

const router = useRouter()
const { signUp } = useAuth()

/**
 * Supabase Auth 쪽 최소 길이와 맞춰야 한다. 여기서만 막으면 화면만 막히고
 * API 를 직접 부르면 통과한다.
 * 대시보드 → Authentication → Sign In / Providers → Email 펼치기
 *   → Minimum password length
 * (Policies 는 RLS 정책 화면이라 여기에 없다)
 */
const MIN_PASSWORD = 8

const form = ref({
  name: '',
  gender: '' as '남' | '여' | '',
  phone: '',
  email: '',
  password: '',
  passwordConfirm: '',
  consent: false,
})

const submitting = ref(false)
const errorMsg = ref('')

async function handleSignUp() {
  errorMsg.value = ''

  if (!form.value.gender) {
    errorMsg.value = '성별을 선택해주세요.'
    return
  }
  if (!form.value.consent) {
    errorMsg.value = '개인정보 수집·이용에 동의해주세요.'
    return
  }
  if (form.value.password.length < MIN_PASSWORD) {
    errorMsg.value = `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`
    return
  }
  if (form.value.password !== form.value.passwordConfirm) {
    errorMsg.value = '비밀번호가 일치하지 않습니다.'
    return
  }

  submitting.value = true
  try {
    const { needsEmailConfirm } = await signUp(form.value.email, form.value.password, {
      name: form.value.name,
      gender: form.value.gender as '남' | '여',
      phone: form.value.phone,
    })
    if (needsEmailConfirm) {
      // 대시보드에서 이메일 확인이 켜져 있으면 세션이 바로 생기지 않는다.
      // 로그인 화면에 한 번만 띄울 안내를 맡기고 보낸다.
      setAuthNotice('가입 확인 메일을 보냈습니다. 메일에 있는 링크를 누른 뒤 로그인해 주세요.')
      await router.push(ROUTE_PATHS.LOGIN)
      return
    }
    await router.push(ROUTE_PATHS.HOME)
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    submitting.value = false
  }
}
</script>
