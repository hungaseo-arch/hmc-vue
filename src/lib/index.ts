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
  PASTORAL_COLUMN: '/worship/pastoral-column',
  CHOIR: '/worship/choir',
  // 교육과양육
  J_ANGELS: '/education/j-angels',
  J_KIDS: '/education/j-kids',
  JA_YU: '/education/ja-yu',
  YOUTH: '/education/youth',
  ADULT_EDU: '/education/adult',
  // 행정과관리
  CHURCH_NEWS: '/admin/news',
  PHOTO_ALBUM: '/admin/photos',
  BULLETIN: '/admin/bulletin',
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

export interface NewsItem {
  id: number
  title: string
  category: string
  date: string
  summary: string
  image: string
}

export interface PhotoAlbum {
  id: number
  title: string
  date: string
  count: number
  thumbnail: string
}
