// Route paths
export const ROUTE_PATHS = {
  HOME: '/',
  // 교회소개
  WELCOME: '/introduction/welcome',
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
  CHURCH_VIDEO: '/worship/church-video',
  // 교육과양육
  J_ANGELS: '/education/j-angels',
  J_KIDS: '/education/j-kids',
  JA_YU: '/education/ja-yu',
  YOUTH: '/education/youth',
  ADULT_EDU: '/education/adult',
  // 소식과나눔 — 관리자 도구가 아니라 교인용 콘텐츠라 /admin 이 아닌 /community 를 쓴다.
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
      { label: '처음 오신 분', path: ROUTE_PATHS.WELCOME },
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
    // 안에 든 것이 교회소식·선교소식·포토앨범·주보라 '행정과관리' 로는 무엇이
    // 들어 있는지 짐작할 수 없었다. 주소(/community)와도 어긋났다.
    label: '소식과나눔',
    children: [
      { label: '교회소식', path: ROUTE_PATHS.CHURCH_NEWS },
      { label: '선교소식', path: ROUTE_PATHS.MISSION_NEWS },
      { label: '포토앨범', path: ROUTE_PATHS.PHOTO_ALBUM },
      { label: '주보보기', path: ROUTE_PATHS.BULLETIN },
    ],
  },
]

/*
  설교 등록 화면의 '설교자' 는 자유 입력이라 '고형돈 목사' 와 '고형돈목사' 가
  섞여 들어온다. 같은 사람이 목록에서는 붙어 있고 상세에서는 떨어져 보이면
  다른 사람처럼 읽힌다. 긴 직함부터 봐야 '담임목사' 가 '목사' 에 먼저 걸리지
  않는다.
*/
const CLERGY_TITLES = ['담임목사', '부목사', '강도사', '전도사', '선교사', '목사', '장로', '권사', '집사', '사모']

/** '고형돈목사' → '고형돈 목사'. 이미 띄어져 있거나 직함이 없으면 그대로. */
export function formatPreacher(name: string | null | undefined): string {
  const text = name?.trim().replace(/\s+/g, ' ') ?? ''
  if (!text) return ''
  for (const title of CLERGY_TITLES) {
    if (text.length > title.length && text.endsWith(title) && !text.endsWith(` ${title}`)) {
      return `${text.slice(0, -title.length).trim()} ${title}`
    }
  }
  return text
}

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
