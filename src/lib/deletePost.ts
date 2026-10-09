import { supabase } from '@/lib/supabase'
import { mustAffectRows, mustRemoveFiles } from '@/lib/db'

/**
 * 소식과나눔 게시물 삭제. 파일을 먼저, 내용 행을 나중에 지운다 - 파일 삭제가
 * 거부되면(작성자가 아님) 아무것도 지워지지 않는다. 반대 순서였다면 행만 사라지고
 * 사진이 남아 목록에 '제목 없는 글' 로 되살아난다.
 *
 * 내용 행이 아예 없는 옛 글(파일명만으로 목록에 뜨던 것)은 슈퍼관리자만 지울 수
 * 있고, 그 경우 '지울 행이 없음' 은 오류가 아니다.
 */
export async function deletePost(opts: {
  op: string
  bucket: string
  paths: string[]
  table: string
  id: string
  isSuperAdmin: boolean
}): Promise<void> {
  await mustRemoveFiles(opts.op, opts.bucket, opts.paths)
  const builder = supabase.from(opts.table).delete().eq('id', opts.id).select('id')
  if (opts.isSuperAdmin) {
    const { error } = await builder
    if (error) throw error
  } else {
    await mustAffectRows(opts.op, builder)
  }
}
