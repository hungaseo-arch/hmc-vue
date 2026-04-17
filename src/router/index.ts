import { createRouter, createWebHashHistory } from 'vue-router'
import { ROUTE_PATHS } from '@/lib/index'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: ROUTE_PATHS.HOME, component: () => import('@/pages/home/HomePage.vue') },

    // 교회소개
    { path: ROUTE_PATHS.GREETING, component: () => import('@/pages/introduction/GreetingPage.vue') },
    { path: ROUTE_PATHS.HISTORY, component: () => import('@/pages/introduction/HistoryPage.vue') },
    { path: ROUTE_PATHS.STAFF, component: () => import('@/pages/introduction/StaffPage.vue') },
    { path: ROUTE_PATHS.WORSHIP_GUIDE, component: () => import('@/pages/introduction/WorshipGuidePage.vue') },
    { path: ROUTE_PATHS.DIRECTIONS, component: () => import('@/pages/introduction/DirectionsPage.vue') },

    // 예배와기도
    { path: ROUTE_PATHS.SUNDAY_SERMON, component: () => import('@/pages/worship/SundaySermonPage.vue') },
    { path: ROUTE_PATHS.SUNDAY_SERMON_DETAIL, component: () => import('@/pages/detailPage/SundaySermonDetailPage.vue') },
    { path: ROUTE_PATHS.PASTORAL_COLUMN, component: () => import('@/pages/worship/PastoralColumnPage.vue') },
    { path: ROUTE_PATHS.PASTORAL_COLUMN_DETAIL, component: () => import('@/pages/detailPage/PastoralColumnDetailPage.vue') },
    { path: ROUTE_PATHS.CHOIR, component: () => import('@/pages/worship/ChoirPage.vue') },

    // 교육과양육
    { path: ROUTE_PATHS.J_ANGELS, component: () => import('@/pages/education/JAngelsPage.vue') },
    { path: ROUTE_PATHS.J_KIDS, component: () => import('@/pages/education/JKidsPage.vue') },
    { path: ROUTE_PATHS.JA_YU, component: () => import('@/pages/education/JaYuPage.vue') },
    { path: ROUTE_PATHS.YOUTH, component: () => import('@/pages/education/YouthPage.vue') },
    { path: ROUTE_PATHS.ADULT_EDU, component: () => import('@/pages/education/AdultEduPage.vue') },

    // 행정과관리
    { path: ROUTE_PATHS.CHURCH_NEWS, component: () => import('@/pages/admin/ChurchNewsPage.vue') },
    { path: ROUTE_PATHS.CHURCH_NEWS_DETAIL, component: () => import('@/pages/detailPage/ChurchNewsDetailPage.vue') },
    { path: ROUTE_PATHS.PHOTO_ALBUM, component: () => import('@/pages/admin/PhotoAlbumPage.vue') },
    { path: ROUTE_PATHS.PHOTO_ALBUM_DETAIL, component: () => import('@/pages/detailPage/PhotoAlbumDetailPage.vue') },
    { path: ROUTE_PATHS.BULLETIN, component: () => import('@/pages/admin/BulletinPage.vue') },
    { path: ROUTE_PATHS.BULLETIN_DETAIL, component: () => import('@/pages/detailPage/BulletinDetailPage.vue') },

    // 404
    { path: '/:pathMatch(.*)*', component: () => import('@/pages/NotFoundPage.vue') },
  ],
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

export default router
