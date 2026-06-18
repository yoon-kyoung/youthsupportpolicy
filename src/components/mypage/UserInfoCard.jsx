import { useState } from 'react'
import UserInfoView from './UserInfoView'
import UserInfoEditForm from './UserInfoEditForm'
import { supabase } from '../../supabase'

export default function UserInfoCard({ user, onUpdateUser }) {
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSave = async (updated) => {
    setSaveError('')
    const { error } = await supabase.auth.updateUser({
      data: { full_name: updated.name, phone: updated.phone },
    })
    if (error) {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.')
      return
    }
    onUpdateUser(prev => ({ ...prev, ...updated }))
    setIsEditing(false)
  }

  return (
    <div style={styles.card}>
      {isEditing ? (
        <UserInfoEditForm
          user={user}
          onSave={handleSave}
          onCancel={() => { setIsEditing(false); setSaveError('') }}
          saveError={saveError}
        />
      ) : (
        <UserInfoView user={user} onEdit={() => setIsEditing(true)} />
      )}
    </div>
  )
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
}
