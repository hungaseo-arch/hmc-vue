import { createRouter, createWebHistory } from 'vue-router'
import { ROUTE_PATHS } from '@/lib/index'
import { setMeta } from '@/lib/seo'
import { init, ensureProfile, authSnapshot, logEvent } from '@/composables/useAuth'

// 예전 주소(#/worship/sunday-sermon)를 실주소로 옮긴다.
// 라우터가 location 을 읽기 전에 끝나야 하므로 createRouter 위에 둔다.
if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
  const target = window.location.hash.slice(1)
  window.history.replaceState(null, '', target)
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: ROUTE_PATHS.HOME, component: () => import('@/pages/home/HomePage.vue') },
    { path: ROUTE_PATHS.LOGIN, component: () => import('@/pages/LoginPage.vue'), meta: { title: '로그인', noindex: true } },
    { path: ROUTE_PATHS.SIGNUP, component: () => import('@/pages/SignUpPage.vue'), meta: { title: '회원가입', noindex: true } },
    // 내 정보는 승인 전에도 볼 수 있어야 한다. 승인 심사가 이름·연락처를
    // 보고 이뤄지므로, 대기 중인 사람이 오히려 고칠 일이 많다.
    { path: ROUTE_PATHS.PROFILE, component: () => import('@/pages/ProfilePage.vue'), meta: { requiresAuth: true, title: '내 정보', noindex: true } },
    { path: ROUTE_PATHS.PENDING, component: () => import('@/pages/PendingPage.vue'), meta: { requiresAuth: true, title: '승인 대기 중', noindex: true } },
    { path: ROUTE_PATHS.NO_ACCESS, component: () => import('@/pages/NoAccessPage.vue'), meta: { requiresAuth: true, title: '열람 권한 없음', noindex: true } },

    // 교회소개
    { path: ROUTE_PATHS.WELCOME, component: () => import('@/pages/introduction/WelcomePage.vue'), meta: { title: '처음 오신 분', description: '자카르타 한마음교회를 처음 찾으시는 분들을 위한 예배 시간, 오시는 길, 자주 묻는 질문 안내입니다.' } },
    { path: ROUTE_PATHS.GREETING, component: () => import('@/pages/introduction/GreetingPage.vue'), meta: { title: '인사말', description: '자카르타 한마음교회 담임목사 인사말입니다.' } },
    { path: ROUTE_PATHS.HISTORY, component: () => import('@/pages/introduction/HistoryPage.vue'), meta: { title: '연혁', description: '2002년 설립 이후 자카르타 한마음교회가 걸어온 길입니다.' } },
    { path: ROUTE_PATHS.STAFF, component: () => import('@/pages/introduction/StaffPage.vue'), meta: { title: '섬기는 사람들', description: '자카르타 한마음교회를 섬기는 목회자와 사역자를 소개합니다.' } },
    { path: ROUTE_PATHS.WORSHIP_GUIDE, component: () => import('@/pages/introduction/WorshipGuidePage.vue'), meta: { title: '예배안내', description: '주일예배·수요예배·새벽기도 등 자카르타 한마음교회 예배 시간 안내입니다.' } },
    { path: ROUTE_PATHS.DIRECTIONS, component: () => import('@/pages/introduction/DirectionsPage.vue'), meta: { title: '오시는 길', description: 'Darmawangsa Square The City Walk 1층 — 자카르타 한마음교회 위치와 연락처입니다.' } },

    // 예배와기도 — 설교·목회칼럼은 개인정보가 없어 전체 공개한다.
    { path: ROUTE_PATHS.SUNDAY_SERMON, component: () => import('@/pages/worship/SundaySermonPage.vue'), meta: { title: '주일설교', description: '자카르타 한마음교회 주일설교 말씀을 본문과 함께 볼 수 있습니다.' } },
    { path: ROUTE_PATHS.SUNDAY_SERMON_DETAIL, component: () => import('@/pages/detailPage/SundaySermonDetailPage.vue'), meta: { title: '주일설교' } },
    { path: ROUTE_PATHS.PASTORAL_COLUMN, component: () => import('@/pages/worship/PastoralColumnPage.vue'), meta: { title: '목회칼럼', description: '고목사의 짧은 단상 — 자카르타 한마음교회 목회칼럼입니다.' } },
    { path: ROUTE_PATHS.PASTORAL_COLUMN_DETAIL, component: () => import('@/pages/detailPage/PastoralColumnDetailPage.vue'), meta: { title: '목회칼럼' } },
    { path: ROUTE_PATHS.CHURCH_VIDEO, component: () => import('@/pages/worship/ChurchVideoPage.vue'), meta: { title: '교회영상', description: '자카르타 한마음교회 예배와 행사 영상입니다.' } },

    // 교육과양육
    { path: ROUTE_PATHS.J_ANGELS, component: () => import('@/pages/education/JAngelsPage.vue'), meta: { title: 'J-Angels 영유아·유치부', description: '자카르타 한마음교회 영유아·유치부 J-Angels 를 소개합니다.' } },
    { path: ROUTE_PATHS.J_KIDS, component: () => import('@/pages/education/JKidsPage.vue'), meta: { title: 'J-Kids 아동부', description: '자카르타 한마음교회 아동부 J-Kids 를 소개합니다.' } },
    { path: ROUTE_PATHS.JA_YU, component: () => import('@/pages/education/JaYuPage.vue'), meta: { title: 'Ja-Yu 중고등부', description: '자카르타 한마음교회 중고등부 자유교회를 소개합니다.' } },
    { path: ROUTE_PATHS.YOUTH, component: () => import('@/pages/education/YouthPage.vue'), meta: { title: '청년부', description: '자카르타 한마음교회 대학·직장 청년부를 소개합니다.' } },
    { path: ROUTE_PATHS.ADULT_EDU, component: () => import('@/pages/education/AdultEduPage.vue'), meta: { title: '성인교육', description: '자카르타 한마음교회 장년 양육 과정을 소개합니다.' } },

    // 소식과나눔 — 승인 교인(1등급) 전용. 색인에서 뺀다.
    { path: ROUTE_PATHS.CHURCH_NEWS, component: () => import('@/pages/admin/ChurchNewsPage.vue'), meta: { access: 1, title: '교회소식', noindex: true } },
    { path: ROUTE_PATHS.CHURCH_NEWS_DETAIL, component: () => import('@/pages/detailPage/ChurchNewsDetailPage.vue'), meta: { access: 1, title: '교회소식', noindex: true } },
    { path: ROUTE_PATHS.PHOTO_ALBUM, component: () => import('@/pages/admin/PhotoAlbumPage.vue'), meta: { access: 1, title: '사진앨범', noindex: true } },
    { path: ROUTE_PATHS.PHOTO_ALBUM_DETAIL, component: () => import('@/pages/detailPage/PhotoAlbumDetailPage.vue'), meta: { access: 1, title: '사진앨범', noindex: true } },
    { path: ROUTE_PATHS.BULLETIN, component: () => import('@/pages/admin/BulletinPage.vue'), meta: { access: 1, title: '주보', noindex: true } },
    { path: ROUTE_PATHS.BULLETIN_DETAIL, component: () => import('@/pages/detailPage/BulletinDetailPage.vue'), meta: { access: 1, title: '주보', noindex: true } },
    { path: ROUTE_PATHS.MISSION_NEWS, component: () => import('@/pages/admin/MissionNewsPage.vue'), meta: { title: '선교소식', description: '자카르타 한마음교회가 후원하는 선교지 소식입니다.' } },

    // 관리자(2등급) 전용. 아래 /admin/:rest 리디렉트보다 위에 둔다 — 정적
    // 구간이 매개변수보다 우선이라 순서와 무관하게 매칭되지만, 읽는 사람이
    // 헷갈리지 않게 앞에 놓는다.
    { path: ROUTE_PATHS.ADMIN_MEMBERS, component: () => import('@/pages/admin/MemberApprovalPage.vue'), meta: { access: 2, title: '회원 승인', noindex: true } },
    // noAudit: 접속 기록 화면 자체는 기록하지 않는다. 관리자가 목록을 훑을
    // 때마다 view_sensitive 가 쌓이면 기록이 자기 자신으로 가득 찬다.
    { path: ROUTE_PATHS.ADMIN_AUDIT_LOG, component: () => import('@/pages/admin/AuditLogPage.vue'), meta: { access: 2, noAudit: true, title: '접속 기록', noindex: true } },

    // 예전 /admin/* 주소를 /community/* 로 넘긴다. 회원들이 저장해 둔 링크와
    // 카톡 등에 뿌려진 주소가 깨지지 않게. 404 규칙보다 위에 있어야 한다.
    { path: '/admin/:rest(.*)', redirect: (to) => `/community/${to.params.rest}` },

    // 404
    { path: '/:pathMatch(.*)*', component: () => import('@/pages/NotFoundPage.vue'), meta: { title: '페이지를 찾을 수 없습니다', noindex: true } },
  ],
  scrollBehavior(to, _from, savedPosition) {
    // 뒤로/앞으로 가기는 보던 자리로 돌려준다.
    if (savedPosition) return savedPosition
    // 움직임 최소화를 켠 사용자에게는 부드러운 스크롤도 끈다.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = reduce ? 'auto' : 'smooth'
    if (to.hash) return { el: to.hash, behavior }
    return { top: 0, behavior }
  },
})

/*
  라우터 가드는 UI 편의일 뿐이다. 실제 접근 통제는 Supabase RLS 와
  비공개 버킷(서명 URL)이 담당한다. 여기를 통과해도 데이터는 오지 않는다.

  meta.access — 0 공개 / 1 승인 교인 / 2 민감(관리자). 생략하면 0.
  meta.requiresAuth — 등급은 필요 없지만 로그인은 해야 하는 곳(내 정보 등).
*/
router.beforeEach(async (to) => {
  const need = (to.meta.access as 0 | 1 | 2 | undefined) ?? 0
  const needsLogin = need >= 1 || !!to.meta.requiresAuth

  if (!needsLogin && to.path !== ROUTE_PATHS.LOGIN) return

  await init()
  await ensureProfile({ retryOnError: true })
  const { loggedIn, status, level, profileUnknown } = authSnapshot()

  if (to.path === ROUTE_PATHS.LOGIN) return loggedIn ? ROUTE_PATHS.HOME : undefined

  // 로그인부터. 되돌아갈 곳을 들려 보낸다.
  if (!loggedIn) {
    return { path: ROUTE_PATHS.LOGIN, query: { next: to.fullPath } }
  }

  // 로그인은 했지만 아직 승인 전. '권한 없음' 이 아니라 '기다리는 중' 이므로
  // 안내를 달리해야 한다. 노년 사용자가 실패로 오해하고 재가입하지 않도록.
  if (need >= 1 && status !== 'active') {
    // 통신 오류로 프로필을 못 받은 것은 '승인 전' 이 아니다. 거부로 세지 않고
    // 승인 대기 화면이 '다시 확인' 을 안내한다(PendingPage 의 profileUnknown).
    if (!profileUnknown) void logEvent('access_denied', to.fullPath, { reason: status ?? 'unknown' })
    return ROUTE_PATHS.PENDING
  }

  if (level < need) {
    void logEvent('access_denied', to.fullPath, { need, level })
    return ROUTE_PATHS.NO_ACCESS
  }

  // 민감 등급(2) 화면에 들어간 것만 기록한다. 1등급까지 남기면 하루에도
  // 수백 줄이 쌓여 정작 봐야 할 기록이 묻힌다.
  if (need >= 2 && !to.meta.noAudit) void logEvent('view_sensitive', to.fullPath)
})

// 상세 페이지는 제목을 알아야 하므로 컴포넌트가 setMeta 를 다시 부른다.
// 여기서는 경로만 보고 정할 수 있는 기본값을 깔아둔다.
router.afterEach((to) => {
  setMeta({
    title: to.meta.title as string | undefined,
    description: to.meta.description as string | undefined,
    path: to.fullPath,
    noindex: to.meta.noindex as boolean | undefined,
  })
})

export default router
