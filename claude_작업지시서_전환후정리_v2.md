# 작업지시서 — 도메인 전환 후 정리 (404 · 메일 중단 · HSTS · CSP · 자동접속 · 비밀번호)

- 문서번호: HMC-WEB-2026-1009-01
- 작성일: 2026-10-09
- 대상: VSCode Claude Code (저장소 `/Users/seojonghwan/dev/hmc`)
- 발주: SEO Jonghwan / 서종환
- 버전: v2 (v1 = `claude_작업지시서_도메인전환_v1.md`, 전부 완료)

---

## 0. 목적과 범위

### 0.1 목적
`www.hanmaumch.id` 전환이 끝난 사이트의 운영 품질을 마무리한다. 6개 작업:

| # | 작업 | 종류 |
| --- | --- | --- |
| 1 | 없는 주소가 HTTP 200 으로 응답하는 문제 검토·해결 | 코드 |
| 2 | 도메인 메일(`@hanmaumch.id`)을 사용하지 않도록 DNS 정리 | DNS (🧑 대시보드) + 확인 게이트 |
| 3 | HSTS 활성화 | 코드 배포 + 🧑 Cloudflare 설정 |
| 4 | CSP 를 Report-Only → 강제(enforce)로 전환 | 코드 배포 |
| 5 | Supabase 주간 자동접속(Free 플랜 일시정지 방지) + 도메인 갱신 리마인더 | 코드 + 🧑 캘린더 |
| 6 | 작업 중 생긴 비밀번호 텍스트 파일을 비밀번호 관리자로 옮기고 파일 삭제 | 🧑 + 검증 |

### 0.2 완료 기준
1. `curl -s -o /dev/null -w '%{http_code}' https://www.hanmaumch.id/zzz-not-exist` → **404** (현재 200). 기존 페이지·딥링크·해시 주소는 모두 200 유지.
2. `dig +short MX hanmaumch.id` → `0 .` (Null MX) 하나만. SPF 가 `v=spf1 -all`, DMARC `p=reject`. Google 관련 CNAME 없음.
3. `curl -sI https://www.hanmaumch.id/` 에 `strict-transport-security: max-age=...; includeSubDomains` 가 있고 Cloudflare HSTS 설정도 켜져 있다.
4. 같은 응답에 `content-security-policy:` 헤더(Report-Only 아님)가 있고, 홈·설교·사진첩·관리자 페이지에서 콘솔 CSP 차단 오류가 0건.
5. 교회 Cloudflare 계정에 `hmc-keepalive` Worker 가 매주 1회 Supabase 에 요청을 보내고, 수동 실행 로그로 200 을 확인. 도메인 갱신 리마인더가 캘린더에 등록돼 있다.
6. `~/.aside/u/0/sessions/2026-09-28_VsPYqtT4tpV5R59a/tmp/` 의 `rumahweb_account_hmcjktsu.txt`, `cloudflare_account_hmcjktsu.txt`, `rumahweb_account.txt`, `otp_latest.txt`, `epp_note.txt` 가 삭제되고, 사용자가 비밀번호 관리자 보관을 확인.
7. 변경이 브랜치 `chore/post-cutover` 에 커밋되고 8절 보고표가 채워진다.

### 0.3 현재 상태 (2026-10-09, 착수 전 재확인)
- 실서비스: `www.hanmaumch.id` 200, apex·workers.dev → 301, sitemap 315, 인증서 정상
- `public/_headers` 에는 **이미** `Strict-Transport-Security: max-age=86400` 과 강제 `Content-Security-Policy` 가 들어가 있으나 **미배포** (실서비스는 아직 `content-security-policy-report-only`, HSTS 헤더 없음)
- `src/router/index.ts` 69행: `/:pathMatch(.*)*` → `NotFoundPage.vue`, `meta.noindex: true` (검색엔진 noindex 는 이미 됨, 상태코드만 200)
- `wrangler.toml`: `[assets] not_found_handling = "single-page-application"`, custom domain `www.hanmaumch.id`. Worker 스크립트 없음(정적 자산만)
- DNS(Cloudflare, 교회 계정): MX 7개(Google), TXT `v=spf1 include:_spf.google.com ~all`, TXT `google-site-verification=...`(Search Console, **유지**), CNAME `mail/calendar/docs/sites` → ghs.google.com, apex A 192.0.2.1(Proxied, 리다이렉트용)
- Supabase 프로젝트 ref `marsnvwgqwjakvogzhbk`, 교회 조직. 플랜은 미확인(Free 추정)
- 도메인 만료 2028-08-23, Rumahweb 자동갱신 꺼짐

---

## 1. 절대 준수 사항
1. 비밀값(`.env` 키, Supabase service_role, Cloudflare 토큰, 비밀번호 파일 내용)을 터미널·로그·커밋·이 문서에 출력하지 않는다. 파일 존재 여부만 `ls`, 내용은 보지 않는다.
2. `.env` 커밋 금지. Worker 비밀값은 `wrangler secret put` 으로만 넣는다.
3. 🧑 체크포인트에서 멈추고 사용자 확인을 받는다. **특히 2번(메일 중단)은 되돌리기 어려우므로 1-2 게이트를 통과하기 전엔 DNS 를 건드리지 않는다.**
4. 배포 전 `npx wrangler whoami` 가 교회 계정(`hmcjktsu@gmail.com`)인지 확인. 아니면 배포 금지.
5. `google-site-verification` TXT 와 apex 더미 A 레코드는 삭제하지 않는다.
6. 같은 명령이 결과 변화 없이 3회 실패하면 중단·보고.

---

## 2. 작업 단계

### 단계 0. 준비
```bash
cd /Users/seojonghwan/dev/hmc
git status                       # 깨끗해야 함. 아니면 보고
git switch -c chore/post-cutover
npx wrangler whoami              # 교회 계정 확인
curl -sI https://www.hanmaumch.id/ | grep -iE '^(strict|content-security)'   # 착수 전 상태 기록
```

---

### 단계 1. 없는 주소 404 처리

**원인**: `not_found_handling = "single-page-application"` 은 모든 미존재 경로에 `index.html` 을 **200** 으로 돌려준다. 라우터가 404 화면을 그리지만 HTTP 상태는 200 이라 검색엔진·모니터링이 정상 페이지로 본다.

**방법**: 자산 앞단에 작은 Worker 를 두고, 알려진 경로 패턴이면 그대로 통과(200), 아니면 `index.html` 본문을 **404 상태로** 돌려준다. 라우터는 그대로 404 화면을 그린다.

1-1. `src/worker.ts` 작성
```ts
// 정적 자산 앞단. 알려진 SPA 경로는 통과시키고, 모르는 경로는 index.html 을 404 로 돌려준다.
// 경로 목록은 src/router/index.ts 의 ROUTE_PATHS 와 반드시 같이 고친다.
export interface Env { ASSETS: Fetcher }

// 정확히 일치해야 하는 경로
const EXACT = new Set<string>([
  '/', '/login', '/signup', '/profile', '/pending', '/no-access',
  '/introduction/welcome', '/introduction/greeting', '/introduction/history',
  '/introduction/staff', '/introduction/worship-guide', '/introduction/directions',
  '/worship/sunday-sermon', '/worship/pastoral-column', '/worship/church-video',
  '/education/j-angels', '/education/j-kids', '/education/ja-yu', '/education/youth', '/education/adult',
  '/community/news', '/community/photos', '/community/bulletin', '/community/mission-news',
  '/admin',
])
// id 가 붙는 경로. 숫자 id 만 허용(현재 DB id 형식 확인 후 필요하면 정규식 조정)
const DYNAMIC: RegExp[] = [
  /^\/worship\/sunday-sermon\/\d+$/,
  /^\/worship\/pastoral-column\/\d+$/,
  /^\/community\/news\/\d+$/,
  /^\/community\/photos\/\d+$/,
  /^\/community\/bulletin\/\d+$/,
  /^\/admin\/[a-z-]+$/,
]

function isSpaRoute(path: string): boolean {
  const p = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
  return EXACT.has(p) || DYNAMIC.some(r => r.test(p))
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const res = await env.ASSETS.fetch(request)
    // 실제 파일(js/css/이미지/bible/sitemap 등)은 그대로
    if (res.status !== 200 || !res.headers.get('content-type')?.includes('text/html')) return res
    // HTML 응답인데 SPA 경로가 아니면 404 로 바꿔 돌려준다(본문·헤더는 그대로)
    if (!isSpaRoute(url.pathname)) return new Response(res.body, { status: 404, headers: res.headers })
    return res
  },
}
```
- **ROUTE_PATHS 를 실제로 열어서** 위 목록과 대조한다. 빠진 경로가 있으면 추가. `/admin` 하위 실제 경로도 확인.
- 설교·칼럼 id 형식 확인: `grep -n "id" scripts/gen-sitemap.mjs` 및 sitemap 의 `<loc>` 샘플. 숫자가 아니면 `DYNAMIC` 정규식을 맞춘다.

1-2. `wrangler.toml` 수정
```toml
name = "hmc"
main = "src/worker.ts"
compatibility_date = "2025-01-01"

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = true

[[routes]]
pattern = "www.hanmaumch.id"
custom_domain = true
```
- `tsconfig.json` 이 `src/worker.ts` 를 앱 번들에 포함하지 않는지 확인(Vite 는 `index.html` 에서 참조하는 파일만 번들하므로 보통 문제없음). `vue-tsc --noEmit` 가 `Fetcher` 타입을 모르면 `npm i -D @cloudflare/workers-types` 후 `tsconfig` 의 `types` 에 추가하거나, `worker.ts` 상단에 `/// <reference types="@cloudflare/workers-types" />`.

1-3. 검증
```bash
npm run build
npx wrangler dev --local &   # 로컬
sleep 5
for p in / /worship/sunday-sermon /introduction/staff /zzz-not-exist /worship/sunday-sermon/abc /assets/ /robots.txt /sitemap.xml; do
  printf '%-34s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8787$p)"
done
# 기대: / 200, 실제 경로 200, /zzz-not-exist 404, /worship/sunday-sermon/abc 404, robots/sitemap 200
kill %1
```
- sitemap 의 `<loc>` 전부가 200 인지 확인:
```bash
curl -s http://localhost:8787/sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>https:\/\/www.hanmaumch.id//' | head -400 | while read p; do c=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8787$p"); [ "$c" != 200 ] && echo "NOT200 $c $p"; done; echo done
```
- 전부 통과하면 커밋: `feat: return real 404 for unknown paths via assets worker`
- **배포는 단계 4 와 함께** 한 번에 한다(헤더 변경과 같이 검증).

---

### 단계 2. 도메인 메일 사용 중단 (🧑 게이트 필수)

**배경**: `@hanmaumch.id` 메일은 Google Workspace 로 교회 내부에서 가입한 것으로 보이나 관리자 계정을 모른다. 사용자가 "메일은 사용하지 않는다"고 결정했다. 메일을 끊으면 **그 주소로 오는 모든 메일이 반송**되고, Workspace 가 유료였다면 해지는 별도(관리자 계정 필요)다.

2-1. 🧑 게이트 (Claude 는 질문만 하고 대기)
사용자에게 아래를 확인받고 "진행" 답을 받기 전엔 2-2 로 넘어가지 않는다.
1. 현재 `@hanmaumch.id` 주소를 쓰는 사람·서비스가 **하나도 없는가**? (교회 공지, 명함, 계좌·결제 알림, 카카오/Supabase 등 외부 서비스의 로그인 이메일로 쓰인 적이 있는가)
2. 끊은 뒤 그 주소로 온 메일은 **돌려보내는 것(반송)** 으로 해도 되는가?
3. Google Workspace 결제가 남아 있을 수 있는데, 관리자 계정을 모르는 상태에서 해지는 **이번 작업 범위 밖**임을 인지했는가?

2-2. 🧑 Cloudflare DNS 변경 (사용자가 대시보드에서, Claude 는 목록 제시·검증)
교회 Cloudflare 계정 → hanmaumch.id → DNS → Records:

| 조치 | 레코드 |
| --- | --- |
| 삭제 | MX 7개 (`ASPMX.L.GOOGLE.COM`, `ALT1/2...`, `ASPMX2~5.GOOGLEMAIL.COM`) |
| 삭제 | CNAME `mail`, `calendar`, `docs`, `sites` → ghs.google.com |
| 수정 | TXT `@` `v=spf1 include:_spf.google.com ~all` → **`v=spf1 -all`** |
| 추가 | MX `@` 값 `.` 우선순위 `0` (Null MX, RFC 7505: "이 도메인은 메일을 받지 않는다") |
| 추가 | TXT `_dmarc` 값 `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` |
| **유지** | TXT `google-site-verification=...` (Search Console), apex A 192.0.2.1, `www`(Workers 자동) |

2-3. 검증
```bash
dig +short MX hanmaumch.id @1.1.1.1          # 0 .
dig +short TXT hanmaumch.id @1.1.1.1         # "v=spf1 -all" 과 google-site-verification 두 줄
dig +short TXT _dmarc.hanmaumch.id @1.1.1.1  # v=DMARC1; p=reject ...
dig +short mail.hanmaumch.id @1.1.1.1        # 비어 있음
curl -sI https://www.hanmaumch.id/ | head -1 # 여전히 200 (웹에 영향 없음 확인)
```
- Search Console 소유권이 TXT 로 되어 있으므로 삭제되지 않았는지 꼭 확인.
- 완료되면 README "운영" 절에 "도메인 메일 미사용(Null MX, 2026-10-xx)" 한 줄 기록.

---

### 단계 3. HSTS 활성화

3-1. 코드(이미 `public/_headers` 에 있음) 값 보강
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```
- `preload` 는 넣지 않는다(되돌리기 어려움). 먼저 86400 으로 배포해 하루 관찰해도 되지만, 사이트가 이미 HTTPS 전용이고 apex·www 모두 Cloudflare 라 바로 1년으로 가도 된다. **단, `includeSubDomains` 는 2단계가 끝나 `mail.` 등 비-HTTPS 서브도메인이 없을 때만** 넣는다. 2단계 전이라면 `max-age=31536000` 만.

3-2. 🧑 Cloudflare 설정 (사용자)
교회 Cloudflare → hanmaumch.id → SSL/TLS → Edge Certificates → **HTTP Strict Transport Security (HSTS)** → Enable
- Max Age: 12 months, Apply to subdomains: 2단계 완료 시 On, Preload: **Off**, No-Sniff: On
- 같은 화면 **Always Use HTTPS: On**, **Minimum TLS Version: 1.2**, **TLS 1.3: On**

3-3. 검증(단계 4 배포 후)
```bash
curl -sI https://www.hanmaumch.id/ | grep -i strict
curl -sI http://www.hanmaumch.id/ | grep -iE '^(HTTP|location)'   # 301 → https
```

---

### 단계 4. CSP 강제 전환 + 배포

4-1. `public/_headers` 확인: `Content-Security-Policy:` (Report-Only 아님) 한 줄만 있고 `-Report-Only` 줄이 남아 있지 않은지. 현재 값:
```
default-src 'self'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self' https://*.supabase.co; frame-src https://www.youtube-nocookie.com https://www.google.com/maps/embed; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```
- 카카오 로그인은 Supabase 콜백으로 **전체 페이지 이동**이라 `connect-src` 에 kakao 가 필요 없다. 다만 혹시 `kauth.kakao.com` 으로 fetch/XHR 하는 코드가 있는지 `grep -rn "kakao" src | grep -i fetch` 로 확인.
- `frame-ancestors 'none'` 과 `X-Frame-Options: DENY` 중복은 무방.

4-2. 배포
```bash
npx wrangler whoami            # 교회 계정
npm run deploy                 # 단계 1 Worker + 헤더 변경 포함
```

4-3. 검증
```bash
curl -sI https://www.hanmaumch.id/ | grep -iE '^(content-security-policy|strict-transport|x-frame|x-content)'
curl -s -o /dev/null -w '%{http_code}\n' https://www.hanmaumch.id/zzz-not-exist      # 404
curl -s -o /dev/null -w '%{http_code}\n' https://www.hanmaumch.id/worship/sunday-sermon # 200
curl -s https://www.hanmaumch.id/sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>//' | shuf -n 8 | while read u; do echo "$(curl -s -o /dev/null -w '%{http_code}' "$u") $u"; done
```
- 🧑 브라우저 확인: 홈, 설교 상세, 로그인(카카오 버튼 클릭까지), 사진첩(로그인 후), 관리자 업로드 화면에서 **콘솔에 `Refused to ...` CSP 오류 0건**. 1건이라도 있으면 해당 출처를 `_headers` 에 추가 후 재배포.
- 커밋: `chore: enforce CSP and enable HSTS`

---

### 단계 5. Supabase 주간 자동접속 + 도메인 갱신 리마인더

5-1. 자동접속 Worker (교회 Cloudflare 계정, 무료 Cron Triggers)
디렉터리 `keepalive-worker/` 생성:

`keepalive-worker/wrangler.toml`
```toml
name = "hmc-keepalive"
main = "index.js"
compatibility_date = "2025-01-01"
[triggers]
crons = ["0 3 * * 1"]   # 매주 월요일 03:00 UTC (자카르타 10:00)
```

`keepalive-worker/index.js`
```js
// Supabase Free 플랜은 일정 기간 요청이 없으면 프로젝트를 일시정지한다.
// 매주 한 번 가벼운 읽기 요청을 보내 활동을 유지한다. anon 키만 쓴다(RLS 적용).
export default {
  async scheduled(_event, env) {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/staff?select=id&limit=1`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    })
    if (!r.ok) throw new Error(`keepalive failed: ${r.status}`)   // 실패를 로그에 남긴다
  },
  // 수동 확인용. 브라우저로 열면 같은 요청을 1회 보낸다.
  async fetch(_req, env) {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/staff?select=id&limit=1`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    })
    return new Response(`supabase ${r.status}`, { status: r.ok ? 200 : 502 })
  },
}
```
- `staff` 테이블은 anon 에게 select 가 열려 있다(마이그레이션 t12). 다른 테이블로 바꾸지 않는다.

배포:
```bash
cd keepalive-worker
npx wrangler whoami                                  # 교회 계정
npx wrangler secret put SUPABASE_URL                 # 프롬프트에 .env 의 VITE_SUPABASE_URL 값 입력(🧑 또는 Claude 가 .env 에서 읽어 파이프: 출력하지 말 것)
npx wrangler secret put SUPABASE_ANON_KEY            # VITE_SUPABASE_ANON_KEY
npx wrangler deploy
curl -s https://hmc-keepalive.<교회계정 서브도메인>.workers.dev/   # "supabase 200"
cd ..
```
- 값을 파이프로 넣을 때: `grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | npx wrangler secret put SUPABASE_URL` 처럼 **화면에 찍지 않는다.**
- Cloudflare 대시보드 → Workers → hmc-keepalive → Settings → Triggers 에서 cron 이 보이는지 🧑 확인. 다음 월요일 이후 Logs 에서 실행 기록 확인(보고표에 날짜 기재).
- 커밋: `feat: weekly Supabase keepalive worker`

5-2. 🧑 도메인 갱신 리마인더 (Google Calendar, 사용자)
- Rumahweb 자동갱신은 예치금(Client Deposit) 방식이라 꺼둔 상태. 만료 **2028-08-23**.
- 캘린더(교회 계정 hmcjktsu@gmail.com 추천) 에 아래 3건 등록, 참석자에 서종환·목사님:
  1. 2028-06-15 "hanmaumch.id 도메인 갱신 (만료 8/23) — Rumahweb clientzone 로그인(OTP) → Perpanjang Domain, 약 Rp 243,000"
  2. 2028-07-15 같은 내용 (2차)
  3. 2028-08-10 같은 내용 (최종)
- 2026-10-15 "Supabase 옛 Redirect URL(workers.dev) 삭제" 는 이미 등록돼 있음(v1 보고표). 확인만.
- Claude 는 캘린더에 접근하지 않는다. 사용자가 "등록했다"고 하면 보고표에 기록.

---

### 단계 6. 비밀번호 파일 → 비밀번호 관리자

6-1. 대상 파일 (내용을 열어보지 말고 **존재만** 확인)
```bash
ls -la ~/.aside/u/0/sessions/2026-09-28_VsPYqtT4tpV5R59a/tmp/ | grep -E 'rumahweb_account|cloudflare_account|otp_latest|epp_note|payment_receipt'
```
| 파일 | 내용(사용자에게 안내용) | 옮길 항목 |
| --- | --- | --- |
| `rumahweb_account_hmcjktsu.txt` | Rumahweb 교회 계정 | 로그인: hmcjktsu@gmail.com / 비밀번호 / URL new.clientzone.rumahweb.com / 메모: OTP 는 Gmail 로 옴 |
| `cloudflare_account_hmcjktsu.txt` | Cloudflare 교회 계정 | 로그인: hmcjktsu@gmail.com / 비밀번호 / dash.cloudflare.com |
| `rumahweb_account.txt` | 폐기한 Jkhanmaum 계정 | 저장 불필요, 삭제만 |
| `epp_note.txt` | 이전에 쓴 EPP 코드 | 이전 완료로 무효, 삭제만 |
| `otp_latest.txt` | 만료된 OTP | 삭제만 |
| `payment_receipt_5647703.txt` | 결제 영수증 메모 | 비밀 아님. 원하면 `docs/` 로 옮기거나 삭제 |

6-2. 🧑 사용자 작업
1. 비밀번호 관리자(1Password/Bitwarden/Apple 암호 등)에 위 두 계정을 새 항목으로 저장. 파일은 `cat` 으로 직접 열어 복사(Claude 에게 읽어 달라고 하지 않는다).
2. 같은 김에 **Supabase(hmcjktsu)**, **카카오(hmcjktsu)**, **Gmail(hmcjktsu)** 항목도 같은 금고에 두고, 2단계 인증 복구코드를 함께 보관.
3. 채팅에 노출됐던 `Jkhanmaum@gmail.com` 비밀번호는 변경(계정을 계속 쓸 경우).
4. 저장 확인 후 Claude 에게 "삭제 진행" 이라고 알림.

6-3. 삭제 (사용자 확인 후)
```bash
cd ~/.aside/u/0/sessions/2026-09-28_VsPYqtT4tpV5R59a/tmp/
rm -P rumahweb_account_hmcjktsu.txt cloudflare_account_hmcjktsu.txt rumahweb_account.txt epp_note.txt otp_latest.txt 2>/dev/null || rm -f rumahweb_account_hmcjktsu.txt cloudflare_account_hmcjktsu.txt rumahweb_account.txt epp_note.txt otp_latest.txt
ls | grep -E 'rumahweb_account|cloudflare_account|otp_latest|epp_note' || echo "deleted"
```
- 저장소 안에도 비밀값이 없는지: `git grep -nE "Hmc!|Jkt#|Cf#" -- . ':!node_modules'` 결과 0건 확인.

---

## 3. 롤백
| 상황 | 조치 |
| --- | --- |
| 단계 1 배포 후 정상 페이지가 404 | `wrangler.toml` 에서 `main`·`run_worker_first` 제거(v1 상태) 후 `npm run deploy`. 원인은 `EXACT/DYNAMIC` 누락 → 수정 후 재배포 |
| CSP 강제 후 화면 깨짐 | `_headers` 를 `Content-Security-Policy-Report-Only` 로 되돌려 배포, 콘솔 로그로 출처 보강 후 재전환 |
| HSTS 후 서브도메인 접속 불가 | `includeSubDomains` 제거 후 배포 + Cloudflare HSTS 의 Apply to subdomains Off. 브라우저 캐시는 max-age 동안 남으므로 그래서 preload 를 넣지 않은 것 |
| 메일 중단 후 필요해짐 | Cloudflare 에 Google MX 7개·SPF include 복원(값은 v1 문서·`hanmaumch.id_DNS_records.md` 에 있음). 단 Workspace 자체가 해지돼 있으면 재가입 필요 |
| keepalive 실패 로그 | Worker Logs 의 상태코드 확인. 401 이면 secret 재입력, 404 면 `staff` 테이블 권한 확인 |

---

## 4. 순서와 의존 관계
1. 단계 0 → 단계 1(코드, 미배포) → 단계 4-1(헤더 점검) → **단계 3-1 값 결정** → 단계 4-2 배포 → 단계 4-3·3-3 검증
2. 단계 2 는 🧑 게이트 통과 후 아무 때나 (HSTS `includeSubDomains` 는 2 완료 후 추가)
3. 단계 5·6 은 독립. 5-1 은 Claude, 5-2·6-2 는 사용자

---

## 5. 보류·범위 밖 (보고만)
- Google Workspace 해지(관리자 계정 미확인)
- 카카오 앱 교회 계정 일원화(전화 인증), GitHub 저장소 이전
- 옛 workers.dev 리다이렉트 Worker 와 Supabase 옛 Redirect URL 정리(2026-10-15 이후)

---

## 6. 작업 보고 (Claude 가 채움)
| 단계 | 상태 | 일시 | 결과·특이사항 |
| --- | --- | --- | --- |
| 0 준비 | 완료 | 2026-10-08 | 브랜치 `chore/post-cutover` 생성(main a7bef24 기준). wrangler 교회 계정 확인. 착수 전 실서비스: CSP Report-Only, HSTS 없음, `/zzz-not-exist` 200. node_modules/.bin 이 비어 있어 `npm ci` 로 복구 |
| 1 404 Worker | 완료·배포 | 2026-10-08 | `src/worker.ts` + `worker.test.ts`(ROUTE_PATHS 와 대조, 18 테스트 통과), `wrangler.toml` main/binding/run_worker_first. 로컬 wrangler dev: 없는 경로 404, sitemap 314개 전부 200. 실서비스 검증: `/zzz-not-exist` 404, `/worship/sunday-sermon/abc` 404, 옛 `/admin/news` 200. 커밋 813c2c7 |
| 2 메일 중단 (게이트 답변 포함) | 게이트 통과, 🧑 DNS 변경 대기 | 2026-10-08 | 2-1 답변: 사용자 없음 / 반송 가능 / Workspace 해지 범위 밖 인지. 2-2 레코드 목록 안내 |
| 3 HSTS | 코드 배포 완료, Cloudflare 설정 완료(사용자) | 2026-10-08 | `strict-transport-security: max-age=86400` 송출. 3-2 완료 후 http → 301 https 확인. includeSubDomains·1년은 2단계 DNS 변경 뒤 |
| 4 CSP 강제·배포 | 완료·배포 (재검증 대기) | 2026-10-08 | 강제 후 설교 상세에서 오류 2건: (1) index.html 글꼴 링크의 인라인 onload 차단 → 글꼴 미적용. 일반 링크로 교체 (2) Cloudflare Web Analytics 비콘 → script-src·connect-src 에 cloudflareinsights 추가. 커밋 383ab4b, 버전 8a673a4e. 🧑 콘솔 재확인 대기 |
| 5-1 keepalive | 완료 | 2026-10-08 | `hmc-keepalive` 교회 계정 배포, cron `0 3 * * 1`, secret 2개 등록(파이프, 미출력). 수동 실행 `supabase 200`. 커밋 3c01536. 첫 cron 실행 2026-10-12(월) 이후 Logs 확인 |
| 5-2 갱신 리마인더 | 완료 | 2026-10-08 | hunga.seo 캘린더에 2028-06-15·07-15·08-10 10:00 3건 등록(절차·금액 기재, 하루 전 메일 알림). 교회 계정 캘린더 공유는 사용자 몫 |
| 6 비밀번호 파일 | 🧑 비밀번호 변경 완료 보고, 삭제 확인 대기 | 2026-10-08 | 6-1 존재 확인(내용 미열람): rumahweb_account_hmcjktsu, cloudflare_account_hmcjktsu, rumahweb_account, epp_note, otp_latest, payment_receipt_5647703. 저장소 내 비밀값 grep 0건. 사용자 '삭제 진행' 대기 |
