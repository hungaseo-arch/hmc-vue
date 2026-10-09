# 작업지시서 — SEO 개선 (옛 주소 301 · 상세 메타 주입 · 콘텐츠/링크 · 구조화 데이터 · OG 이미지)

- 문서번호: HMC-WEB-2026-1009-02
- 작성일: 2026-10-09
- 대상: VSCode Claude Code (저장소 `/Users/seojonghwan/dev/hmc`)
- 발주: SEO Jonghwan / 서종환
- 버전: v3 (v1 도메인 전환 완료, v2 전환 후 정리)
- 근거: `hanmaumch.id_SEO_점검_및_개선안.md` (2026-10-09 점검)

---

## 0. 목적과 범위

### 0.1 목적
전환 후 끊긴 검색 유입을 회복하고(P0), 설교·칼럼 상세 299개가 검색·소셜에서 제대로 보이게 하며(P1), 크롤 깊이와 검색어 매칭 재료를 늘린다(P2~P4).

### 0.2 완료 기준
1. 옛 주소 10종(2.2 표)이 모두 **301**로 새 주소에 닿고, `m.hanmaumch.id` 도 같은 규칙으로 동작한다.
2. `curl -s https://www.hanmaumch.id/worship/sunday-sermon/150 | grep -o '<title>[^<]*'` 가 **설교 제목**을 보여준다(JS 미실행 상태). description·canonical·og:url·og:image 도 해당 설교 값. 칼럼 상세도 동일.
3. 설교 상세에 `VideoObject`(유튜브 있을 때) 또는 `Article` JSON-LD, 칼럼 상세에 `Article` + 둘 다 `BreadcrumbList` 가 있고 Rich Results Test 오류 0.
4. 설교·칼럼 목록의 페이지네이션이 `<a href="?page=N">` 링크이며, 직접 `?page=2` 로 들어가도 2페이지가 뜬다.
5. 홈 히어로 3장에 설명 alt, `og:image` 기본값이 1200×630 사진, 설교는 유튜브 썸네일.
6. 홈 `Church` JSON-LD 에 예배시간·지도·유튜브 채널이 추가되고 "처음 오신 분" 페이지에 `FAQPage`.
7. `npm run build` 통과, 배포 후 7절 검증 전부 통과, 브랜치 `feat/seo-v3` 커밋, 8절 보고표 작성.

### 0.3 현재 상태 (착수 전 재확인)
- 배포: `wrangler.toml` custom domain `www.hanmaumch.id`, 교회 Cloudflare 계정(hmcjktsu). v2 지시서 1단계가 끝났다면 `src/worker.ts` + `run_worker_first = true` + `[assets] binding = "ASSETS"` 가 이미 있다. **없으면 단계 1에서 만든다.**
- `src/lib/seo.ts`의 `setMeta()`가 클라이언트에서 메타를 갱신. `index.html` 정적 메타는 홈 값.
- 라우터: `/worship/sunday-sermon/:id`, `/worship/pastoral-column/:id`. id는 숫자(sitemap 기준 1~159, 칼럼 1~140 안팎).
- Supabase 공개 테이블: `sermons`(id, title, preacher, scripture, date, link[유튜브]), `pastorColumn`(id, title, content?, created_at, excerpt 가능성 — `20260808125032_p1_pastorcolumn_excerpt.sql` 확인). anon select 허용.
- 옛 사이트 이관 스크립트: `scripts/legacy-scraper/{sermon,pastorColumn,bulletin,churchNews,photoAlbum}.md`. 옛 글 번호(`num`)가 Supabase 행에 남아 있는지 **미확인**.
- 이미지: `public/` 에 `main01~03-1600.webp`, `logo_hmc.png/webp`. 폰트는 Google Fonts.
- CSP(`public/_headers`, 강제): `img-src 'self' data: https:` 라 `i.ytimg.com` 썸네일 허용됨. `connect-src 'self' https://*.supabase.co`.

---

## 1. 절대 준수 사항
1. 비밀값 출력·커밋 금지. Worker에서 Supabase는 **anon 키만** 쓰고 `wrangler secret put` 으로 넣는다(`.env` 값을 화면에 찍지 않고 파이프).
2. 교인 전용 경로(`/community/*`, `/admin/*`, `/login`, `/signup`, `/profile`, `/pending`, `/no-access`)는 **절대 메타 주입·프리렌더 대상에 넣지 않는다.** noindex·robots 차단 유지.
3. 배포 전 `npx wrangler whoami` = 교회 계정 확인. 아니면 중단.
4. Worker 응답 캐시는 **공개 페이지(설교·칼럼 상세·목록)에만** 건다.
5. 옛 주소 매핑에서 추측으로 상세 글을 연결하지 않는다. 옛 `num` ↔ 새 id 대응이 데이터로 확인될 때만 상세로, 아니면 **목록으로** 301.
6. 같은 명령 3회 실패 시 중단·보고. 🧑 체크포인트에서 사용자 확인.

---

## 2. 단계 1 (P0). 옛 주소 301 리다이렉트

### 2.1 옛 글 번호 매핑 가능 여부 확인 (먼저)
```bash
# Supabase 행에 옛 번호가 있는지: 컬럼명 후보 legacy_num, old_num, num, source_id
grep -rniE "legacy|old_num|\bnum\b|source" supabase/migrations/*.sql scripts/legacy-scraper/*.md | head -20
# 이관 결과물(엑셀/CSV)이 저장소나 "Claude outputs/" 에 남아 있는지
ls -la "Claude outputs" scripts 2>/dev/null
```
- 옛 `num` 이 어딘가 있으면 `src/legacy-map.json` 으로 `{ "sermon": { "468": 123, ... }, "column": { ... } }` 생성(빌드 시 import).
- 없으면 매핑 없이 **목록으로** 보낸다. 보고표에 "num 매핑 불가, 목록 리다이렉트" 기록.

### 2.2 매핑표
| 옛 패턴 | 새 주소 |
|---|---|
| `/main/main.html` | `/` |
| `/main/sub.html?mstrCode=1` | `/` |
| `/main/sub.html?mstrCode=2` | `/worship/sunday-sermon` |
| `/main/sub.html?mstrCode=3` | `/education/j-angels` |
| `/main/sub.html?mstrCode=4` | `/community/news` |
| `/main/sub.html?mstrCode=5` | `/` |
| `/main/sub.html?pageCode=6[&num=N]` | `/worship/sunday-sermon[/id]` |
| `/main/sub.html?pageCode=7[&num=N]` | `/worship/pastoral-column[/id]` |
| `/main/sub.html?pageCode=29` (찬양대찬양) | `/worship/church-video` |
| `/main/sub.html?pageCode=19` (사진첩) | `/community/photos` |
| `/main/sub.html?pageCode=22` (주보) | `/community/bulletin` |
| `/main/sub.html?pageCode=3`, `11` (제목 미확인) | `/introduction/welcome` |
| `/main/sub.html?pageCode=*` 기타 | `/` |
| `m.hanmaumch.id/core/mobile/main/subMain.html?mstrCode=N` | 위 mstrCode 규칙 |
| `m.hanmaumch.id/core/mobile/main/login.html` | `/login` |
| `m.hanmaumch.id/core/mobile/member/register.html` | `/signup` |
| `m.hanmaumch.id/core/module/personal_info/...` | `/` |
| `m.hanmaumch.id/*` 기타 | 같은 경로를 `www` 로 (`/` 로 폴백) |

### 2.3 구현
`src/worker.ts` (없으면 v2 지시서 1-1 코드로 먼저 생성) 의 `fetch` **맨 앞**에:
```ts
import legacy from './legacy-map.json' // 없으면 { sermon:{}, column:{} }
function legacyRedirect(url: URL): string | null {
  const host = url.hostname, p = url.pathname, q = url.searchParams
  const sec = (ms: string | null) => ({ '1':'/', '2':'/worship/sunday-sermon', '3':'/education/j-angels', '4':'/community/news', '5':'/' } as Record<string,string>)[ms ?? ''] ?? null
  if (host === 'm.hanmaumch.id') {
    if (/login\.html$/.test(p)) return '/login'
    if (/register\.html$/.test(p)) return '/signup'
    if (/subMain\.html$/.test(p)) return sec(q.get('mstrCode')) ?? '/'
    return '/'
  }
  if (p === '/main/main.html') return '/'
  if (p === '/main/sub.html') {
    const pc = q.get('pageCode'), num = q.get('num')
    if (q.get('mstrCode')) return sec(q.get('mstrCode')) ?? '/'
    if (pc === '6')  return num && legacy.sermon[num] ? `/worship/sunday-sermon/${legacy.sermon[num]}` : '/worship/sunday-sermon'
    if (pc === '7')  return num && legacy.column[num] ? `/worship/pastoral-column/${legacy.column[num]}` : '/worship/pastoral-column'
    if (pc === '29') return '/worship/church-video'
    if (pc === '19') return '/community/photos'
    if (pc === '22') return '/community/bulletin'
    if (pc === '3' || pc === '11') return '/introduction/welcome'
    return '/'
  }
  if (/^\/(main|core)\//.test(p)) return '/'
  return null
}
// fetch 안:
const to = legacyRedirect(url)
if (to) return Response.redirect(`https://www.hanmaumch.id${to}`, 301)
```
- 🧑 `m.hanmaumch.id`: Cloudflare DNS 에 CNAME `m` → `www.hanmaumch.id` **Proxied** 추가. `wrangler.toml` 에 `[[routes]] pattern = "m.hanmaumch.id" custom_domain = true` 추가 후 배포. (custom_domain 이 DNS 레코드를 직접 만들므로 CNAME 을 먼저 안 만들어도 됨 — 배포가 실패하면 그때 수동 추가.)

### 2.4 검증 (배포 후)
```bash
for u in "/main/main.html" "/main/sub.html?pageCode=6" "/main/sub.html?pageCode=6&num=468&page=" "/main/sub.html?pageCode=29" "/main/sub.html?mstrCode=2" "/main/sub.html?pageCode=3"; do printf '%-50s ' "$u"; curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "https://www.hanmaumch.id$u"; done
for u in "/core/mobile/main/subMain.html?mstrCode=2" "/core/mobile/main/login.html" "/core/mobile/member/register.html" "/"; do printf '%-50s ' "m $u"; curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "https://m.hanmaumch.id$u"; done
```
- 🧑 Search Console → URL 검사에 옛 주소 3개 입력 → "색인 생성 요청". 사이트맵 재제출.

---

## 3. 단계 2 (P1). 상세 페이지 정적 메타 주입 + JSON-LD

### 3.1 방식
Worker가 `/worship/sunday-sermon/:id`, `/worship/pastoral-column/:id` 요청일 때 Supabase REST(anon)로 1건 조회 → `env.ASSETS.fetch` 로 받은 `index.html` 을 **HTMLRewriter** 로 `<head>` 치환 + 크롤러용 본문 블록 삽입. 클라이언트 `setMeta()` 는 그대로 두어 SPA 내비게이션 시에도 동작.

### 3.2 데이터 조회
```ts
async function fetchSermon(env: Env, id: string) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/sermons?id=eq.${encodeURIComponent(id)}&select=id,title,preacher,scripture,date,link&limit=1`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` }, cf: { cacheTtl: 300 } })
  const [row] = r.ok ? await r.json() : []
  return row ?? null
}
// 칼럼: pastorColumn?id=eq.N&select=id,title,excerpt,content,created_at  (excerpt 없으면 content 앞 150자, 태그 제거)
```
- 컬럼명은 실제 테이블로 확인(`select=*&limit=1` 한 번 호출해 키 목록 확인, 값은 찍지 않기).
- 유튜브 id 추출: `SundaySermonDetailPage.vue` 의 `embedUrl` 로직과 같게(`watch?v=`, `youtu.be/`, `/live/`).

### 3.3 head 치환
```ts
const title = `${row.title} | 자카르타 한마음교회`
const desc  = [row.scripture, formatPreacher(row.preacher), row.date].filter(Boolean).join(' · ')   // 칼럼은 excerpt
const canon = `https://www.hanmaumch.id${url.pathname}`
const image = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : 'https://www.hanmaumch.id/og-default.jpg'
new HTMLRewriter()
  .on('title', { element(e){ e.setInnerContent(title) } })
  .on('meta[name="description"]', { element(e){ e.setAttribute('content', desc) } })
  .on('link[rel="canonical"]', { element(e){ e.setAttribute('href', canon) } })
  .on('meta[property="og:title"]', { element(e){ e.setAttribute('content', title) } })
  .on('meta[property="og:description"]', { element(e){ e.setAttribute('content', desc) } })
  .on('meta[property="og:url"]', { element(e){ e.setAttribute('content', canon) } })
  .on('meta[property="og:image"]', { element(e){ e.setAttribute('content', image) } })
  .on('meta[property="og:type"]', { element(e){ e.setAttribute('content', 'article') } })
  .on('meta[name="twitter:title"]', { element(e){ e.setAttribute('content', title) } })
  .on('meta[name="twitter:description"]', { element(e){ e.setAttribute('content', desc) } })
  .on('meta[name="twitter:image"]', { element(e){ e.setAttribute('content', image) } })
  .on('head', { element(e){ e.append(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`, { html: true }) } })
  .on('#app', { element(e){ e.before(`<div id="ssr-seo" hidden><h1>${esc(row.title)}</h1><p>${esc(desc)}</p></div>`, { html: true }) } })
  .transform(res)
```
- `formatPreacher` 는 `src/lib/index.ts` 의 것을 재사용(워커 번들에 포함되는지 확인; DOM 의존 없음이면 OK).
- `esc()` 로 HTML 이스케이프. `#ssr-seo` 는 `hidden` 이라 화면엔 안 보이고, 앱 마운트 후 `main.ts` 에서 `document.getElementById('ssr-seo')?.remove()`.
- JSON-LD:
  - 설교(유튜브 있음): `{"@type":"VideoObject","name","description","thumbnailUrl":[image],"uploadDate":date,"embedUrl":"https://www.youtube-nocookie.com/embed/ID","publisher":{"@type":"Organization","name":"자카르타 한마음교회","logo":{"@type":"ImageObject","url":".../logo_hmc.png"}}}`
  - 설교(유튜브 없음)·칼럼: `{"@type":"Article","headline","datePublished","author":{"@type":"Person","name":preacher},"publisher":...,"mainEntityOfPage":canon}`
  - 공통 `BreadcrumbList`: 홈 › 예배와기도 › 주일설교(또는 목회칼럼) › 제목.
- 응답 헤더: `Cache-Control: public, max-age=600, s-maxage=3600`. 행이 없으면(삭제된 글) 메타 주입 없이 **404** 로(단계 1 Worker의 404 규칙과 일관).

### 3.4 Worker 설정
- `wrangler.toml`: `main = "src/worker.ts"`, `[assets] binding="ASSETS"`, `run_worker_first = true` (v2 에서 했다면 유지). `compatibility_flags = ["nodejs_compat"]` 는 불필요.
- 비밀값: `grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | npx wrangler secret put SUPABASE_URL`, 같은 방식으로 `SUPABASE_ANON_KEY`.
- 로컬 테스트: `npx wrangler dev` + `.dev.vars` (gitignore 확인).

### 3.5 검증
```bash
for p in /worship/sunday-sermon/150 /worship/pastoral-column/10 /worship/sunday-sermon/999999; do
  echo "== $p"; curl -s -o /tmp/h.html -w '%{http_code}\n' "https://www.hanmaumch.id$p"
  grep -oE '<title>[^<]*|meta name="description" content="[^"]{0,80}|rel="canonical" href="[^"]*|og:image" content="[^"]*' /tmp/h.html | head -5
  grep -c 'application/ld+json' /tmp/h.html
done
```
- 기대: 150·10 → 200 + 제목/설명/canonical/og:image 치환 + ld+json 2개(원래 Church 제외하고 1~2개 추가). 999999 → 404.
- 🧑 Rich Results Test(https://search.google.com/test/rich-results)에 설교 상세 1개, 칼럼 1개 입력 → 오류 0. 카카오톡 "나에게 보내기"로 링크 미리보기 확인.

---

## 4. 단계 3 (P2). 콘텐츠·링크 구조

### 4.1 페이지네이션 링크화 (설교·칼럼 목록)
- `usePageQuery` 컴포저블(이미 있음: `src/composables/usePageQuery.ts`)이 `?page=` 를 읽는지 확인. 목록 페이지가 이를 쓰도록 하고, `ThePagination.vue` 의 버튼을 `<RouterLink :to="{ query: { page: n } }">` 로. 현재 페이지는 `aria-current="page"`.
- `<head>` 에 `<link rel="next">`/`prev` 는 Google이 더 이상 쓰지 않으므로 생략. sitemap 에 목록 `?page=N` 은 넣지 않는다(상세가 이미 있음).
- 검증: `curl -s "https://www.hanmaumch.id/worship/sunday-sermon?page=2"` 후 브라우저로 2페이지 렌더 확인, 목록 HTML(JS 후)에 `href="/worship/sunday-sermon?page=2"` 존재.

### 4.2 히어로 alt
`HomePage.vue` 캐러셀 3장: `alt="자카르타 한마음교회 주일예배"`, `"한마음교회 성도들의 교제"`, `"자카르타 한마음교회 예배당"` 등 실제 사진에 맞게(🧑 사진 내용 확인 요청).

### 4.3 관련 설교 링크
설교 상세 하단에 "같은 본문·같은 설교자" 3~5개: Supabase 에서 `scripture` 의 책 이름(`resolveScripture().abbrev`) 또는 `preacher` 가 같은 최근 5건(현재 글 제외) 조회 → `<RouterLink>` 목록. 칼럼도 최근 5건.

### 4.4 설교 요약 필드 (운영 연동)
- 마이그레이션 `supabase/migrations/2026100900xx_t16_sermon_summary.sql`: `alter table public.sermons add column if not exists summary text;` + 기존 RLS·grant 가 컬럼 추가로 깨지지 않는지(테이블 단위 grant 라 보통 무방, `t13`/`t14` 패턴 확인).
- 관리자 설교 입력 화면(`src/pages/admin/` 중 설교 등록 폼)에 "요약(2~3문장, 검색 노출용)" textarea 추가.
- `setMeta`·Worker 메타·`VideoObject.description` 에서 `summary` 가 있으면 우선 사용, 없으면 기존 `scripture · preacher · date`.
- 🧑 적용 후 Supabase 대시보드 SQL 편집기로 마이그레이션 실행(또는 `supabase db push`).

### 4.5 FAQ (처음 오신 분)
`WelcomePage.vue` 에 FAQ 5~6개(예배 시간, 언어, 주차, 아이 돌봄, 복장, 연락처) 섹션 + `setMeta` 와 별도로 페이지에 `FAQPage` JSON-LD 삽입(컴포넌트 `onMounted` 에서 `<script type="application/ld+json">` append, 언마운트 시 제거). 🧑 답변 문구 확인.

---

## 5. 단계 4 (P3). 구조화 데이터 확장 (홈)
`index.html` 의 `Church` JSON-LD 에 추가:
```json
"openingHoursSpecification": [{"@type":"OpeningHoursSpecification","dayOfWeek":"Sunday","opens":"HH:MM","closes":"HH:MM"}],
"geo": {"@type":"GeoCoordinates","latitude": <lat>, "longitude": <lng>},
"hasMap": "https://maps.google.com/?q=...",
"sameAs": ["https://www.youtube.com/@<채널>"]
```
- 🧑 예배시간(예배안내 페이지 값과 동일하게), 좌표(오시는 길 지도 임베드의 좌표), 유튜브 채널 주소 확인.

---

## 6. 단계 5 (P4). OG 이미지
- `public/og-default.jpg` 1200×630(≤200KB): 교회 전경 또는 예배 사진. 🧑 사진 제공. 없으면 `main01-1600.webp` 를 1200×630 으로 크롭해 jpg 변환(`sharp` 1회성 스크립트 또는 macOS `sips`).
- `index.html` og:image/twitter:image 와 `src/lib/seo.ts` `DEFAULT_IMAGE` 를 `/og-default.jpg` 로. 설교는 단계 2에서 유튜브 썸네일.
- 검증: `curl -s https://www.hanmaumch.id/ | grep og:image`, 카톡 미리보기.

---

## 7. 배포·검증·커밋
```bash
git switch -c feat/seo-v3
npm run build                       # 타입·린트·테스트
npx wrangler dev                    # 로컬: 옛 주소 301, 상세 메타 치환, 404 유지
npx wrangler whoami && npm run deploy
```
배포 후:
1. 2.4 옛 주소 전부 301
2. 3.5 상세 메타·JSON-LD, 404 유지
3. `curl -s https://www.hanmaumch.id/robots.txt`, sitemap 315 유지
4. 기존 페이지 회귀: 홈·소개·예배·교육 200, 교인 전용 로그인 후 정상, 카카오 로그인 OK (🧑)
5. 🧑 Rich Results Test, 카톡 미리보기, Search Console URL 검사·색인 요청
6. 커밋 단위: `feat(seo): legacy URL 301 redirects` / `feat(seo): inject per-page meta and JSON-LD at edge` / `feat(seo): link pagination, hero alt, related sermons` / `feat(seo): church schema, FAQ, og image`

---

## 8. 작업 보고 (Claude 가 채움)
| 단계 | 상태 | 일시 | 결과·특이사항 |
| --- | --- | --- | --- |
| 1 옛 주소 301 (num 매핑 여부 포함) | 완료 | 2026-10-09 | www 6종·m. 4종 모두 301 확인. num 매핑 불가(Supabase·이관 파일에 옛 번호 없음) → pageCode 6·7 은 목록으로 301 |
| 2 상세 메타 주입·JSON-LD | 완료 | 2026-10-09 | 설교 150·칼럼 10 제목/og:image 치환, 없는 글 404. Rich Results Test 유효 항목 3개 |
| 3-1 페이지네이션 링크 | 완료 | 2026-10-09 | RouterLink(?page=N), 직접 ?page=2 진입 200 |
| 3-2 히어로 alt | 완료 | 2026-10-09 | 긴 줄표는 하이픈으로 |
| 3-3 관련 설교 | 완료 | 2026-10-09 | 설교(같은 책·설교자 5건), 칼럼(최근 5건). RouterView 에 path key 추가 |
| 3-4 설교 요약 필드 | 완료 | 2026-10-09 | 마이그레이션 t22(번호 t16 은 사용 중), 사용자가 SQL 편집기로 적용 |
| 3-5 FAQ | 완료 | 2026-10-09 | 기존 faqs 배열에서 FAQPage JSON-LD 생성 |
| 4 Church 스키마 확장 | 완료 | 2026-10-09 | 예배시간·geo·hasMap·sameAs 추가 |
| 5 OG 이미지 | 완료 | 2026-10-09 | og-default.jpg 1200×630 144KB. 카톡 미리보기 제목·설명·썸네일 확인 |
| 7 배포·검증 | 대부분 완료 | 2026-10-09 | 배포·curl 검증 통과, sitemap 314개(빌드 때부터 314). Search Console 색인 요청 3건·sitemap 확인 완료(사용자 확인) |

---

## 9. 보류·범위 밖
- 네이버 서치어드바이저·Bing Webmaster 등록(🧑 계정 작업, 사이트 소유확인 메타 추가가 필요하면 그때 요청)
- GA4 도입(필요 시 CSP 허용 목록 변경 동반)
- 인도네시아어 페이지·hreflang
- 전체 프리렌더(vite-ssg): 단계 2 로 충분하면 안 함
