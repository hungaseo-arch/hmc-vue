// Supabase Free 플랜은 일정 기간 요청이 없으면 프로젝트를 일시정지한다.
// 매주 한 번 가벼운 읽기 요청을 보내 활동을 유지한다. anon 키만 쓴다(RLS 적용).
// staff 테이블은 anon 에게 select 가 열려 있다(마이그레이션 t12). 다른 테이블로 바꾸지 않는다.
async function ping(env) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/staff?select=id&limit=1`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  })
}

export default {
  async scheduled(_event, env) {
    const r = await ping(env)
    if (!r.ok) throw new Error(`keepalive failed: ${r.status}`) // 실패를 로그에 남긴다
  },
  // 수동 확인용. 브라우저로 열면 같은 요청을 1회 보낸다.
  async fetch(_req, env) {
    const r = await ping(env)
    return new Response(`supabase ${r.status}`, { status: r.ok ? 200 : 502 })
  },
}
