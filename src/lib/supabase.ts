import { createClient } from '@supabase/supabase-js'
import { authStorage } from './authStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/*
  anon 키만 쓴다. service_role 키는 이 저장소 어디에도 두지 않는다 —
  브라우저로 내려가는 순간 RLS 를 통째로 우회할 수 있는 열쇠가 된다.

  auth 옵션을 명시하는 이유:
  - flowType 'pkce'  : OAuth 인가 코드가 중간에서 가로채여도 쓸 수 없게 한다.
  - detectSessionInUrl: 카카오에서 돌아올 때 주소의 ?code= 를 자동으로 세션과
                        바꾼다. 이게 꺼져 있으면 돌아와도 로그인이 안 된다.
  - storage          : 자동 로그인 켜짐/꺼짐에 따라 저장 위치를 고른다.
                       authStorage 설명 참고.
*/
/*
  카카오에서 돌아왔는지 여부. 세션 교환이 끝나면 supabase-js 가 주소에서
  ?code= 를 스스로 지우기 때문에, App.vue 가 확인할 때는 이미 늦을 수 있다.
  클라이언트를 만들기 전에 — 즉 교환이 시작되기 전에 — 먼저 찍어 둔다.
*/
export const oauthReturn = (() => {
  if (typeof window === 'undefined') return { pending: false, failed: false }
  const q = new URLSearchParams(window.location.search)
  return { pending: q.has('code') || q.has('error'), failed: q.has('error') }
})()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    storage: authStorage,
  },
})
