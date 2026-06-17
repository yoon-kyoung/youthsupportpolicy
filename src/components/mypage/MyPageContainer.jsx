import { useState, useEffect } from 'react'
import Icon from '../../styles/Icon'
import PageHeader from './PageHeader'
import TabBar from './TabBar'
import UserInfoTab from './UserInfoTab'
import PreferenceTab from './PreferenceTab'
import SettingsTab from './SettingsTab'
import SavedPoliciesTab from './SavedPoliciesTab'

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

export default function MyPageContainer({ supabaseUser, onLogout, initialTab, favIds, policies, onToggleFav }) {
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
  const [prefs, setPrefs]   = useState(INITIAL_PREFS)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPrefPrompt, setShowPrefPrompt] = useState(false)

  useEffect(() => {
    if (isPrefsEmpty(prefs)) {
      const t = setTimeout(() => setShowPrefPrompt(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  const handlePrefYes = () => {
    setShowPrefPrompt(false)
    setActiveTab('prefs')
  }

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <PageHeader />

        {/* 프로필 바 — 유저 정보 전체 */}
        <div style={{ ...styles.profileBar, position: 'relative' }}>
          <div style={styles.profileLeft}>
            <div style={styles.avatar}>{user.name?.charAt(0) || '?'}</div>
            <div>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userEmail}>{user.email}</div>
            </div>
          </div>
          <div style={styles.profileMeta}>
            <MetaItem icon="call" label="전화번호" value={user.phone} />
            <div style={styles.metaDivider} />
            <MetaItem icon="calendar_today" label="가입일" value={user.joinDate.replace(/-/g, '.')} />
            <div style={styles.metaDivider} />
            <MetaItem icon="login" label="최근 로그인" value={user.lastLogin.replace(/-/g, '.')} />
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              position: 'absolute', top: 14, right: 16,
              display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1,
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid #e5e7eb', background: activeTab === 'settings' ? '#F0F7FF' : '#f9fafb',
              color: activeTab === 'settings' ? '#007FFF' : '#6b7280',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Icon name="manage_accounts" size={14}/>
            계정 관리
          </button>
        </div>

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
            </div>
          </div>
        )}

        {/* 탭 + 콘텐츠 */}
        <div style={styles.tabContainer}>
          <TabBar active={activeTab} onChange={setActiveTab} />
          <div style={styles.tabContent}>
            {activeTab === 'info' && (
              <UserInfoTab user={user} onUpdateUser={setUser} />
            )}
            {activeTab === 'prefs' && (
              <PreferenceTab
                prefs={prefs}
                onChange={setPrefs}
                onSave={() => setRefreshKey(k => k + 1)}
                refreshKey={refreshKey}
              />
            )}
            {activeTab === 'saved' && (
              <SavedPoliciesTab policies={policies} favIds={favIds} onToggleFav={onToggleFav} />
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
      <Icon name={icon} size={14} color="#9ca3af"/>
      <span style={metaItem.label}>{label}</span>
      <span style={metaItem.value}>{value}</span>
    </div>
  )
}

const metaItem = {
  wrap: { display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1 },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: '28px 32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  profileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e3a8a, #007FFF)',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#e5e7eb',
  },
  userName: {
    fontSize: 17,
    fontWeight: 700,
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#9ca3af',
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
}
