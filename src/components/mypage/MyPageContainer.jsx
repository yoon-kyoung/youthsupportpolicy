import { useState, useEffect } from 'react'
import Icon from '../../styles/Icon'
import PageHeader from './PageHeader'
import TabBar from './TabBar'
import UserInfoTab from './UserInfoTab'
import PreferenceTab from './PreferenceTab'
import SettingsTab from './SettingsTab'
import SavedPoliciesTab from './SavedPoliciesTab'
import OnboardingTour from './OnboardingTour'

const MOCK_USER = {
  name: '김청년',
  email: 'youth@example.com',
  phone: '010-1234-5678',
  joinDate: '2025-03-15',
  lastLogin: '2026-06-15',
  joinedPolicies: [
    { id: 1, title: '청년 주거 지원 사업',      category: 'house',  date: '2026-06-10', status: '심사중' },
    { id: 2, title: '청년도약계좌',              category: 'money',  date: '2026-06-03', status: '지원완료' },
    { id: 3, title: '국민취업지원제도 1유형',    category: 'job',    date: '2026-05-22', status: '신청완료' },
    { id: 4, title: '청년 내일저축계좌',         category: 'money',  date: '2026-05-14', status: '결과확인' },
    { id: 5, title: '청년 창업 사관학교',        category: 'edu',    date: '2026-04-07', status: '지원완료' },
    { id: 6, title: '청년 건강보험료 지원',      category: 'health', date: '2026-03-18', status: '지원완료' },
  ],
}

const INITIAL_PREFS = {
  sido: '',
  sigungu: '',
  age: '',
  maritalStatus: '',
  incomeMin: '',
  incomeMax: '',
  education: '',
  employmentStatus: '',
  majorFields: [],
  specialFields: [],
  keywords: [],
}

function isPrefsEmpty(p) {
  return !p.sido && !p.age && !p.maritalStatus && !p.education &&
    !p.employmentStatus && p.majorFields.length === 0 &&
    p.specialFields.length === 0 && p.keywords.length === 0
}

export default function MyPageContainer({ supabaseUser, onLogout, initialTab, favIds, policies, onToggleFav, onGoDetail }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'info')

  const initialUser = supabaseUser ? {
    name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || '청년',
    email: supabaseUser.email || '',
    phone: supabaseUser.user_metadata?.phone || '-',
    joinDate: supabaseUser.created_at?.slice(0, 10) || '',
    lastLogin: supabaseUser.last_sign_in_at?.slice(0, 10) || '',
    joinedPolicies: MOCK_USER.joinedPolicies,
  } : MOCK_USER

  const [user, setUser]     = useState(initialUser)
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('yoa:prefs')
      return saved ? { ...INITIAL_PREFS, ...JSON.parse(saved) } : INITIAL_PREFS
    } catch { return INITIAL_PREFS }
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPrefPrompt, setShowPrefPrompt] = useState(false)
  // 'prompt' → 투어 시작 여부 묻는 단계 / 'tour' → 투어 진행 중 / 'hidden' → 숨김
  const [tourState, setTourState] = useState(() =>
    localStorage.getItem('yoa:onboarding-dismissed') === 'true' ? 'hidden' : 'prompt'
  )

  useEffect(() => {
    // 투어가 끝난 상태일 때만 맞춤조건 프롬프트 표시
    if (tourState !== 'hidden') return
    const dismissed = localStorage.getItem('yoa:pref-prompt-dismissed') === 'true'
    if (!dismissed && isPrefsEmpty(prefs)) {
      const t = setTimeout(() => setShowPrefPrompt(true), 600)
      return () => clearTimeout(t)
    }
  }, [tourState])

  const handlePrefYes = () => {
    setShowPrefPrompt(false)
    setActiveTab('prefs')
  }

  const handlePrefDismiss = () => {
    localStorage.setItem('yoa:pref-prompt-dismissed', 'true')
    setShowPrefPrompt(false)
  }

  const handleTourStart = () => setTourState('tour')

  const handleTourDismiss = () => {
    localStorage.setItem('yoa:onboarding-dismissed', 'true')
    setTourState('hidden')
    // 투어 종료 후 맞춤조건이 비어있으면 프롬프트 표시
    const dismissed = localStorage.getItem('yoa:pref-prompt-dismissed') === 'true'
    if (!dismissed && isPrefsEmpty(prefs)) {
      setTimeout(() => setShowPrefPrompt(true), 400)
    }
  }

  const handleTourStep = (stepIdx) => {
    if (stepIdx === 0) setActiveTab('prefs')  // 맞춤 조건 탭
    if (stepIdx === 1) setActiveTab('info')   // 신청 내역 (달력)
    if (stepIdx === 2) setActiveTab('saved')  // 저장한 정책
  }

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <PageHeader />

        {/* 프로필 바 — 유저 정보 전체 */}
        <div style={styles.profileBar}>
          <div style={styles.avatar}>{user.name?.charAt(0) || '?'}</div>
          <div style={styles.profileInfo}>
            <div style={styles.userName}>{user.name}</div>
            <div style={styles.userEmail}>{user.email}</div>
            <div style={styles.profileMeta}>
              <MetaItem icon="call" label="전화번호" value={user.phone} />
              <div style={styles.metaDivider} />
              <MetaItem icon="calendar_today" label="가입일" value={user.joinDate.replace(/-/g, '.')} />
              <div style={styles.metaDivider} />
              <MetaItem icon="login" label="최근 로그인" value={user.lastLogin.replace(/-/g, '.')} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1,
              padding: '7px 14px', borderRadius: 8, flexShrink: 0,
              border: '1px solid #E2E8F0', background: activeTab === 'settings' ? '#F0F7FF' : 'white',
              color: activeTab === 'settings' ? '#007FFF' : '#475569',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Icon name="manage_accounts" size={15} color="currentColor"/>
            계정 관리
          </button>
        </div>

        {/* 투어 시작 여부 프롬프트 */}
        {tourState === 'prompt' && (
          <div style={tourPrompt.overlay}>
            <div style={tourPrompt.box}>
              <Icon name="explore" size={36} color="#1D4ED8" />
              <div style={tourPrompt.title}>마이페이지를 더 잘 쓰는 방법이 궁금하신가요?</div>
              <div style={tourPrompt.desc}>
                북마크 저장·취소, 마감일 달력, 맞춤 조건까지<br />
                30초 안에 핵심 기능을 알려드릴게요.
              </div>
              <div style={tourPrompt.btnRow}>
                <button type="button" style={tourPrompt.btnNo} onClick={handleTourDismiss}>
                  아니요, 괜찮아요
                </button>
                <button type="button" style={tourPrompt.btnYes} onClick={handleTourStart}>
                  보고싶어요
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 스포트라이트 투어 */}
        {tourState === 'tour' && (
          <OnboardingTour onDismiss={handleTourDismiss} onStep={handleTourStep} />
        )}

        {/* 맞춤 조건 미설정 안내 모달 */}
        {showPrefPrompt && (
          <div style={modal.overlay}>
            <div style={modal.box}>
              <Icon name="tune" size={40} color="#007FFF"/>
              <div style={modal.title}>맞춤 조건을 설정할까요?</div>
              <div style={modal.desc}>
                아직 맞춤 조건이 설정되지 않았습니다.<br />
                조건을 설정하면 나에게 맞는 정책을 추천받을 수 있어요.
              </div>
              <div style={modal.btnRow}>
                <button
                  style={modal.btnSecondary}
                  type="button"
                  onClick={() => setShowPrefPrompt(false)}
                >
                  나중에
                </button>
                <button
                  style={modal.btnPrimary}
                  type="button"
                  onClick={handlePrefYes}
                >
                  지금 설정하기
                </button>
              </div>
              <button
                type="button"
                style={modal.btnDismiss}
                onClick={handlePrefDismiss}
              >
                다시 보지 않기
              </button>
            </div>
          </div>
        )}

        {/* 탭 + 콘텐츠 */}
        <div style={styles.tabContainer}>
          <TabBar active={activeTab} onChange={setActiveTab} />
          <div style={styles.tabContent}>
            {activeTab === 'info' && (
              <UserInfoTab user={user} onUpdateUser={setUser} favIds={favIds} policies={policies} onGoDetail={onGoDetail} />
            )}
            {activeTab === 'prefs' && (
              <PreferenceTab
                prefs={prefs}
                onChange={setPrefs}
                onSave={() => {
                  try { localStorage.setItem('yoa:prefs', JSON.stringify(prefs)) } catch {}
                  setRefreshKey(k => k + 1)
                }}
                refreshKey={refreshKey}
              />
            )}
            {activeTab === 'saved' && (
              <SavedPoliciesTab policies={policies} favIds={favIds} onToggleFav={onToggleFav} onGoDetail={onGoDetail} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab user={user} onUpdateUser={setUser} onLogout={onLogout} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaItem({ icon, label, value }) {
  return (
    <div style={metaItem.wrap}>
      <span className="material-symbols-rounded" style={{ fontSize: 14, color: '#9ca3af' }}>{icon}</span>
      <span style={metaItem.label}>{label}</span>
      <span style={metaItem.value}>{value}</span>
    </div>
  )
}

const metaItem = {
  wrap: { display: 'flex', alignItems: 'center', gap: 5 },
  label: { fontSize: 12, color: '#9ca3af', fontWeight: 500 },
  value: { fontSize: 13, color: '#374151', fontWeight: 600 },
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '40px 20px 80px',
  },
  inner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  profileBar: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: '24px 28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0052A3, #007FFF)',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  profileInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  profileMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  metaDivider: {
    width: 1,
    height: 13,
    backgroundColor: '#e5e7eb',
  },
  userName: {
    fontSize: 17,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.3,
  },
  userEmail: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 1.4,
  },
  tabContainer: {
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  tabContent: {
    backgroundColor: '#f8fafc',
    padding: '24px',
  },
}

const modal = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  box: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: '36px 32px',
    maxWidth: 380,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    marginTop: 4,
  },
  desc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 1.7,
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  btnSecondary: {
    flex: 1,
    padding: '11px 0',
    borderRadius: 10,
    border: '1.5px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnPrimary: {
    flex: 2,
    padding: '11px 0',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#007FFF',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnDismiss: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: 12,
    cursor: 'pointer',
    padding: '4px 0',
    textDecoration: 'underline',
    textDecorationColor: '#d1d5db',
  },
}

const tourPrompt = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9500,
  },
  box: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: '36px 32px',
    maxWidth: 380,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    textAlign: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.4,
    marginTop: 4,
  },
  desc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.7,
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  btnNo: {
    flex: 1,
    padding: '11px 0',
    borderRadius: 12,
    border: '1.5px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnYes: {
    flex: 1,
    padding: '11px 0',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#1D4ED8',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
}
