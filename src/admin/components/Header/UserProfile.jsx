function UserProfile() {
  return (
    <div className="user-profile">
      <div className="user-meta">
<strong>운영총괄 관리자</strong>
        <span className="user-email">admin@youthon.kr</span>
      </div>
      <button className="logout-button" type="button">
        로그아웃
      </button>
    </div>
  )
}

export default UserProfile
