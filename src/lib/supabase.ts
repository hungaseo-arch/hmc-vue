import { createClient } from '@supabase/supabase-js'
import { authStorage } from './authStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/*
  값이 비어 있으면 여기서 바로 멈춘다. 그냥 두면 createClient 가 영어로
  "supabaseUrl is required" 를 던지거나, 빈 주소로 요청을 보내 화면마다
  제각각 실패한다. 빌드 환경(.env, Cloudflare 변수)에서 빠진 것이므로
  개발자에게 바로 보이게 한다.
*/
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다. .env 를 확인해 주세요.')
}

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
  // 카카오는 signInWithKakao 의 redirectTo 대로 루트('/')로만 돌아온다.
  // 다른 경로의 ?code= / ?error= 는 우리 것이 아니다(외부 링크의 잔여 쿼리 등).
  const atRoot = window.location.pathname === '/'
  return { pending: atRoot && (q.has('code') || q.has('error')), failed: atRoot && q.has('error') }
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
