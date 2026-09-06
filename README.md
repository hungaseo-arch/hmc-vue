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
| `VITE_SITE_URL` | 배포 주소. 지금은 `https://hmc.hunga-seo.workers.dev`. canonical·OG·sitemap 에 쓰이며 빌드에 필수 |

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run lint` / `lint:fix` | ESLint (vue + a11y 규칙 포함) |
| `npm run build` | 타입 검사 → 린트 → Vite 빌드 → `dist/sitemap.xml`·`robots.txt` 생성 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run deploy` | 빌드 후 `wrangler deploy` |

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

### 도메인 이전(www.hanmaumch.id)이 확정되면

1. `.env`(및 배포 환경)의 `VITE_SITE_URL` 을 새 주소로 바꾼다.
2. `src/lib/seo.ts`·`scripts/gen-sitemap.mjs` 의 기본값도 새 주소로 바꾼다.
3. Supabase Auth 의 Site URL·Redirect URLs, 카카오 Redirect URI 를 새 주소로 바꾼다.
4. `wrangler.toml` 의 `[[routes]]` 주석을 풀고 배포한다. apex → www 리다이렉트는 Cloudflare 규칙으로 잡는다.
5. 옛 주소(workers.dev)에서 새 주소로 301 리다이렉트를 걸어 검색 순위를 넘긴다.
- [ ] `public/_headers` 의 CSP 는 Report-Only 다. 콘솔에 위반이 없으면 `Content-Security-Policy` 로 바꿔 강제한다.
