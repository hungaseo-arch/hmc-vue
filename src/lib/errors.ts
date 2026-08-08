/*
  catch 로 잡은 값에서 사람이 읽을 메시지를 꺼낸다.

  여기저기 (e as any)?.message 로 쓰고 있었다. any 를 쓰면 오타가 나도
  타입 검사가 못 잡는다. Supabase 가 던지는 것은 Error 가 아니라
  { message, code, details } 모양의 평범한 객체라서 instanceof Error 만으로는
  부족하다. 그래서 message 속성이 있는지 직접 본다.
*/
export function errorMessage(e: unknown, fallback = '알 수 없는 오류가 발생했습니다.'): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return fallback
}
