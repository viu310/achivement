# 🎮 Game Achievement Archive

게임 도전과제와 수집 현황을 기록하고 관리할 수 있는 개인용 게임 아카이브입니다.

게임별 도전과제 목록을 관리하고, 달성 여부와 진행률을 한눈에 확인할 수 있습니다. 게임 이미지와 도전과제 데이터는 GitHub 저장소에 저장되며, Cloudflare Workers를 통해 안전하게 관리합니다.

## 🌐 Demo

**[Game Achievement Archive 바로가기](https://viu310.github.io/achievement/)**

**[Cloudflare API](https://achivement-api.viu310.workers.dev/)**

## ✨ 주요 기능

### 게임 관리
- 게임 추가, 수정 및 삭제
- 게임 이미지 업로드
- 게임별 도전과제 관리
- 게임 검색 및 필터링

### 도전과제 관리
- 도전과제 추가, 수정 및 삭제
- 달성 여부 체크
- 게임별 도전과제 달성률 확인
- 전체 게임의 진행 현황 확인

### 데이터 관리
- GitHub 저장소를 통한 데이터 영구 저장
- 게임 이미지 및 JSON 데이터 관리
- Cloudflare Workers API 연동
- 관리자 인증을 통한 데이터 업로드
- JSON 데이터 백업 및 복원

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Hosting | GitHub Pages |
| Backend API | Cloudflare Workers |
| Database | GitHub Repository (JSON) |
| Image Storage | GitHub Repository |
| Authentication | Cloudflare Worker Secrets |
| Version Control | Git, GitHub |

## 🏗 Architecture

```text
[ Browser ]
     |
     v
[ GitHub Pages ]
     |
     v
[ Cloudflare Workers ]
     |
     | 관리자 인증
     | GitHub API 요청
     v
[ GitHub Repository ]
     |
     +-- data/games.json
     |
     +-- images/
```

## 📁 Project Structure

```text
achievement/
├── index.html
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── cloud-config.js
└── worker/
    ├── index.js
    └── wrangler.toml
```

## 🔐 Security

- GitHub Personal Access Token은 Cloudflare Worker Secret으로 관리합니다.
- 관리자 비밀번호 역시 Worker Secret으로 관리합니다.
- 브라우저 코드에 GitHub 인증 토큰을 직접 포함하지 않습니다.
- 허용된 Origin에서만 API 요청을 처리하도록 CORS를 설정합니다.

## 🚀 Deployment

- Frontend: GitHub Pages
- API: Cloudflare Workers
- Data: GitHub Repository

Cloudflare Worker에 GitHub 저장소 정보와 인증 Secret을 설정하여 데이터 저장 요청을 처리합니다.

## 📝 Purpose

개인적으로 플레이한 게임과 도전과제 달성 현황을 체계적으로 기록하기 위해 제작한 프로젝트입니다.

게임별 진행 상황을 관리하고, 하나씩 도전과제를 완료해 나가는 과정을 기록하는 것을 목표로 합니다.