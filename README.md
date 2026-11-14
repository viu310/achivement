# 🎮 Achievement Archive

게임별 도전과제 달성 현황을 기록하고 관리할 수 있는 개인용 게임 아카이브입니다.

게임별 도전과제 목록을 관리하고 달성 여부와 진행률을 한눈에 확인할 수 있습니다.

## 🌐 Links

- **Game Achievement Archive:** https://viu310.github.io/achivement/
- **Cloudflare API:** https://achivement-api.viu310.workers.dev/
- **GitHub Repository:** https://github.com/viu310/achivement

## ✨ Features

### Game Management
- 게임 추가, 수정 및 삭제
- 게임 이미지 업로드
- 게임 검색 및 필터링
- 게임별 도전과제 관리

### Achievement Management
- 도전과제 추가, 수정 및 삭제
- 달성 여부 체크
- 게임별 달성률 확인
- 전체 게임 진행 현황 확인

### Data Management
- GitHub Repository를 통한 데이터 저장
- 게임 이미지 및 JSON 데이터 관리
- 관리자 인증을 통한 데이터 업로드
- JSON 데이터 백업 및 복원

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Hosting | GitHub Pages |
| API | Cloudflare Workers |
| Data Storage | GitHub Repository (JSON) |
| Image Storage | GitHub Repository |
| Authentication | Cloudflare Worker Secrets |
| Version Control | Git, GitHub |

## 🏗 Architecture

```text
Browser
   |
   v
GitHub Pages
   |
   v
Cloudflare Workers
   |
   v
GitHub API
   |
   +-- Game Data (JSON)
   +-- Game Images
```

## 📁 Project Structure

```text
achivement/
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

## 📝 Purpose

개인적으로 플레이한 게임과 도전과제 달성 현황을 체계적으로 기록하고, 게임을 하나씩 완료해 나가는 과정을 관리하기 위해 제작한 프로젝트입니다.