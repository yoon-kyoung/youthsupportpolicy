import JoinHistoryCard from './JoinHistoryCard'
import ApplicationCalendar from './ApplicationCalendar'

export default function UserInfoTab({ user, favIds, policies, onGoDetail }) {
  return (
    <div style={styles.wrapper}>
      {/* 달력 — 전체 너비 */}
      <ApplicationCalendar policies={policies} favIds={favIds} onGoDetail={onGoDetail} />

      {/* 신청 내역 — 전체 너비 */}
      <JoinHistoryCard policies={policies} favIds={favIds} onGoDetail={onGoDetail} />
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
