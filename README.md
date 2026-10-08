# 자카르타 한마음교회 홈페이지

Vue 3 + Vite + Tailwind v4 로 만든 SPA. 데이터는 Supabase, 배포는 Cloudflare Workers(Static Assets).

## 시작하기

```sh
nvm use            # .nvmrc = Node 22
npm install
cp .env.example .env   # 값을 채운다
npm run dev
```

| 환경 변수 | 용도 |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable 키. **service_role 키는 절대 넣지 않는다** |
| `VITE_SITE_URL` | 배포 주소 `https://www.hanmaumch.id`. canonical·OG·sitemap 에 쓰이며 빌드에 필수. `npm run deploy` 는 이 값을 강제로 넣는다 |

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run lint` / `lint:fix` | ESLint (vue + a11y 규칙 포함) |
| `npm run build` | 타입 검사 → 린트 → Vite 빌드 → `dist/sitemap.xml`·`robots.txt` 생성 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run deploy` | `VITE_SITE_URL=https://www.hanmaumch.id` 로 빌드 후 `wrangler deploy` (교회 Cloudflare 계정, 커스텀 도메인 www.hanmaumch.id). 배포 전 `npx wrangler whoami` 로 계정 확인 |

sitemap 생성은 Supabase 에서 설교·칼럼 id 를 읽는다. 네트워크가 안 되면 정적 경로만 넣고 종료 코드 1 을 남긴다(`node scripts/gen-sitemap.mjs --allow-partial` 로 무시 가능).

## 구조

```
src/
  pages/        라우트별 화면 (admin/ 은 관리자 전용)
  components/   공용 컴포넌트, layout/
  composables/  useAuth, useIdleLogout, useEscapeToClose …
  lib/          supabase 클라이언트, seo, csv, 날짜(jakarta) 유틸
  router/       경로 상수(ROUTE_PATHS)와 접근 가드
  data/         정적 콘텐츠(교회 소개, 연혁 등)
public/
  _headers      Cloudflare 캐시·보안 헤더
  bible/        성경 본문 JSON
supabase/migrations/   DB 스키마·RLS·RPC (번호순으로 적용)
scripts/        gen-sitemap.mjs, legacy-scraper/(구 사이트 이전 기록)
docs/history/   이전 작업 문서
```

## 인증·권한

- 로그인: 이메일/비밀번호, 카카오 OAuth (Supabase Auth).
- 가입 직후 `member_status = pending`. 관리자가 승인해야 `active` 가 된다.
- 등급(`access_level`): 0 방문자 · 1 교인 · 2 관리자. `current_access_level()` 은 `active` 인 경우에만 등급을 돌려준다.
- 교역자 연락처 등 민감 정보는 `staff` 테이블 + RLS(level ≥ 1) 로만 노출한다. 클라이언트 번들에 하드코딩하지 않는다.
- 관리 작업은 모두 SECURITY DEFINER RPC 로 처리하며, 함수 안에서 다시 등급을 확인한다.

## DB 변경

1. `supabase/migrations/YYYYMMDDHHMMSS_설명.sql` 을 추가한다.
2. Supabase 대시보드 SQL 편집기나 CLI(`supabase db push`)로 적용한다.
3. 적용 후 대시보드 Advisors(보안·성능)를 한 번 확인한다.

## 배포 체크리스트

- [ ] 배포 환경(Cloudflare 빌드 설정 또는 로컬 `.env`)에 `VITE_SITE_URL` 이 배포 주소와 같다.
- [ ] Supabase → Authentication → URL Configuration 의 Site URL·Redirect URLs 가 배포 주소와 같다.
- [ ] 카카오 개발자 콘솔 Redirect URI 에 Supabase 콜백 주소가 등록돼 있다.

### 도메인 전환(www.hanmaumch.id) — 2026-10-08 완료

도메인은 2026-10-02 Rumahweb(등록기관 PT Digital Registra Indonesia)으로 이전, 2026-10-08 네임서버를 교회 Cloudflare 계정(hmcjktsu@gmail.com)의 `brodie`/`demi.ns.cloudflare.com` 으로 전환했다. 상세 기록은 `claude_작업지시서_도메인전환_v1.md` 8절.

현재 구성:
- `www.hanmaumch.id` — 이 저장소의 Worker `hmc`(교회 계정, `wrangler.toml` 의 custom_domain). 인증서 자동.
- `hanmaumch.id`(apex) — Cloudflare Redirect Rule 로 `www` 에 301(경로·쿼리 유지). apex 에는 프록시된 더미 A `192.0.2.1` 이 있어야 규칙이 탄다.
- `hmc.hunga-seo.workers.dev`(옛 임시 주소) — 개인 계정의 `redirect-worker/` 가 `www` 같은 경로로 301. 구 해시 주소(`/#/경로`)도 브라우저가 해시를 유지하므로 라우터가 실경로로 바꾼다.
- 도메인 메일 미사용(2026-10-08). Google MX·CNAME 을 지우고 Null MX(`0 .`)·`v=spf1 -all`·DMARC `p=reject` 를 두었다. 메일이 다시 필요하면 `claude_작업지시서_전환후정리_v2.md` 3절 롤백 참고.
- Supabase Auth Site URL `https://www.hanmaumch.id`, Redirect URLs `https://www.hanmaumch.id/**`. 옛 `https://hmc.hunga-seo.workers.dev/**` 는 1주 관찰 후 삭제.
- 카카오 Web 플랫폼 도메인에 새 주소 추가됨. Redirect URI 는 Supabase 콜백이라 그대로.

주의: 2026-10-31 교회사랑넷 해지 이후 구 네임서버로 되돌리는 롤백은 불가능하다.

- [ ] `public/_headers` 의 CSP 는 Report-Only 다. 콘솔에 위반이 없으면 `Content-Security-Policy` 로 바꿔 강제한다.
