import { ROUTE_PATHS } from '@/lib/index'

/*
  "소식" 게시판 설정. 교회소식과 선교소식은 화면·저장 구조가 같고(비공개 버킷의
  사진 + 내용 테이블, 승인 교인 열람·관리자 작성) 버킷·테이블·문구만 다르다.
  새 게시판이 필요하면 여기 한 줄과 마이그레이션(T16 참고)만 더한다.
*/
export type NewsBoardKind = 'church' | 'mission'

export interface NewsBoardConfig {
  bucket: string
  table: string
  basePath: string      // 목록 경로. 상세는 `${basePath}/${id}`
  title: string
  subtitle: string
  listHeading: string
  emptyTitle: string
  emptyDescription: string
  newLabel: string      // "새 소식 등록"
  editTitle: string     // "소식 수정"
  backLabel: string     // "소식 목록으로"
  noun: string          // 오류 문구용: "소식"
}

export const NEWS_BOARDS: Record<NewsBoardKind, NewsBoardConfig> = {
  church: {
    bucket: 'churchNews',
    table: 'church_news_content',
    basePath: ROUTE_PATHS.CHURCH_NEWS,
    title: '교회소식',
    subtitle: '한마음교회의 새로운 소식을 전합니다',
    listHeading: '소식 목록',
    emptyTitle: '등록된 소식이 없습니다',
    emptyDescription: '새로운 교회 소식이 올라오면 이곳에 표시됩니다.',
    newLabel: '새 소식 등록',
    editTitle: '소식 수정',
    backLabel: '소식 목록으로',
    noun: '소식',
  },
  mission: {
    bucket: 'missionNews',
    table: 'mission_news_content',
    basePath: ROUTE_PATHS.MISSION_NEWS,
    title: '선교소식',
    subtitle: '땅 끝까지 이르러 복음을 전하는 선교지 소식입니다',
    listHeading: '선교소식 목록',
    emptyTitle: '등록된 선교소식이 없습니다',
    emptyDescription: '선교사님들의 기도편지와 사진이 올라오면 이곳에 표시됩니다.',
    newLabel: '새 선교소식 등록',
    editTitle: '선교소식 수정',
    backLabel: '선교소식 목록으로',
    noun: '선교소식',
  },
}
