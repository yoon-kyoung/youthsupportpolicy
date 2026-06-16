import { useState } from 'react'
import UserInfoView from './UserInfoView'
import UserInfoEditForm from './UserInfoEditForm'

export default function UserInfoCard({ user, onUpdateUser }) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = (updated) => {
    onUpdateUser(prev => ({ ...prev, ...updated }))
    setIsEditing(false)
  }

  return (
    <div style={styles.card}>
      {isEditing ? (
        <UserInfoEditForm
          user={user}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
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
