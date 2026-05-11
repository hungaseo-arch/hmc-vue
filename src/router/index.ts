import { createRouter, createWebHashHistory } from 'vue-router'
import { ROUTE_PATHS } from '@/lib/index'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: ROUTE_PATHS.HOME, component: () => import('@/pages/home/HomePage.vue') },
    { path: ROUTE_PATHS.LOGIN, component: () => import('@/pages/LoginPage.vue') },
    { path: ROUTE_PATHS.SIGNUP, component: () => import('@/pages/SignUpPage.vue') },
    { path: ROUTE_PATHS.PROFILE, component: () => import('@/pages/ProfilePage.vue'), meta: { requiresAuth: true } },

    // 교회소개
    { path: ROUTE_PATHS.GREETING, component: () => import('@/pages/introduction/GreetingPage.vue') },
    { path: ROUTE_PATHS.HISTORY, component: () => import('@/pages/introduction/HistoryPage.vue') },
    { path: ROUTE_PATHS.STAFF, component: () => import('@/pages/introduction/StaffPage.vue') },
    { path: ROUTE_PATHS.WORSHIP_GUIDE, component: () => import('@/pages/introduction/WorshipGuidePage.vue') },
    { path: ROUTE_PATHS.DIRECTIONS, component: () => import('@/pages/introduction/DirectionsPage.vue') },

    // 예배와기도
    { path: ROUTE_PATHS.SUNDAY_SERMON, component: () => import('@/pages/worship/SundaySermonPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.SUNDAY_SERMON_DETAIL, component: () => import('@/pages/detailPage/SundaySermonDetailPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.PASTORAL_COLUMN, component: () => import('@/pages/worship/PastoralColumnPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.PASTORAL_COLUMN_DETAIL, component: () => import('@/pages/detailPage/PastoralColumnDetailPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.CHOIR, component: () => import('@/pages/worship/ChoirPage.vue') },

    // 교육과양육
    { path: ROUTE_PATHS.J_ANGELS, component: () => import('@/pages/education/JAngelsPage.vue') },
    { path: ROUTE_PATHS.J_KIDS, component: () => import('@/pages/education/JKidsPage.vue') },
    { path: ROUTE_PATHS.JA_YU, component: () => import('@/pages/education/JaYuPage.vue') },
    { path: ROUTE_PATHS.YOUTH, component: () => import('@/pages/education/YouthPage.vue') },
    { path: ROUTE_PATHS.ADULT_EDU, component: () => import('@/pages/education/AdultEduPage.vue') },

    // 행정과관리
    { path: ROUTE_PATHS.CHURCH_NEWS, component: () => import('@/pages/admin/ChurchNewsPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.CHURCH_NEWS_DETAIL, component: () => import('@/pages/detailPage/ChurchNewsDetailPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.PHOTO_ALBUM, component: () => import('@/pages/admin/PhotoAlbumPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.PHOTO_ALBUM_DETAIL, component: () => import('@/pages/detailPage/PhotoAlbumDetailPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.BULLETIN, component: () => import('@/pages/admin/BulletinPage.vue'), meta: { requiresAuth: true } },
    { path: ROUTE_PATHS.BULLETIN_DETAIL, component: () => import('@/pages/detailPage/BulletinDetailPage.vue'), meta: { requiresAuth: true } },

    // 404
    { path: '/:pathMatch(.*)*', component: () => import('@/pages/NotFoundPage.vue') },
  ],
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach(async (to) => {
  const needsAuth = to.meta.requiresAuth || to.meta.requiresAdmin
  if (!needsAuth && to.path !== ROUTE_PATHS.LOGIN) return

  const { data: { session } } = await supabase.auth.getSession()
  console.log('[Guard]', to.path, '| session:', session ? session.user.email : 'null')

  if (to.path === ROUTE_PATHS.LOGIN && session) {
    return ROUTE_PATHS.HOME
  }

  if (needsAuth && !session) {
    return ROUTE_PATHS.LOGIN
  }

  if (to.meta.requiresAdmin && session) {
    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (data?.role !== 'admin') return ROUTE_PATHS.LOGIN
  }
})

export default router
