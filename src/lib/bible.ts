import { BIBLE_BOOK_FILES } from './bibleBooks'

// 전체 책이름 → 약어. 약어는 public/bible/*.json 의 절 키 접두사와 같다.
export const BOOK_MAP: Record<string, string> = {
  // 구약
  '창세기': '창', '출애굽기': '출', '레위기': '레', '민수기': '민', '신명기': '신',
  '여호수아': '수', '사사기': '삿', '룻기': '룻', '사무엘상': '삼상', '사무엘하': '삼하',
  '열왕기상': '왕상', '열왕기하': '왕하', '역대상': '대상', '역대하': '대하',
  '에스라': '스', '느헤미야': '느', '에스더': '에', '욥기': '욥', '시편': '시',
  '잠언': '잠', '전도서': '전', '아가': '아', '이사야': '사', '예레미야': '렘',
  '예레미야애가': '애', '에스겔': '겔', '다니엘': '단', '호세아': '호', '요엘': '욜',
  '아모스': '암', '오바댜': '옵', '요나': '욘', '미가': '미', '나훔': '나',
  '하박국': '합', '스바냐': '습', '학개': '학', '스가랴': '슥', '말라기': '말',
  // 신약
  '마태복음': '마', '마가복음': '막', '누가복음': '눅', '요한복음': '요',
  '사도행전': '행', '로마서': '롬', '고린도전서': '고전', '고린도후서': '고후',
  '갈라디아서': '갈', '에베소서': '엡', '빌립보서': '빌', '골로새서': '골',
  '데살로니가전서': '살전', '데살로니가후서': '살후', '디모데전서': '딤전', '디모데후서': '딤후',
  '디도서': '딛', '빌레몬서': '몬', '히브리서': '히', '야고보서': '약',
  '베드로전서': '벧전', '베드로후서': '벧후', '요한일서': '요일', '요한이서': '요이',
  '요한삼서': '요삼', '유다서': '유', '요한계시록': '계',
}

// 긴 이름부터 비교해야 "요한복음"이 "요한일서"보다 먼저 걸린다.
const BOOK_NAMES = Object.keys(BOOK_MAP).sort((a, b) => b.length - a.length)

/**
 * "요한복음 15:1-5" → { abbrev: '요', rest: '15:1-5' }
 * "요15:1" 처럼 약어를 직접 쓴 경우도 받는다. 못 읽으면 null.
 */
export function resolveScripture(scripture: string | null | undefined) {
  const text = scripture?.trim()
  if (!text) return null

  for (const name of BOOK_NAMES) {
    if (text.startsWith(name)) {
      return { abbrev: BOOK_MAP[name], rest: text.slice(name.length).trim() }
    }
  }

  const m = text.match(/^([가-힣]+)/)
  if (!m) return null
  return { abbrev: m[1], rest: text.slice(m[1].length).trim() }
}

// 같은 권을 다시 열 때 재요청·재파싱하지 않는다.
const cache = new Map<string, Record<string, string>>()
const inflight = new Map<string, Promise<Record<string, string>>>()

/** 해당 권의 절 사전만 받아온다. 모르는 약어면 빈 객체. */
export function loadBook(abbrev: string): Promise<Record<string, string>> {
  const cached = cache.get(abbrev)
  if (cached) return Promise.resolve(cached)

  const pending = inflight.get(abbrev)
  if (pending) return pending

  const file = BIBLE_BOOK_FILES[abbrev]
  if (!file) return Promise.resolve({})

  const promise = fetch(`${import.meta.env.BASE_URL}bible/${file}.json`)
    .then(r => {
      if (!r.ok) throw new Error(`bible/${file}.json ${r.status}`)
      return r.json() as Promise<Record<string, string>>
    })
    .then(data => { cache.set(abbrev, data); return data })
    .catch(() => ({}))
    .finally(() => { inflight.delete(abbrev) })

  inflight.set(abbrev, promise)
  return promise
}
