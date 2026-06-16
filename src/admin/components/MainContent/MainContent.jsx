import Dashboard from '../Dashboard/Dashboard'
import PolicyContentPage from '../../pages/PolicyContentPage'
import MemberPage from '../../pages/MemberPage'
import BoardPage from '../../pages/BoardPage'
import StatisticsPage from '../../pages/StatisticsPage'

const pageConfig = {
  dashboard: {
    eyebrow: 'Dashboard Overview',
    title: '청년정책 탐색 데이터를 운영 인사이트로 연결합니다',
    chips: ['일자리·창업', '주거·금융', '교육', '복지·문화', '참여·권리'],
  },
  policy: {
    eyebrow: 'Policy Management',
    title: '정책 콘텐츠를 등록하고 심사합니다',
    description: '카테고리별 정책 콘텐츠의 등록 현황과 심사 진행 상태를 한눈에 관리합니다. 노출 우선순위와 상태를 조정해 유저 탐색 경험을 최적화하세요.',
    chips: ['게시중', '심사중', '보완요청', '임시저장'],
  },
  member: {
    eyebrow: 'Member Management',
    title: '회원 현황과 권한을 관리합니다',
    description: '가입 회원의 활동 현황과 지역 분포를 확인하고 관리자 권한을 부여하거나 회수합니다.',
    chips: ['전체 회원', '일반회원', '관리자'],
  },
  board: {
    eyebrow: 'Board Management',
    title: '소통 게시판을 관리합니다',
    description: '공지사항, 자유게시판, Q&A의 게시글 현황을 확인하고 운영 정책에 맞게 관리합니다. Q&A 답변 대기 건을 우선 처리하세요.',
    chips: ['공지사항', '자유게시판', 'Q&A'],
  },
  statistics: {
    eyebrow: 'Statistics & Analysis',
    title: '운영 지표와 추이를 분석합니다',
    description: '월별 방문자·조회·신청 추이와 카테고리별, 지역별 데이터를 시각화합니다. 데이터 기반으로 정책 운영 방향을 결정하세요.',
    chips: ['방문자', '정책 조회', '신청 전환', '카테고리별'],
  },
}

function MainContent({ data, activePage }) {
  const page = pageConfig[activePage] || pageConfig.dashboard
  const chips = activePage === 'dashboard' ? data.policyCategories : page.chips

  return (
    <main className="main-content">
{activePage === 'dashboard' && <Dashboard data={data} />}
      {activePage === 'policy' && <PolicyContentPage />}
      {activePage === 'member' && <MemberPage />}
      {activePage === 'board' && <BoardPage />}
      {activePage === 'statistics' && <StatisticsPage />}
    </main>
  )
}

export default MainContent
