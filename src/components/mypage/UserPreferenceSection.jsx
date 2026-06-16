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

function Divider() {
  return <div style={{ height: 1, backgroundColor: '#f3f4f6' }} />
}

export default function UserPreferenceSection({ prefs, onChange }) {
  const [saveState, setSaveState] = useState('idle') // 'idle' | 'saved'

  const update = (field) => (value) => {
    onChange(prev => ({ ...prev, [field]: value }))
    setSaveState('idle')
  }

  const handleSave = () => {
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2200)
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}><Icon name="tune" size={20} color="#111827" style={{marginRight:8}}/>맞춤 조건 설정</h2>
        <p style={styles.subtitle}>내 조건을 입력하면 맞춤 정책을 추천해드려요</p>
      </div>

      <div style={styles.fields}>
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
        <Divider />
        <EducationButtonGroup value={prefs.education} onChange={update('education')} />
        <Divider />
        <EmploymentStatusButtonGroup value={prefs.employmentStatus} onChange={update('employmentStatus')} />
        <Divider />
        <MajorFieldGrid value={prefs.majorFields} onChange={update('majorFields')} />
        <Divider />
        <SpecialFieldGrid value={prefs.specialFields} onChange={update('specialFields')} />
        <Divider />
        <KeywordTagInput value={prefs.keywords} onChange={update('keywords')} />
      </div>

      <button
        style={saveState === 'saved' ? styles.saveBtnSaved : styles.saveBtn}
        onClick={handleSave}
      >
        {saveState === 'saved' ? '✓ 저장되었습니다' : '조건 저장하기'}
      </button>
    </div>
  )
}

const baseSaveBtn = {
  marginTop: 28,
  width: '100%',
  padding: '13px 0',
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: 28,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  saveBtn: {
    ...baseSaveBtn,
    backgroundColor: '#1D4ED8',
    color: '#ffffff',
  },
  saveBtnSaved: {
    ...baseSaveBtn,
    backgroundColor: '#15803D',
    color: '#ffffff',
  },
}
