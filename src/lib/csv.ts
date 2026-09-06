/*
  엑셀에서 열리는 CSV 를 만든다. 두 가지를 챙긴다.

  - BOM 을 붙이지 않으면 엑셀이 한글을 깨서 읽는다.
  - '=' '+' '-' '@' 로 시작하는 칸을 엑셀은 수식으로 실행한다. 이름이나 직분에
    그런 글자가 들어오면 남의 파일에서 명령이 돌 수 있다(수식 주입). 앞에
    작은따옴표를 붙여 글자로 고정한다.

  줄바꿈은 CRLF 다. 엑셀이 LF 만 있는 파일을 한 줄로 읽는 일이 있다.
*/

/** 한 칸을 큰따옴표로 감싸고 안쪽 따옴표를 두 개로 늘린다. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

/** 머리글 한 줄 + 본문 여러 줄을 CSV 한 덩어리로. */
export function toCsv(header: readonly string[], rows: readonly unknown[][]): string {
  return [
    header.map(csvCell).join(','),
    ...rows.map(r => r.map(csvCell).join(',')),
  ].join('\r\n')
}

/**
 * 브라우저에 내려받기를 시킨다.
 *
 * 링크를 문서에 실제로 붙였다가 뗀다 — 붙이지 않은 <a> 의 click() 을 무시하는
 * 브라우저가 있다. revokeObjectURL 도 곧바로 부르지 않는다. click() 은 내려받기
 * 시작을 예약할 뿐이라, 같은 프레임에서 주소를 거둬들이면 시작도 못 하고
 * 취소되는 경우가 있다. 다음 차례로 미룬다.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 0)
}
