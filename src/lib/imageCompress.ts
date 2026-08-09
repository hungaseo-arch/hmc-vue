/*
  올리기 전에 브라우저에서 사진을 줄인다.

  요즘 휴대폰 사진은 한 장에 2~5 MB 다. 지금 Storage 에 있는 804장 중 115장이
  300 KB 를 넘고 가장 큰 것은 2.2 MB 다. 그대로 쌓이면 저장 용량도 문제지만,
  앨범 한 개를 열 때 수십 장을 원본으로 받게 되어 인도네시아 모바일 회선에서는
  기다림이 길다.

  서버가 아니라 업로드하는 사람의 브라우저에서 줄인다. 서버 함수도, 추가
  비용도 필요 없고, 느린 회선에서는 올리는 시간 자체가 줄어 오히려 빠르다.

  건드리지 않는 것:
  - PDF 등 이미지가 아닌 파일 (주보는 PDF 도 받는다)
  - GIF (다시 그리면 움직임이 죽는다)
  - 이미 작고 크기도 적당한 사진 (다시 인코딩하면 화질만 손해다)
*/

/** 목표 용량. 이보다 작아질 때까지 화질과 크기를 차례로 낮춘다. */
export const MAX_UPLOAD_BYTES = 300 * 1024

/** 긴 변 기준. 위에서부터 시도하고, 화질을 다 낮춰도 안 되면 다음으로 내려간다. */
const EDGES = [2000, 1600, 1280, 1000]
const QUALITIES = [0.82, 0.7, 0.6, 0.5, 0.42]

/** 이 안에 드는 사진은 손대지 않는다. */
const SKIP_EDGE = 2400

function isCompressible(file: File): boolean {
  return file.type.startsWith('image/') && file.type !== 'image/gif'
}

function withWebpName(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.webp'
}

function draw(bitmap: ImageBitmap, edge: number): HTMLCanvasElement {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 를 쓸 수 없습니다.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality))
}

/**
 * 300 KB 아래로 줄인 파일을 돌려준다. 줄일 수 없거나 줄일 필요가 없으면
 * 원본을 그대로 돌려준다. 실패해도 던지지 않는다 — 압축은 편의 기능이지
 * 업로드를 막을 이유가 아니다.
 */
export async function compressImage(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<File> {
  if (!isCompressible(file)) return file

  let bitmap: ImageBitmap
  try {
    // from-image: 세로로 찍은 사진이 눕지 않게 EXIF 회전 정보를 반영한다.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const longEdge = Math.max(bitmap.width, bitmap.height)
    if (file.size <= maxBytes && longEdge <= SKIP_EDGE) return file

    // 목표에 못 미치더라도 지금까지 중 가장 작은 결과는 챙겨 둔다.
    let best: Blob | null = null

    for (const edge of EDGES) {
      if (edge > longEdge && edge !== EDGES[EDGES.length - 1]) continue
      const canvas = draw(bitmap, edge)

      for (const quality of QUALITIES) {
        const blob = await toBlob(canvas, quality)
        if (!blob) continue
        if (!best || blob.size < best.size) best = blob
        if (blob.size <= maxBytes) {
          return new File([blob], withWebpName(file.name), { type: 'image/webp' })
        }
      }
    }

    // 목표까지는 못 갔어도 원본보다 작으면 그쪽이 낫다.
    if (best && best.size < file.size) {
      return new File([best], withWebpName(file.name), { type: 'image/webp' })
    }
    return file
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 진행 표시에 붙일 '8.4 MB → 1.9 MB' 문구. 줄어든 게 없으면 빈 문자열이라
 * 화면에 아무것도 더 붙지 않는다. 관리자가 압축이 됐는지 눈으로 확인하는 용도다.
 */
export function sizeSummary(before: File[] | FileList, after: File[]): string {
  const b = Array.from(before).reduce((sum, f) => sum + f.size, 0)
  const a = after.reduce((sum, f) => sum + f.size, 0)
  if (a >= b) return ''
  return ` · ${formatBytes(b)} → ${formatBytes(a)}`
}

/**
 * 여러 장을 차례로 줄인다. 한 장씩 처리해야 큰 사진 여러 개가 동시에
 * 메모리에 올라가지 않는다.
 */
export async function compressImages(
  files: File[] | FileList,
  onProgress?: (done: number, total: number) => void,
): Promise<File[]> {
  const list = Array.from(files)
  const out: File[] = []
  for (let i = 0; i < list.length; i++) {
    onProgress?.(i, list.length)
    out.push(await compressImage(list[i]))
  }
  onProgress?.(list.length, list.length)
  return out
}
