import { supabase } from '@/lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Why this module exists.
 *
 * When RLS filters out every candidate row, PostgREST returns 204 with
 * `error: null` - indistinguishable at the client from "you legitimately
 * updated 0 rows". Storage `.remove()` has the same trap: it resolves with
 * `{ data: [], error: null }` when a delete is denied.
 *
 * Several admin flows here used to patch local state optimistically on that
 * fake success, so the UI reported a save that never happened. These helpers
 * turn "0 rows affected" into a thrown error.
 */

export class NoRowsAffectedError extends Error {
  constructor(op: string) {
    super(`${op}에 실패했습니다. 권한이 없거나 대상이 존재하지 않습니다.`)
    this.name = 'NoRowsAffectedError'
  }
}

/**
 * PostgREST 가 돌려주는 error 는 Error 인스턴스가 아니라 평범한 객체다
 * (postgrest-js 는 throwOnError 를 켰을 때만 PostgrestError 를 만든다).
 * 그대로 throw 하면 화면 쪽 `e instanceof Error` 검사에 걸려 진짜 이유가
 * 통째로 사라지고 "저장에 실패했습니다" 만 남는다. 실제로 그 때문에
 * '컬럼이 없다'는 오류를 '권한 문제'로 한참 헤맸다.
 *
 * 사용자에게 보이는 문구는 한국어로 두되, 코드(42703, 42501 …)를 함께
 * 붙여 둔다. 원문은 raw 에 담아 콘솔에서 확인한다.
 */
export class DbError extends Error {
  readonly code: string
  readonly raw: PostgrestError

  constructor(op: string, error: PostgrestError) {
    super(`${op}에 실패했습니다.${error.code ? ` (${error.code})` : ''}`)
    this.name = 'DbError'
    this.code = error.code ?? ''
    this.raw = error
  }
}

/**
 * Wrap a PostgREST write that must touch at least one row.
 * The builder MUST end in `.select(...)` - that is what makes the affected
 * rows observable.
 *
 * Caveat worth keeping in mind: the returned rows are themselves filtered by
 * the table's SELECT policy. On a table where you may write but not read, this
 * would raise a false "denied". That is safe for every table here (sermons and
 * pastorColumn are world-readable; church_news_content and photo_album_meta are
 * readable by any authenticated user and only written by admins; profiles is
 * own-row read and own-row write) - but re-check it if a SELECT policy is ever
 * tightened.
 */
export async function mustAffectRows<T>(
  op: string,
  builder: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const { data, error } = await builder
  if (error) {
    console.warn(`[DB] ${op} 실패:`, error)
    throw new DbError(op, error)
  }
  if (!data || data.length === 0) throw new NoRowsAffectedError(op)
  return data
}

/** Storage delete that must actually delete. See note above on silent denial. */
export async function mustRemoveFiles(
  op: string,
  bucket: string,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return
  const { data, error } = await supabase.storage.from(bucket).remove(paths)
  if (error) throw error
  if (!data || data.length < paths.length) throw new NoRowsAffectedError(op)
}
