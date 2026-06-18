# 마이페이지 연동 가이드

> 이 문서는 프로토타입을 실제 서비스에 붙일 때 참고하는 연동 명세입니다.  
> 현재 모든 데이터는 `MyPageContainer.jsx`의 **목 데이터(MOCK)**를 사용 중입니다.  
> 연동 시 아래 항목들을 순서대로 교체하세요.

---

## 1. 컴포넌트 진입점

마이페이지 전체는 단일 컴포넌트에서 시작합니다.

```jsx
// 라우터에서 /mypage 경로에 등록
import MyPageContainer from './components/mypage/MyPageContainer'

<Route path="/mypage" element={<MyPageContainer />} />
```

내부 라우팅 없음. 탭 전환은 컴포넌트 내부 state로 처리합니다.

---

## 2. 교체해야 할 목 데이터 위치

### 2-1. 유저 정보 — `MyPageContainer.jsx`

```js
// 현재 (목 데이터)
const MOCK_USER = {
  name: '김청년',
  email: 'youth@example.com',
  phone: '010-1234-5678',
  joinDate: '2025-03-15',
  lastLogin: '2026-06-15',
  joinedPolicies: [ ... ],
}

// 교체 후 (API 호출)
const [user, setUser] = useState(null)

useEffect(() => {
  fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(setUser)
}, [])
```

**User 객체 스펙:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | `string` | 이름 |
| `email` | `string` | 이메일 (수정 불가) |
| `phone` | `string` | 전화번호 |
| `joinDate` | `string` | 가입일 `YYYY-MM-DD` |
| `lastLogin` | `string` | 최근 로그인일 `YYYY-MM-DD` |
| `joinedPolicies` | `PolicyApplication[]` | 신청 내역 (아래 참고) |

**PolicyApplication 객체:**

| 필드 | 타입 | 값 |
|------|------|----|
| `id` | `number` | 고유 ID |
| `title` | `string` | 정책명 |
| `category` | `string` | `'job'` `'house'` `'money'` `'edu'` `'health'` |
| `date` | `string` | 신청일 `YYYY-MM-DD` |
| `status` | `string` | `'신청완료'` `'심사중'` `'결과확인'` `'지원완료'` |

---

### 2-2. 맞춤 조건 — `MyPageContainer.jsx`

```js
// 현재 (초기 빈 값)
const INITIAL_PREFS = {
  sido: '', sigungu: '', age: '',
  maritalStatus: '', incomeMin: '', incomeMax: '',
  education: '', employmentStatus: '',
  majorFields: [], specialFields: [], keywords: [],
}

// 교체 후 (API에서 저장된 조건 불러오기)
const [prefs, setPrefs] = useState(INITIAL_PREFS)

useEffect(() => {
  fetch('/api/user/prefs', { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json())
    .then(data => data && setPrefs(data))
}, [])
```

**Prefs 객체 스펙:**

| 필드 | 타입 | 비고 |
|------|------|------|
| `sido` | `string` | 시/도명 (예: `'서울특별시'`) |
| `sigungu` | `string` | 시/군/구명 |
| `age` | `string` | 만 나이 |
| `maritalStatus` | `string` | `'미혼'` `'기혼'` `'이혼'` `'사별'` |
| `incomeMin` | `string` | 연 소득 최소 (만원) |
| `incomeMax` | `string` | 연 소득 최대 (만원) |
| `education` | `string` | 학력 (10개 옵션 중 1개) |
| `employmentStatus` | `string` | 취업 상태 (10개 옵션 중 1개) |
| `majorFields` | `string[]` | 전공 분야 ID 배열 (복수) |
| `specialFields` | `string[]` | 특화 분야 ID 배열 (복수) |
| `keywords` | `string[]` | 선택 키워드 배열 |

---

### 2-3. 맞춤 정책 미리보기 — `PolicyPreviewSection.jsx`

```js
// 현재: MOCK_POLICIES 하드코딩
// 교체 후: refreshKey가 바뀔 때마다 API 호출

useEffect(() => {
  if (refreshKey === 0) return
  setLoading(true)
  fetch(`/api/policies/recommended`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(currentPrefs),
  })
    .then(r => r.json())
    .then(data => { setPolicies(data); setLoading(false) })
}, [refreshKey])
```

---

## 3. 필요한 API 엔드포인트 목록

| 메서드 | 경로 | 용도 | 호출 위치 |
|--------|------|------|-----------|
| `GET` | `/api/user/me` | 유저 프로필 조회 | `MyPageContainer` 마운트 시 |
| `PUT` | `/api/user/me` | 프로필 수정 (이름, 전화번호) | `UserInfoEditForm` 저장 버튼 |
| `PUT` | `/api/user/me/password` | 비밀번호 변경 | `UserInfoEditForm` 비밀번호 변경 |
| `GET` | `/api/user/prefs` | 저장된 맞춤 조건 조회 | `MyPageContainer` 마운트 시 |
| `PUT` | `/api/user/prefs` | 맞춤 조건 저장 | `PreferenceTab` 저장 버튼 |
| `GET` | `/api/user/applications` | 신청 내역 조회 | `MyPageContainer` 마운트 시 |
| `POST` | `/api/policies/recommended` | 맞춤 정책 추천 | `PolicyPreviewSection` (조건 저장 후) |
| `DELETE` | `/api/user/me` | 회원 탈퇴 | `SettingsTab` 탈퇴 확인 버튼 |
| `POST` | `/api/auth/logout` | 로그아웃 | `SettingsTab` 로그아웃 버튼 |

---

## 4. 맞춤 조건 미설정 감지 (신규 가입자 온보딩)

현재 프론트에서는 모든 prefs가 빈 값이면 팝업을 띄워 맞춤 조건 탭으로 유도합니다.

```js
// 방법 A: GET /api/user/prefs 응답이 null이면 신규
fetch('/api/user/prefs').then(r => r.json()).then(data => {
  if (!data) setShowPrefPrompt(true)
  else setPrefs(data)
})

// 방법 B: 유저 객체에 플래그 포함
// GET /api/user/me 응답에 has_set_prefs: boolean 추가
if (!user.has_set_prefs) setShowPrefPrompt(true)
```

---

## 5. 환경 변수

`.env` 파일에 아래 변수를 추가하세요.

```env
VITE_API_BASE_URL=https://api.your-service.com
```

---

## 6. 현재 미구현 / 목 처리 중인 기능 요약

| 기능 | 현재 상태 | 연동 필요 작업 |
|------|-----------|---------------|
| 유저 정보 조회 | 목 데이터 | `GET /api/user/me` 연결 |
| 정보 수정 저장 | UI만 존재 | `PUT /api/user/me` 연결 |
| 맞춤 조건 저장 | UI만 존재 | `PUT /api/user/prefs` 연결 |
| 신청 내역 조회 | 목 데이터 | `GET /api/user/applications` 연결 |
| 맞춤 정책 추천 | 목 데이터 | `POST /api/policies/recommended` 연결 |
| 로그아웃 | 버튼만 존재 | `POST /api/auth/logout` + 리다이렉트 |
| 회원 탈퇴 | 모달만 존재 | `DELETE /api/user/me` + 세션 제거 |
