# 청년지원정책 안내 웹사이트

우리 팀이 만든 청년지원정책 안내 웹사이트입니다.

## 사이트 주소

| 용도 | 링크 |
|------|------|
| 미리보기 (Vercel) | https://youthsupportpolicy-preview.vercel.app |
| 관리자 페이지 | https://youthsupportpolicy-preview.vercel.app/#admin |
| GitHub Pages | https://yoon-kyoung.github.io/youthsupportpolicy/ |

## 주요 기능

- **정책 검색** — 청년지원정책을 카테고리별로 검색할 수 있어요
- **AI 챗봇** — 정책에 대해 질문하면 AI가 답변해줘요
- **관리자 페이지** — 챗봇 설정(모델 변경, 시스템 프롬프트 수정 등)을 할 수 있어요

## 팀 역할

| 이름 | 담당 |
|------|------|
| 박수아 | 팀장 |
| 권규빈 | 팀원 |
| 최윤경 | 웹사이트 프론트엔드 개발 |
| 임종권 | 챗봇 + API 연결 + 관리자 페이지 |

## 브랜치 설명

- `main` — 안정된 최종 버전
- `feature/chatbot-admin` — 챗봇과 관리자 페이지가 추가된 버전 (작업 중)

## 로컬에서 실행하고 싶을 때 (개발자용)

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 열면 됩니다.

## 사용 기술

- React + Vite (웹사이트)
- Vercel (배포)
- OpenRouter API (AI 챗봇)
- Google Sheets (데이터 저장)
