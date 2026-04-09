import type { SermonItem, HistoryItem, StaffMember, WorshipSchedule, NewsItem, PhotoAlbum } from '@/lib/index'

export const sermons: SermonItem[] = [
  { id: 8, title: '하늘에서 듣고 땅을 고치시라', scripture: '역대하 7:14-16', preacher: '고형돈 목사', date: '2026-03-15' },
  { id: 7, title: '여호와께 바라는 한가지 일', scripture: '시편 27:4-6', preacher: '고형돈 목사', date: '2026-03-08' },
  { id: 6, title: '주안에 뿌리내리고', scripture: '요한복음 15:1-5', preacher: '고형돈 목사', date: '2026-03-01' },
  { id: 5, title: '함께 자라나 열매 맺는', scripture: '갈라디아서 5:22-23', preacher: '고형돈 목사', date: '2026-02-22' },
  { id: 4, title: '성령의 인도하심을 따라', scripture: '로마서 8:14-17', preacher: '강준원 목사', date: '2026-02-15' },
  { id: 3, title: '믿음으로 승리하는 삶', scripture: '히브리서 11:1-6', preacher: '고형돈 목사', date: '2026-02-08' },
  { id: 2, title: '기도의 능력', scripture: '빌립보서 4:6-7', preacher: '강준원 목사', date: '2026-02-01' },
  { id: 1, title: '새해를 여는 믿음', scripture: '이사야 43:18-19', preacher: '고형돈 목사', date: '2026-01-04' },
]

export const historyData: HistoryItem[] = [
  { year: 2025, events: ['테스트 이벤트'] },
  { year: 2018, events: ['01.07 백광호 목사 부임'] },
  { year: 2017, events: ['01.08 담임목사 취임식 / 장로, 안수집사, 권사 취임식'] },
  { year: 2016, events: ['10.02 장로, 안수집사, 권사 임직투표', '10.02 한마음교회 홈페이지 오픈', '08.07 상반기 새신자 환영회', '06.26 박헌식 장로 은퇴식', '04.10 청년 인니진출 전략세미나', '04.02 손정백, 민미경 전도사 부임', '03.19 특별 외부주일예배', '01.31 권사 임직식'] },
  { year: 2015, events: ['12.27 장영수 목사 사임', '04.07 어성경 전강스쿨', '03.14 자유청소년 교회 오픈', '01.29 성경인도자 컨퍼런스', '01.11 고형돈 전도사 부임'] },
  { year: 2014, events: ['12.07 장로 및 권사 임직식', '11.15 어린이 초청잔치', '06.22 운영위원회 발족', '02.27 부흥사경회'] },
  { year: 2013, events: ['02.24 성경세미나'] },
  { year: 2012, events: ['12.30 최정남 안수집사 은퇴', '10.26 한마음 대잔치', '01.22 9주년 창립기념예배'] },
  { year: 2011, events: ['12.25 임직 및 취임식', '05.29 선교 40주년 감사예배', '01.02 청년부 예배 시작'] },
  { year: 2010, events: ['11.28 전도사 부임 및 지휘자 교체', '08.24 화요 중보기도회 시작', '01.03 교회 이전'] },
  { year: 2009, events: ['05.16 교회 이전 준비모임', '05.10 김형주 전도사 부임', '03.09 박정열 전도사 부임'] },
  { year: 2008, events: ['12.28 임직식', '06.06 금요기도회 시작', '01.13 새벽기도회 시작'] },
  { year: 2007, events: ['03.05 극동방송 사역 시작'] },
  { year: 2006, events: ['12.31 임직식', '12.03 전도사 부임', '09.30 J-Teens 첫예배', '07.30 전도사 부임', '01.07 토요기도회 시작'] },
  { year: 2005, events: ['12.25 임직식', '10.23 목사 위임식', '02.06 위임투표'] },
  { year: 2004, events: ['12.26 권사 임직식', '10.17 교회지 발간', '02.08 남선교회 분립'] },
  { year: 2003, events: ['01.21 창립예배'] },
  { year: 2002, events: ['11.03 선교회 구성', '10.20 교회 연합 결정 및 목사 부임', '06.30 첫 예배'] },
]

export const staffMembers: StaffMember[] = [
  { name: '고형돈', role: '담임목사' },
  { name: '강준원', role: '부목사' },
  { name: '현명해', role: '전도사' },
]

export const worshipSchedules: WorshipSchedule[] = [
  { name: '주일 1부 예배', time: '주일 오전 9:30', location: '예배당' },
  { name: '주일 2부 예배', time: '주일 오전 11:00', location: '예배당' },
  { name: '수요 기도회', time: '수요일 오전 10:30', location: '예배당' },
  { name: '새벽 온라인 기도회', time: '화-토요일 오전 4:00', location: '온라인' },
  { name: 'J-Angels (유치부) 예배', time: '주일 오전 11:00', location: '소예배당' },
  { name: 'J-Kids (아동부) 예배', time: '주일 오전 11:00', location: '소예배당' },
  { name: 'Ja-Yu (중고등부) 예배', time: '토요일 오전 10:00', location: '예배당' },
]

export const newsItems: NewsItem[] = [
  {
    id: 1,
    title: '2026년 부활절 연합예배 안내',
    category: '예배',
    date: '2026-03-20',
    summary: '오는 4월 5일 부활절을 맞이하여 자카르타 한인교회들과 연합예배를 드립니다.',
    image: 'https://images.unsplash.com/photo-1769755410067-a1ea14b0602a?w=800&q=80',
  },
  {
    id: 2,
    title: '새가족 성경공부 모집 안내',
    category: '교육',
    date: '2026-03-15',
    summary: '4월부터 시작되는 새가족 성경공부 참가자를 모집합니다. 4주 과정입니다.',
    image: 'https://images.unsplash.com/photo-1702905709201-0950a1a3190f?w=800&q=80',
  },
  {
    id: 3,
    title: '청년부 인니 진출 세미나',
    category: '청년부',
    date: '2026-03-10',
    summary: '인도네시아 사업 진출을 꿈꾸는 청년들을 위한 실질적인 정보와 네트워킹의 자리입니다.',
    image: 'https://images.unsplash.com/photo-1547434019-d330eff46f59?w=800&q=80',
  },
]

export const photoAlbums: PhotoAlbum[] = [
  { id: 1, title: '2026년 부활절 예배', date: '2026-04-05', count: 24, thumbnail: 'https://images.unsplash.com/photo-1769755410067-a1ea14b0602a?w=400&q=80' },
  { id: 2, title: '새가족 환영회', date: '2026-03-01', count: 18, thumbnail: 'https://images.unsplash.com/photo-1547434019-d330eff46f59?w=400&q=80' },
  { id: 3, title: 'J-Kids 어린이 예배', date: '2026-02-20', count: 32, thumbnail: 'https://images.unsplash.com/photo-1702905709201-0950a1a3190f?w=400&q=80' },
  { id: 4, title: '청년부 수련회', date: '2026-01-25', count: 45, thumbnail: 'https://images.unsplash.com/photo-1726679402113-beb32b857a59?w=400&q=80' },
  { id: 5, title: '2025 송년예배', date: '2025-12-28', count: 28, thumbnail: 'https://images.unsplash.com/photo-1759592702518-b0393a8f7eed?w=400&q=80' },
  { id: 6, title: '한마음 대잔치', date: '2025-11-10', count: 56, thumbnail: 'https://images.unsplash.com/photo-1769755411779-e4c43e7b7742?w=400&q=80' },
]
