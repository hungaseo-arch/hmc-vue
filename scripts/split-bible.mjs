// public/bible.json (5.1MB) 을 권별 파일로 쪼갠다.
//
// 설교 상세 페이지는 본문 한 곳(예: "요한복음 15:1-5")만 표시하는데
// 성경 전체를 내려받고 있었다. 권별로 나누면 한 권(10~60KB)만 받으면 된다.
//
//   node scripts/split-bible.mjs
//
// 출력: public/bible/01.json … 66.json, src/lib/bibleBooks.ts
// 원본 public/bible.json 은 남겨두지 않는다(분할본과 이중 관리 금지).

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'public/bible.json')
const outDir = resolve(root, 'public/bible')

const all = JSON.parse(readFileSync(src, 'utf8'))

// 키는 "창1:1" 형태. 앞의 한글 연속열이 권 약어다.
// ("요18:이" 같은 데이터 오류 키도 약어는 정상이라 손실 없이 갈린다.)
const books = new Map() // abbrev -> { [key]: text }  (원본 등장 순서 = 정경 순서)
let skipped = 0
for (const [key, text] of Object.entries(all)) {
  const m = key.match(/^([가-힣]+)/)
  if (!m) { skipped++; continue }
  const abbrev = m[1]
  if (!books.has(abbrev)) books.set(abbrev, {})
  books.get(abbrev)[key] = text
}
if (skipped) throw new Error(`약어를 못 읽은 키 ${skipped}개 — 분할이 손실된다`)

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const index = {}
let n = 0
let total = 0
for (const [abbrev, verses] of books) {
  n++
  const id = String(n).padStart(2, '0')
  const json = JSON.stringify(verses)
  writeFileSync(resolve(outDir, `${id}.json`), json)
  index[abbrev] = id
  total += json.length
}

// 약어 → 파일 번호. 런타임에 index 파일을 또 받지 않도록 소스에 박아둔다.
writeFileSync(
  resolve(root, 'src/lib/bibleBooks.ts'),
  `// 이 파일은 scripts/split-bible.mjs 가 생성한다. 직접 고치지 말 것.\n` +
  `// 약어 → public/bible/<id>.json\n` +
  `export const BIBLE_BOOK_FILES: Record<string, string> = ${JSON.stringify(index, null, 2)}\n`
)

rmSync(src)

const verseCount = Object.keys(all).length
console.log(`${books.size}권 / ${verseCount}절 분할 완료`)
console.log(`  원본 ${(readFileSync(resolve(root, 'src/lib/bibleBooks.ts')).length / 1024).toFixed(1)}KB 인덱스, 권 평균 ${(total / books.size / 1024).toFixed(1)}KB`)
