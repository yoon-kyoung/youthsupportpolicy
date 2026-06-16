import UserInfoCard from './UserInfoCard'
import JoinHistoryCard from './JoinHistoryCard'

export default function UserInfoSection({ user, onUpdateUser }) {
  return (
    <div style={styles.wrapper}>
      <UserInfoCard user={user} onUpdateUser={onUpdateUser} />
      <JoinHistoryCard policies={user.joinedPolicies} />
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
}
