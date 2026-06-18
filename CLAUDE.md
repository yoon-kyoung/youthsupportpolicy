# 청년ON 개발 가이드

## 아이콘 규칙

모든 아이콘은 **Google Fonts Material Symbols Rounded** 스타일만 사용합니다. 이모지(📋💼🏠 등) 사용 금지.

### 사용법
```jsx
import { Icon } from "./Icon"; // 상대경로 조정

<Icon name="search" />                              // 기본 (outlined)
<Icon name="star" fill={1} />                       // filled
<Icon name="search" size={24} />                    // 크기
<Icon name="star" fill={1} size={18} weight={700} /> // 모든 옵션
```

### 새 아이콘 추가 시
1. https://fonts.google.com/icons?icon.style=Rounded 에서 Rounded 스타일로 검색
2. 아이콘 이름을 `name` prop으로 사용
3. CLAUDE.md 하단 목록에 추가

### 현재 사용 중인 아이콘

| name | 설명 |
|------|------|
| `apps` | 카테고리 전체 |
| `work` | 취업·창업 |
| `home` | 주거 |
| `payments` | 금융·자산 |
| `school` | 교육·역량 |
| `local_hospital` | 건강·심리 |
| `search` | 검색 네비 |
| `smart_toy` | AI챗봇 |
| `person` | 마이페이지 |
| `forum` | 커뮤니티 네비 |
| `auto_awesome` | 나의 맞춤 정책 |
| `task_alt` | 신청 체크리스트 |
| `calendar_month` | 정책 캘린더 |
| `star` | 저장 (fill=1 저장됨, fill=0 저장하기) |
| `local_fire_department` | 인기 |
| `link` | 공유 |
| `alarm` | 마감 알람 |
| `visibility` / `visibility_off` | 비밀번호 표시/숨김 |
| `favorite` | 공감 (fill=1 공감, fill=0 취소) |
| `account_balance` | 로고 |
| `list_alt` | 사업 개요 섹션 |
| `edit_note` | 신청 방법 섹션 |
| `folder_open` | 필요 서류 섹션 |
| `push_pin` | 핵심 정보 |
| `group` | 신청 대상 |
| `description` | 공식 공고문 |
| `visibility` | 관심도 |
| `chat_bubble` | 댓글 수 |
| `celebration` | 완료 |
| `admin_panel_settings` | 관리자 |
| `notifications` | 알림 |
