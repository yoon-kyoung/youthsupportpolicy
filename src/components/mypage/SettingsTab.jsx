import { useState } from 'react'
import Icon from '../../styles/Icon'
import UserInfoCard from './UserInfoCard'

export default function SettingsTab({ user, onUpdateUser, onLogout }) {
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showModal, setShowModal]       = useState(false)

  return (
    <div style={styles.wrapper}>
      {/* 정보 수정 */}
      <UserInfoCard user={user} onUpdateUser={onUpdateUser} />

      {/* 계정 관리 */}
      <div style={styles.accountCard}>
        <div style={styles.sectionTitle}>
          <Icon name="manage_accounts" size={18} color="#374151"/>
          계정 관리
        </div>

        <div style={styles.actionRow}>
          <button style={styles.btn} type="button" onClick={onLogout}>
            <Icon name="logout" size={16}/>
            로그아웃
          </button>
          <button style={styles.btn} type="button" onClick={() => setShowWithdraw(v => !v)}>
            <Icon name="person_remove" size={16}/>
            회원 탈퇴
          </button>
        </div>

        {showWithdraw && (
          <div style={styles.withdrawBox}>
            <span style={styles.warnText}>
              <Icon name="warning" size={15} color="#ef4444"/>
              {' '}탈퇴 시 모든 데이터가 삭제되며 복구가 불가합니다.
            </span>
            <div style={styles.withdrawBtns}>
              <button style={styles.btn} type="button" onClick={() => setShowWithdraw(false)}>취소</button>
              <button style={styles.btnDanger} type="button" onClick={() => { setShowWithdraw(false); setShowModal(true) }}>
                탈퇴 확인
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 탈퇴 확인 모달 */}
      {showModal && (
        <div style={modal.overlay} onClick={() => setShowModal(false)}>
          <div style={modal.box} onClick={e => e.stopPropagation()}>
            <Icon name="sentiment_very_dissatisfied" size={40} color="#ef4444"/>
            <div style={modal.title}>정말 탈퇴하시겠습니까?</div>
            <div style={modal.desc}>
              회원 탈퇴 시 저장된 맞춤 조건, 신청 내역 등<br />
              모든 데이터가 즉시 삭제되며 복구할 수 없습니다.
            </div>
            <div style={modal.btnRow}>
              <button style={styles.btn} type="button" onClick={() => setShowModal(false)}>
                취소
              </button>
              <button style={styles.btnDanger} type="button">
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    maxWidth: 560,
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: '20px 24px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 15,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 16,
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 20px',
    borderRadius: 8,
    border: '1.5px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 20px',
    borderRadius: 8,
    border: '1.5px solid #fca5a5',
    backgroundColor: '#fff5f5',
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  withdrawBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 16,
    padding: '14px 16px',
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    border: '1px solid #fecaca',
  },
  warnText: {
    fontSize: 13,
    color: '#ef4444',
  },
  withdrawBtns: {
    display: 'flex',
    gap: 8,
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
    justifyContent: 'center',
  },
}
