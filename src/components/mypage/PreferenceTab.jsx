import { useState } from 'react'
import Icon from '../../styles/Icon'
import LocationSelect from './LocationSelect'
import AgeInput from './AgeInput'
import MaritalStatusButtonGroup from './MaritalStatusButtonGroup'
import IncomeRangeInput from './IncomeRangeInput'
import EducationButtonGroup from './EducationButtonGroup'
import EmploymentStatusButtonGroup from './EmploymentStatusButtonGroup'
import MajorFieldGrid from './MajorFieldGrid'
import SpecialFieldGrid from './SpecialFieldGrid'
import KeywordTagInput from './KeywordTagInput'
import PolicyPreviewSection from './PolicyPreviewSection'

/*
 * RowAccordion
 * - count: 헤더에 표시할 설정된 항목 수 (0이면 배지 숨김)
 * - onSectionSave: 세부 저장 콜백
 */
function RowAccordion({ title, icon, count = 0, onSectionSave, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const [secSave, setSecSave] = useState('idle')

  const handleSectionSave = (e) => {
    e.stopPropagation()
    setSecSave('saved')
    onSectionSave?.()
    setTimeout(() => setSecSave('idle'), 2000)
  }

  return (
    <div style={row.wrap}>
      {/* 헤더 */}
      <button type="button" style={row.header} onClick={() => setOpen(v => !v)}>
        <div style={row.left}>
          <Icon name={icon} size={16} color="#007FFF"/>
          <span style={row.title}>{title}</span>
          {count > 0 && (
            <span style={row.countBadge}>{count}개 설정됨</span>
          )}
        </div>
        <div style={row.right}>
          <span style={row.toggleHint}>{open ? '접기' : '펼치기'}</span>
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 20, color: '#9ca3af', transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* 콘텐츠 */}
      {open && (
        <>
          <div style={row.body}>
            {children}
          </div>

          {/* 세부 저장 바 */}
          <div style={row.sectionSaveBar}>
            <button
              type="button"
              style={secSave === 'saved' ? row.secBtnSaved : row.secBtn}
              onClick={handleSectionSave}
            >
              {secSave === 'saved'
                ? <><span className="material-symbols-rounded" style={{ fontSize: 14 }}>check_circle</span> 저장됨</>
                : <><span className="material-symbols-rounded" style={{ fontSize: 14 }}>save</span> 이 조건 저장</>
              }
            </button>
          </div>
        </>
      )}

      {/* 접혔을 때 요약 바 */}
      {!open && count > 0 && (
        <div style={row.collapsedSummary}>
          <span className="material-symbols-rounded" style={{ fontSize: 14, color: '#9ca3af' }}>info</span>
          <span style={row.collapsedText}>{count}개 항목이 설정되어 있습니다</span>
          <button type="button" style={row.expandBtn} onClick={() => setOpen(true)}>
            펼쳐서 확인
          </button>
        </div>
      )}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: '#f3f4f6' }} />
}

const row = {
  wrap: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    backgroundColor: '#fafafa',
    border: 'none',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
  },
  left: { display: 'flex', alignItems: 'center', gap: 8 },
  right: { display: 'flex', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: 700, color: '#374151' },
  countBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#007FFF',
    backgroundColor: '#F0F7FF',
    border: '1px solid #007FFF',
    padding: '2px 8px',
    borderRadius: 20,
  },
  toggleHint: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: 500,
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
  },
  sectionSaveBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '10px 20px',
    borderTop: '1px solid #f3f4f6',
    backgroundColor: '#fafafa',
  },
  secBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 16px',
    borderRadius: 8,
    border: '1.5px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secBtnSaved: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 16px',
    borderRadius: 8,
    border: '1.5px solid #BBF7D0',
    backgroundColor: '#F0FDF4',
    color: '#15803D',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  collapsedSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #f3f4f6',
  },
  collapsedText: {
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
  },
  expandBtn: {
    fontSize: 12,
    color: '#007FFF',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 4px',
    textDecoration: 'underline',
  },
}

const colStyle = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  borderRight: '1px solid #f3f4f6',
}

const colLastStyle = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
}

export default function PreferenceTab({ prefs, onChange, onSave, refreshKey }) {
  const [saveState, setSaveState] = useState('idle')

  const update = (field) => (value) => {
    onChange(prev => ({ ...prev, [field]: value }))
    setSaveState('idle')
  }

  const handleSave = () => {
    setSaveState('saved')
    onSave?.()
    setTimeout(() => setSaveState('idle'), 2200)
  }

  // 각 아코디언의 설정 항목 수 계산
  const count1 = [prefs.sido, prefs.age, prefs.maritalStatus, prefs.education, prefs.employmentStatus]
    .filter(v => v && v !== '').length +
    ((prefs.incomeMin || prefs.incomeMax) ? 1 : 0)

  const count2 = prefs.majorFields.length + prefs.specialFields.length

  return (
    <div style={styles.wrapper}>

      {/* 행 아코디언 1 */}
      <RowAccordion
        title="기본 조건  ·  학력 / 취업 상태"
        icon="tune"
        count={count1}
        onSectionSave={onSave}
      >
        <div style={colStyle}>
          <LocationSelect
            sido={prefs.sido}
            sigungu={prefs.sigungu}
            onChangeSido={v => onChange(p => ({ ...p, sido: v, sigungu: '' }))}
            onChangeSigungu={update('sigungu')}
          />
          <Divider />
          <AgeInput value={prefs.age} onChange={update('age')} />
          <Divider />
          <MaritalStatusButtonGroup value={prefs.maritalStatus} onChange={update('maritalStatus')} />
          <Divider />
          <IncomeRangeInput
            min={prefs.incomeMin}
            max={prefs.incomeMax}
            onChangeMin={update('incomeMin')}
            onChangeMax={update('incomeMax')}
          />
        </div>
        <div style={colLastStyle}>
          <EducationButtonGroup value={prefs.education} onChange={update('education')} />
          <Divider />
          <EmploymentStatusButtonGroup value={prefs.employmentStatus} onChange={update('employmentStatus')} />
        </div>
      </RowAccordion>

      {/* 행 아코디언 2 */}
      <RowAccordion
        title="전공 분야  ·  특화 분야"
        icon="category"
        count={count2}
        onSectionSave={onSave}
      >
        <div style={colStyle}>
          <MajorFieldGrid value={prefs.majorFields} onChange={update('majorFields')} />
        </div>
        <div style={colLastStyle}>
          <SpecialFieldGrid value={prefs.specialFields} onChange={update('specialFields')} />
        </div>
      </RowAccordion>

      {/* 선택 키워드 — 항상 노출 */}
      <div style={styles.keywordCard}>
        <KeywordTagInput value={prefs.keywords} onChange={update('keywords')} />
      </div>

      {/* 전체 저장 버튼 */}
      <button
        style={saveState === 'saved' ? styles.saveBtnSaved : styles.saveBtn}
        onClick={handleSave}
        type="button"
      >
        {saveState === 'saved'
          ? <><span className="material-symbols-rounded" style={{ fontSize: 18 }}>check_circle</span> 전체 저장 완료</>
          : <><span className="material-symbols-rounded" style={{ fontSize: 18 }}>save</span> 전체 저장하기</>
        }
      </button>

      {/* 정책 미리보기 */}
      <PolicyPreviewSection refreshKey={refreshKey} />
    </div>
  )
}

const baseSave = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: '14px 0',
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  keywordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    padding: '20px 24px',
  },
  saveBtn: {
    ...baseSave,
    backgroundColor: '#007FFF',
    color: '#ffffff',
  },
  saveBtnSaved: {
    ...baseSave,
    backgroundColor: '#15803D',
    color: '#ffffff',
  },
}
