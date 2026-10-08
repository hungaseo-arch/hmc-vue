# 작업지시서 — 임시사이트 → 목표 도메인 전환 (hmc.hunga-seo.workers.dev → www.hanmaumch.id)

- 문서번호: HMC-WEB-2026-1008-01
- 작성일: 2026-10-08
- 대상: VSCode Claude Code (저장소 `/Users/seojonghwan/dev/hmc`)
- 발주: SEO Jonghwan / 서종환
- 버전: v1
- 선행 문서: `claude_작업지시서_hmc_웹사이트개선_v1.md`, `README.md` "도메인 전환" 절

---

## 0. 목적과 범위

### 0.1 목적
현재 임시 주소에서 운영 중인 교회 홈페이지를 목표 도메인으로 옮긴다.

| 구분 | 주소 |
| --- | --- |
| 임시사이트(현재) | `https://hmc.hunga-seo.workers.dev/#/` (구 해시 주소 포함) |
| 목표 도메인 | `https://www.hanmaumch.id/` |
| apex | `https://hanmaumch.id/` → `https://www.hanmaumch.id/` 로 301 |

### 0.2 완료 기준 (Definition of Done)
1. `https://www.hanmaumch.id/` 에서 새 사이트가 HTTPS 로 열린다.
2. `https://hanmaumch.id/...` 는 경로·쿼리를 유지한 채 `https://www.hanmaumch.id/...` 로 301 된다.
3. 임시사이트 주소(해시 주소 `/#/경로` 포함)로 들어와도 같은 경로의 새 도메인 페이지로 이동한다.
4. canonical·og:url·sitemap·robots 가 모두 `https://www.hanmaumch.id` 를 가리킨다.
5. 카카오 로그인 → 승인 대기 → 승인 후 교인 전용 페이지(교회소식·사진첩·주보) 열람이 새 도메인에서 동작한다.
6. 교회 메일(`@hanmaumch.id`, Google) 수신·발송이 전환 전후로 끊기지 않는다.
7. 변경 내역이 별도 브랜치에 커밋되고, 이 문서 8절 "작업 보고"가 채워진다.

### 0.3 범위 밖
- 디자인·기능 개선(선행 작업지시서 소관)
- 새 카카오 앱 생성(전화 인증 문제로 보류. 기존 카카오 앱 유지)
- Supabase 프로젝트 이전·재생성(이미 교회 조직으로 이전 완료. 프로젝트 URL·키 불변)

---

## 1. 현재 상태 (2026-10-08 기준, 착수 전 재확인 필수)

### 1.1 도메인·DNS
- 등록기관: Rumahweb (레지스트리상 PT Digital Registra Indonesia). 2026-10-02 이전 완료, 만료 2028-08-23
- Rumahweb 계정: `hmcjktsu@gmail.com` (로그인 시 이메일 OTP)
- **현재 네임서버: `ns1.church-love.com` / `ns2.church-love.com`** (구 교회사랑넷. 10/31 해지 예정 → 그 전에 반드시 전환)
- 교회 Cloudflare 계정: `hmcjktsu@gmail.com`, 존 `hanmaumch.id` 생성됨(Free, **Pending**)
- 배정 네임서버: **`brodie.ns.cloudflare.com` / `demi.ns.cloudflare.com`**
- Cloudflare 존에 자동 스캔으로 들어간 레코드:

| 유형 | 이름 | 값 | 조치 |
| --- | --- | --- | --- |
| A | `@` | 211.169.73.17 | **삭제** (구 서버) |
| A | `*` | 211.169.73.17 | **삭제** |
| A | `www` | 211.169.73.17 | **삭제** (custom domain 과 충돌) |
| CNAME | calendar / docs / mail / sites | ghs.google.com | 유지, **프록시 끄기(DNS only)** |
| MX | @ (7개) | ASPMX.L.GOOGLE.COM 등 | 유지 (교회 메일) |
| TXT | @ | `v=spf1 mx ip4:211.169.73.15 ~all` | `v=spf1 include:_spf.google.com ~all` 로 교체 권장 |

### 1.2 코드 (이미 반영됨, 미커밋)
- `wrangler.cutover.toml` 신규: `[[routes]] pattern = "www.hanmaumch.id"`, `custom_domain = true`
- `package.json`: `"deploy:prod": "VITE_SITE_URL=https://www.hanmaumch.id npm run build && wrangler deploy -c wrangler.cutover.toml"`
- `src/lib/seo.ts`, `scripts/gen-sitemap.mjs`: 기본 SITE_URL → `https://www.hanmaumch.id`
- `.env.example`, `vite.config.ts`, `README.md`: 새 도메인 기준으로 갱신
- 검증 결과: `VITE_SITE_URL=https://www.hanmaumch.id npm run build` 성공(타입·린트·테스트 15건 통과), sitemap 315개 URL, `wrangler deploy -c wrangler.cutover.toml --dry-run` 정상
- **기존 `wrangler.toml` 과 `.env` 는 손대지 않음** (임시사이트 배포 유지용)

### 1.3 라우팅
- `src/router/index.ts` 상단에서 `#/경로` 해시 주소를 실제 경로로 `history.replaceState` 처리한다. → 브라우저는 리다이렉트 시 `#` 조각을 유지하므로, 서버 301 만 걸면 구 해시 링크도 새 도메인의 같은 페이지로 이어진다.

### 1.4 백엔드
- Supabase 프로젝트 ref: `marsnvwgqwjakvogzhbk` (교회 조직 소유)
- 카카오 로그인: Supabase Auth 경유, `redirectTo: window.location.origin + '/'`
- 카카오 Redirect URI = Supabase 콜백 `https://marsnvwgqwjakvogzhbk.supabase.co/auth/v1/callback` → **변경 불필요**
- CSP(`public/_headers`, Report-Only): `connect-src https://*.supabase.co` → 변경 불필요

---

## 2. 절대 준수 사항 (위반 시 즉시 중단 후 보고)
1. **비밀값 출력 금지**: `.env` 의 키, Supabase service_role, Cloudflare API 토큰, 비밀번호를 터미널·로그·커밋·이 문서에 남기지 않는다. 값 확인이 필요하면 `sed -E 's/=.*/=<redacted>/'` 처럼 가린다.
2. **service_role 키를 저장소·클라이언트에 두지 않는다.**
3. **`.env` 는 커밋하지 않는다.** `.gitignore` 확인.
4. **사람 확인 체크포인트(🧑)에서는 멈추고 사용자 확인을 받는다.** 대시보드 로그인·결제·네임서버 변경은 사람이 한다.
5. **`npm run deploy:prod` 는 3단계 체크포인트 통과 전 실행 금지.** 존이 Active 가 아니면 custom domain 생성이 실패하거나 잘못된 계정에 배포된다.
6. **wrangler 계정 확인**: `npx wrangler whoami` 결과가 교회 계정(`hmcjktsu@gmail.com`)이 아니면 배포 금지.
7. 메일 관련 레코드(MX, google CNAME)는 삭제하지 않는다.
8. 같은 명령이 결과 변화 없이 3회 실패하면 중단하고 원인·로그 요약을 보고한다.

---

## 3. 작업 단계

### 단계 0. 사전 점검
```bash
cd /Users/seojonghwan/dev/hmc
git --version            # xcrun 오류 시: 사용자에게 `xcode-select --install` 요청 후 대기
git status
node -v                  # >= 22
npm ci                   # 필요 시
npx wrangler whoami      # 현재 로그인 계정 확인 (출력에서 이메일만 확인)
```
- 1.2 의 변경이 작업 트리에 있는지 확인: `git diff --stat`
- 브랜치 생성 후 커밋:
```bash
git switch -c chore/domain-cutover
git add wrangler.cutover.toml package.json src/lib/seo.ts scripts/gen-sitemap.mjs .env.example vite.config.ts README.md claude_작업지시서_도메인전환_v1.md
git commit -m "chore: prepare cutover to www.hanmaumch.id (cutover wrangler config, deploy:prod, SITE_URL defaults)"
```
- 검증: `VITE_SITE_URL=https://www.hanmaumch.id npm run build` 통과, `grep -o 'canonical[^>]*' dist/index.html` 가 새 도메인인지 확인.

### 단계 1. 🧑 Cloudflare DNS 정리 (사람 작업, Claude 는 안내·검증)
사용자가 Cloudflare 대시보드(교회 계정) → `hanmaumch.id` → DNS 에서:
1. A 레코드 `@`, `*`, `www` (211.169.73.17) 삭제
2. CNAME `calendar`/`docs`/`mail`/`sites` → Proxy status **DNS only**
3. MX 7개·SPF 유지 (SPF 는 Google 기준으로 교체 권장)
4. apex 리다이렉트용 더미 레코드 추가: A `@` → `192.0.2.1`, **Proxied**

Claude 검증(네임서버 전환 전이라 Cloudflare 직접 조회):
```bash
dig +short @brodie.ns.cloudflare.com hanmaumch.id MX
dig +short @brodie.ns.cloudflare.com www.hanmaumch.id A      # 비어 있어야 정상(아직 custom domain 전)
dig +short @brodie.ns.cloudflare.com mail.hanmaumch.id CNAME # ghs.google.com.
```

### 단계 2. 🧑 네임서버 전환 (사람 작업)
- 시점: 사용자가 정한 전환일. **이 순간부터 구 교회사랑넷 홈페이지는 보이지 않는다.** 3단계 배포를 바로 이어서 할 수 있는 시간에 한다.
- Rumahweb Client Zone(`hmcjktsu@gmail.com`, OTP) → Domain → hanmaumch.id → Pengaturan → Nameserver
  - `brodie.ns.cloudflare.com`, `demi.ns.cloudflare.com` 로 교체, 기존 church-love 삭제
- Cloudflare 대시보드에서 "Check nameservers" 클릭

Claude 검증 (전파 확인, 수 분~수 시간):
```bash
dig +short NS hanmaumch.id @1.1.1.1
dig +short NS hanmaumch.id @8.8.8.8
curl -s "https://rdap.pandi.id/rdap/domain/hanmaumch.id" | grep -o '"ldhName":"[^"]*ns[^"]*"'
```
- 두 결과 모두 `brodie/demi.ns.cloudflare.com` 이고, Cloudflare 존 상태가 **Active** 가 되면 다음 단계.
- 🧑 체크포인트: 사용자에게 "존 Active 확인됨" 보고 후 진행 승인 받기.

### 단계 3. 배포 (Claude)
```bash
npx wrangler logout
npx wrangler login               # 🧑 브라우저 창에서 교회 계정(hmcjktsu@gmail.com)으로 승인
npx wrangler whoami              # 교회 계정인지 확인. 아니면 중단
npm run deploy:prod
```
- 성공 시 Cloudflare 가 `www.hanmaumch.id` 레코드와 인증서를 자동 생성한다(수 분 소요 가능).
- 실패 시: 에러 메시지를 그대로 보고. 흔한 원인 = www 레코드 잔존(단계 1-1), 존 미활성(단계 2), 다른 계정 로그인.

검증:
```bash
curl -sI https://www.hanmaumch.id/ | head -5                       # 200
curl -s https://www.hanmaumch.id/ | grep -o 'canonical[^>]*'       # 새 도메인
curl -s https://www.hanmaumch.id/robots.txt | tail -2
curl -s https://www.hanmaumch.id/sitemap.xml | grep -c '<loc>'     # 약 315
curl -sI https://www.hanmaumch.id/worship/sunday-sermon | head -1  # 200 (SPA)
```

### 단계 4. 🧑 apex → www 301 (사람 작업, Claude 안내)
Cloudflare → hanmaumch.id → Rules → Redirect Rules → Create:
- 조건: Hostname equals `hanmaumch.id`
- 동작: Dynamic, 표현식 `concat("https://www.hanmaumch.id", http.request.uri.path)`, 301, **Preserve query string** 체크

검증:
```bash
curl -sI https://hanmaumch.id/worship/sunday-sermon?x=1 | grep -iE '^(HTTP|location)'
# 301, location: https://www.hanmaumch.id/worship/sunday-sermon?x=1
```

### 단계 5. 🧑 Supabase Auth·카카오 설정 (사람 작업, Claude 안내)
1. Supabase 대시보드(교회 조직) → 프로젝트 `marsnvwgqwjakvogzhbk` → Authentication → URL Configuration
   - Site URL: `https://www.hanmaumch.id`
   - Redirect URLs 추가: `https://www.hanmaumch.id/**`
   - 기존 `https://hmc.hunga-seo.workers.dev/**` 는 6단계 완료·1주 관찰 후 삭제
2. 카카오 개발자 콘솔(기존 앱 소유자 계정) → 앱 → 플랫폼 → Web → 사이트 도메인에 `https://www.hanmaumch.id` 추가
   - Redirect URI 는 Supabase 콜백이므로 **변경 없음**

### 단계 6. 임시사이트 → 새 도메인 301 (Claude)
임시사이트 Worker(`hmc.hunga-seo.workers.dev`)는 **개인 Cloudflare 계정**에 있다. 그 계정에서 같은 이름 `hmc` Worker 를 리다이렉트 전용으로 교체한다.

1. 저장소에 리다이렉트 Worker 추가: `redirect-worker/index.js`
```js
// 임시 주소(hmc.hunga-seo.workers.dev)로 들어온 요청을 새 도메인 같은 경로로 301.
// 해시(#/경로)는 브라우저가 리다이렉트 뒤에도 유지하고, 새 사이트 라우터가 실경로로 바꾼다.
export default {
  fetch(request) {
    const url = new URL(request.url)
    return Response.redirect(`https://www.hanmaumch.id${url.pathname}${url.search}`, 301)
  },
}
```
2. `redirect-worker/wrangler.toml`
```toml
name = "hmc"
main = "index.js"
compatibility_date = "2025-01-01"
workers_dev = true
```
3. 🧑 개인 계정으로 로그인 후 배포:
```bash
npx wrangler logout && npx wrangler login     # 개인 계정(hunga)
npx wrangler whoami
cd redirect-worker && npx wrangler deploy
```
4. 끝나면 `npx wrangler logout` 후 다시 교회 계정으로 로그인해 둔다(이후 배포 사고 방지).

검증:
```bash
curl -sI https://hmc.hunga-seo.workers.dev/introduction/staff | grep -iE '^(HTTP|location)'
# 301 → https://www.hanmaumch.id/introduction/staff
```
- 브라우저로 `https://hmc.hunga-seo.workers.dev/#/worship/sunday-sermon` 접속 → `https://www.hanmaumch.id/worship/sunday-sermon` 이 되는지 확인.

### 단계 7. 기본 배포 설정 정리 (Claude)
전환이 끝나 임시 주소 배포가 더 필요 없으므로 사고를 막는다.
- `wrangler.toml` 을 `wrangler.cutover.toml` 내용으로 교체(routes 포함)하고 `wrangler.cutover.toml` 삭제
- `package.json` 의 `deploy` 를 `VITE_SITE_URL=https://www.hanmaumch.id npm run build && wrangler deploy` 로 바꾸고 `deploy:prod` 삭제
- 로컬 `.env` 의 `VITE_SITE_URL` 을 `https://www.hanmaumch.id` 로 변경 (커밋 안 함)
- README "도메인 전환" 절을 "완료" 기록으로 갱신
- 커밋: `chore: finalize domain cutover to www.hanmaumch.id`

### 단계 8. 전환 후 점검 (Claude + 🧑)
| # | 항목 | 방법 | 담당 |
| --- | --- | --- | --- |
| 1 | 홈·소개·예배·교육 페이지 열림 | curl 200 + 브라우저 확인 | Claude |
| 2 | 설교·칼럼 상세 직접 URL | sitemap 에서 무작위 5개 curl | Claude |
| 3 | apex·임시사이트 301 | 단계 4·6 검증 명령 | Claude |
| 4 | HTTPS 인증서 | `curl -vI https://www.hanmaumch.id 2>&1 | grep -i 'subject\|issuer'` | Claude |
| 5 | 카카오 로그인 → 승인 대기 | 실제 로그인 | 🧑 |
| 6 | 관리자 승인 → 교인 전용 페이지·사진 서명 URL | 관리자 계정 | 🧑 |
| 7 | 관리자 업로드(주보·사진) | 1건 업로드 후 삭제 | 🧑 |
| 8 | 교회 메일 수신·발송 | 외부 주소와 왕복 | 🧑 |
| 9 | CSP 위반 | 브라우저 콘솔 Report-Only 경고 확인 | 🧑/Claude |
| 10 | Google Search Console | 새 도메인 등록, sitemap 제출 | 🧑 |

---

## 4. 롤백
| 상황 | 조치 |
| --- | --- |
| 단계 3 배포 실패, 사이트 안 열림 | Cloudflare 존 DNS 에 임시로 `www` CNAME → `hmc.hunga-seo.workers.dev`(Proxied) 를 두지 말 것(교차 계정 불가). 대신 원인 수정 후 재배포. 급하면 🧑 Rumahweb 네임서버를 church-love 로 되돌림(10/31 전까지만 가능) |
| 카카오 로그인 실패 | 단계 5 의 Redirect URLs·카카오 Web 도메인 재확인. 임시사이트 리다이렉트(단계 6)는 로그인 확인 후에 진행 |
| 메일 수신 중단 | Cloudflare DNS 의 MX 7개·google CNAME 존재 확인, 누락분 즉시 추가 |
| 임시사이트 리다이렉트 오동작 | 개인 계정에서 `npm run deploy`(원래 사이트)로 되돌림 |

---

## 5. 일정 제약
- **2026-10-31 교회사랑넷 해지** → 구 네임서버·구 서버가 사라진다. 단계 2(네임서버 전환)는 **늦어도 10월 중순**에 끝낸다.
- 단계 2~3 은 같은 날 연속으로 한다(네임서버 전환 후 배포 전까지는 www 가 열리지 않음).

---

## 6. 참고 파일
- `README.md` — "도메인 전환" 7단계(본 문서와 동일 순서)
- `wrangler.cutover.toml`, `package.json` (`deploy:prod`)
- `src/router/index.ts` (해시 → 실경로 변환), `src/lib/seo.ts`, `scripts/gen-sitemap.mjs`
- `public/_headers` (CSP)
- 정리 문서(작업 세션 산출물): `hanmaumch.id_DNS_records.md`, `hmc_cutover_checklist.md`

---

## 7. 미해결·보류 사항 (작업 대상 아님, 보고만)
- 교회 메일 Google Workspace 슈퍼 관리자 계정 미확인 (교회사랑넷 운영 아님 확인됨, 교회 내부 가입 추정)
- 카카오 앱 교회 계정 일원화 보류 (전화 인증 불가)
- GitHub 저장소 `hungaseo-arch/hmc-vue` 의 교회 계정 이전 여부 미정
- Rumahweb 자동갱신 미적용(Client Deposit 결제수단 필요). 만료 2028-08-23

---

## 8. 작업 보고 (Claude 가 채움)
| 단계 | 상태 | 일시 | 결과·특이사항 |
| --- | --- | --- | --- |
| 0 사전 점검·커밋 | 완료 | 2026-10-08 | 브랜치 `chore/domain-cutover` 생성, d09d4ac 커밋. git 2.56·node 26. `VITE_SITE_URL=https://www.hanmaumch.id npm run build` 통과(타입·린트·vitest), canonical·og:url 새 도메인, sitemap 315 URL(workers.dev 0건). wrangler 는 토큰 만료로 미로그인 — 3단계에서 교회 계정으로 로그인 예정 |
| 1 DNS 정리 | 완료·검증 | 2026-10-08 | 사용자가 대시보드에서 A `@`·`*`·`www`(211.169.73.17) 삭제, google CNAME 4개 DNS only, MX 유지, apex 더미 A `@`→192.0.2.1 Proxied 추가. 존이 Pending 이라 Cloudflare NS 직접 조회는 빈 응답 — dig 검증은 2단계 네임서버 전환 후 재실행. 네임서버 전환 직후 brodie·demi 직접 조회로 검증: MX 7개 Google, mail·calendar CNAME ghs.google.com, www 비어 있음, apex A 192.0.2.1 — 모두 정상 |
| 2 네임서버 전환 | 완료·Active 확인 | 2026-10-08 | Rumahweb 에서 brodie/demi.ns.cloudflare.com 으로 변경, PANDI RDAP 반영. 10:12 1.1.1.1·8.8.8.8 모두 Cloudflare NS 로 전파. apex 가 Cloudflare 프록시 IP 로 응답하고 HTTPS 인증서 발급됨(server=cloudflare, 더미 원본이라 522 — 4단계 리다이렉트 전까지 정상). wrangler 교회 계정(aa50308c…) 로그인 확인 |
| 3 배포 | 완료 | 2026-10-08 | 교회 계정 확인 후 `npm run deploy:prod` 성공(버전 240f3a13). custom domain www.hanmaumch.id 자동 생성. 검증: 루트 200, canonical·og:url 새 도메인, robots Sitemap 새 도메인, sitemap 315 URL, SPA 딥링크 200, 인증서 Let's Encrypt(CN=hanmaumch.id, SAN 포함) |
| 4 apex 301 | 완료·검증 | 2026-10-08 | 사용자가 Rules → Overview → Redirect Rule 생성(새 대시보드엔 Redirect Rules 메뉴 없음). 검증: `hanmaumch.id/worship/sunday-sermon?x=1` → 301 `https://www.hanmaumch.id/worship/sunday-sermon?x=1`(경로·쿼리 유지), 루트·http 도 301 |
| 5 Supabase·카카오 | 완료(사용자 보고) | 2026-10-08 | Supabase Site URL·Redirect URLs 에 www.hanmaumch.id 추가, 카카오 Web 플랫폼 도메인 추가. 사용자가 www.hanmaumch.id 에서 카카오 로그인 성공 확인. 기존 workers.dev Redirect URL 은 1주 관찰 후 삭제 예정 |
| 6 임시사이트 301 | 완료·검증 | 2026-10-08 | 개인 계정(hunga) 로그인 확인 후 `redirect-worker` 배포(버전 f9993238, 기존 2026-05-13 버전 교체). 검증: workers.dev/introduction/staff → 301 www 같은 경로, 쿼리 유지. 해시 주소는 사용자 브라우저 확인 |
| 7 기본 설정 정리 | | | |
| 8 전환 후 점검 | | | |
