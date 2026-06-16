import JoinHistoryCard from './JoinHistoryCard'
import ApplicationCalendar from './ApplicationCalendar'

export default function UserInfoTab({ user }) {
  return (
    <div style={styles.wrapper}>
      {/* 달력 — 전체 너비 */}
      <ApplicationCalendar applications={user.joinedPolicies} />

      {/* 신청 내역 — 전체 너비 */}
      <JoinHistoryCard policies={user.joinedPolicies} />
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
}
