// Route paths
export const ROUTE_PATHS = {
  HOME: '/',
  // 교회소개
  GREETING: '/introduction/greeting',
  HISTORY: '/introduction/history',
  STAFF: '/introduction/staff',
  WORSHIP_GUIDE: '/introduction/worship-guide',
  DIRECTIONS: '/introduction/directions',
  // 예배와기도
  SUNDAY_SERMON: '/worship/sunday-sermon',
  SUNDAY_SERMON_DETAIL: '/worship/sunday-sermon/:id',
  PASTORAL_COLUMN: '/worship/pastoral-column',
  PASTORAL_COLUMN_DETAIL: '/worship/pastoral-column/:id',
  CHOIR: '/worship/choir',
  CHURCH_VIDEO: '/worship/church-video',
  // 교육과양육
  J_ANGELS: '/education/j-angels',
  J_KIDS: '/education/j-kids',
  JA_YU: '/education/ja-yu',
  YOUTH: '/education/youth',
  ADULT_EDU: '/education/adult',
  // 행정과관리 — 관리자 도구가 아니라 교인용 콘텐츠라 /admin 이 아닌 /community 를 쓴다.
  // 예전 /admin/* 주소는 router 에서 리디렉트로 받는다.
  CHURCH_NEWS: '/community/news',
  CHURCH_NEWS_DETAIL: '/community/news/:id',
  PHOTO_ALBUM: '/community/photos',
  PHOTO_ALBUM_DETAIL: '/community/photos/:id',
  BULLETIN: '/community/bulletin',
  BULLETIN_DETAIL: '/community/bulletin/:id',
  MISSION_NEWS: '/community/mission-news',
  LOGIN: '/login',
  SIGNUP: '/signup',
  PROFILE: '/profile',
  // 인증 안내 — 메뉴에는 넣지 않는다. 라우터 가드가 보낼 때만 쓰는 곳이다.
  PENDING: '/pending',
  NO_ACCESS: '/no-access',
  // 관리자 전용
  ADMIN_MEMBERS: '/admin/members',
  ADMIN_AUDIT_LOG: '/admin/audit-log',
} as const

export interface NavSubItem {
  label: string
  path: string
}

export interface NavItem {
  label: string
  children: NavSubItem[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: '교회소개',
    children: [
      { label: '인사말', path: ROUTE_PATHS.GREETING },
      { label: '연혁', path: ROUTE_PATHS.HISTORY },
      { label: '섬기는 사람들', path: ROUTE_PATHS.STAFF },
      { label: '예배안내', path: ROUTE_PATHS.WORSHIP_GUIDE },
      { label: '오시는 길', path: ROUTE_PATHS.DIRECTIONS },
    ],
  },
  {
    label: '예배와기도',
    children: [
      { label: '주일설교', path: ROUTE_PATHS.SUNDAY_SERMON },
      { label: '목회칼럼', path: ROUTE_PATHS.PASTORAL_COLUMN },
      { label: '찬양대찬양', path: ROUTE_PATHS.CHOIR },
      { label: '교회영상', path: ROUTE_PATHS.CHURCH_VIDEO },
    ],
  },
  {
    label: '교육과양육',
    children: [
      { label: 'J-Angels', path: ROUTE_PATHS.J_ANGELS },
      { label: 'J-Kids', path: ROUTE_PATHS.J_KIDS },
      { label: 'Ja-Yu', path: ROUTE_PATHS.JA_YU },
      { label: '청년부', path: ROUTE_PATHS.YOUTH },
      { label: '성인교육', path: ROUTE_PATHS.ADULT_EDU },
    ],
  },
  {
    label: '행정과관리',
    children: [
      { label: '교회소식', path: ROUTE_PATHS.CHURCH_NEWS },
      { label: '선교소식', path: ROUTE_PATHS.MISSION_NEWS },
      { label: '포토앨범', path: ROUTE_PATHS.PHOTO_ALBUM },
      { label: '주보보기', path: ROUTE_PATHS.BULLETIN },
    ],
  },
]

// Types
export interface SermonItem {
  id: number
  title: string
  scripture: string
  preacher: string
  date: string
  link?: string
}

export interface PastoralColumnItem {
  id: number
  title: string
  content: string | null
  created_at: string
  /** DB 생성 컬럼. content 에서 태그를 걷어낸 앞 200자. */
  excerpt?: string | null
}

/** 목록용. content 대신 DB 생성 컬럼 excerpt(태그 제거 앞 200자)만 싣는다. */
export interface PastoralColumnListItem {
  id: number
  title: string
  created_at: string
  excerpt: string | null
}

export interface HistoryItem {
  year: number
  events: string[]
}

export interface StaffMember {
  name: string
  role: string
  image?: string
}

export interface WorshipSchedule {
  name: string
  time: string
  location: string
}

export interface WorshipVideo {
  label: string
  description: string
  url: string
}

export interface MissionNews {
  id: number
  region: string
  title: string
  missionary: string
  date: string
  body: string
  prayers?: string[]
}

export interface NewsItem {
  id: number
  title: string
  category: string
  date: string
  summary: string
  image: string
}

export interface ChurchNewsItem {
  id: string        // slug: '2024-09-01_999-prayer-campaign'
  title: string
  date: string
  files: string[]   // storage paths — the durable identity; never parse these back out of a URL
  thumbnail: string
  images: string[]  // signed URLs, index-aligned with files; re-minted before expiry
  content?: string | null
}

export interface PhotoAlbumItem {
  id: string        // '{date}_{numId}' e.g. '2025-11-16_617'
  date: string      // 'YYYY-MM-DD'
  title: string
  files: string[]   // storage paths — see note on ChurchNewsItem
  thumbnail: string
  images: string[]  // signed URLs, index-aligned with files
  count: number
}

export interface WeeklyBulletinItem {
  id: number
  title: string
  image_url: string
  created_at: string
}

export interface PhotoAlbum {
  id: number
  title: string
  date: string
  count: number
  thumbnail: string
}
