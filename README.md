# Achievement Archive — 개인용 GitHub Cloud Sync

개인 관리자 한 명이 게임과 도전과제를 관리하는 아카이브입니다.

- 게임/도전과제 데이터: GitHub 저장소의 `data/games.json`
- 게임 이미지: GitHub 저장소의 `images/*.webp`
- 웹사이트: GitHub Pages
- 저장 중계 및 관리자 인증: Cloudflare Worker
- GitHub 토큰: Cloudflare Worker Secret에만 보관

> **공개 저장소 주의:** GitHub 저장소가 Public이면 게임 목록과 이미지도 인터넷에 공개됩니다. 관리자 비밀번호는 수정 권한만 보호하며 데이터를 비공개로 만들지는 않습니다. 데이터까지 비공개로 하려면 저장소와 Pages 접근도 Private으로 설계해야 하며, 계정/플랜의 Pages 지원 여부를 확인해야 합니다.

## 폴더 구조

```text
achievement-archive/
├── index.html
├── css/style.css
├── js/
│   ├── cloud-config.js
│   └── app.js
└── worker/
    ├── index.js
    └── wrangler.toml
```

첫 저장 시 Worker가 `data/games.json`과 `images/` 파일을 생성합니다.

## 1. GitHub 저장소 준비

1. GitHub에서 `achievement-archive` 저장소를 준비합니다. 기존 저장소를 사용해도 됩니다.
2. 프로젝트 안의 `index.html`, `css`, `js`, `worker`를 저장소 최상위에 올립니다.
3. 저장소 Settings → Pages → Build and deployment에서 `Deploy from a branch`를 선택합니다.
4. Branch는 `main`, 폴더는 `/(root)`로 설정하고 저장합니다.
5. Pages 주소를 확인합니다. 예: `https://깃허브아이디.github.io/achievement-archive/`

## 2. GitHub Fine-grained 토큰 생성

1. GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token으로 이동합니다.
2. Resource owner는 본인 계정으로 선택합니다.
3. Repository access는 `Only select repositories`로 설정하고 이 아카이브 저장소 하나만 선택합니다.
4. Repository permissions에서 `Contents`를 `Read and write`로 설정합니다.
5. 토큰을 생성합니다.

**토큰을 `app.js`, `cloud-config.js`, HTML 또는 저장소에 넣지 마세요.** 다음 단계에서 Cloudflare Worker Secret으로만 등록합니다.

## 3. Cloudflare Worker 배포

1. Cloudflare 대시보드 → Workers & Pages → Create → Worker를 생성합니다.
2. Worker 이름을 `achievement-archive-api`로 지정합니다.
3. `worker/index.js` 전체 내용을 Worker 편집기에 붙여넣고 Deploy합니다.
4. Worker Settings → Variables and Secrets에서 다음 값을 설정합니다.

| 이름 | 값 | 유형 |
|---|---|---|
| `GITHUB_OWNER` | GitHub 사용자명 | Variable |
| `GITHUB_REPO` | 저장소 이름 | Variable |
| `GITHUB_BRANCH` | `main` | Variable |
| `ALLOWED_ORIGINS` | `https://깃허브아이디.github.io` | Variable |
| `GITHUB_TOKEN` | Fine-grained 토큰 | **Secret** |
| `ADMIN_PASSWORD` | 별도로 만든 강력한 관리자 비밀번호 | **Secret** |

`ALLOWED_ORIGINS`에는 경로를 빼고 Origin만 넣습니다. 예: `https://viu310.github.io`. 로컬 Live Server 테스트도 필요하면 `https://깃허브아이디.github.io,http://127.0.0.1:5500`처럼 쉼표로 구분해 추가합니다.

5. Worker를 다시 Deploy하고 주소를 확인합니다. 예: `https://achievement-archive-api.<계정>.workers.dev`

## 4. 사이트와 Worker 연결

`js/cloud-config.js`에 Worker 주소를 입력합니다.

```js
window.ARCHIVE_API_URL = "https://achievement-archive-api.<계정>.workers.dev";
```

저장한 뒤 GitHub에 커밋/푸시합니다. Pages 배포가 완료되면 사이트에 접속합니다.

## 5. 사용 방법

- 사이트 접속 시 GitHub의 `data/games.json`을 불러옵니다.
- 게임/도전과제 추가, 수정, 삭제 및 달성 체크는 GitHub에 저장됩니다.
- JPG/PNG/WEBP 파일을 선택하면 브라우저에서 긴 변 900px 이하 WEBP로 변환한 뒤 GitHub `images/`에 업로드합니다.
- 첫 쓰기 작업에서 `ADMIN_PASSWORD`를 입력합니다. 비밀번호는 현재 탭의 `sessionStorage`에만 저장되며 탭 세션이 끝나면 다시 입력해야 합니다.
- 저장에 실패하면 변경사항은 브라우저에 임시 보관되고, 다음 접속 시 GitHub로 다시 저장할지 선택할 수 있습니다.
- JSON 백업/복원 기능도 유지됩니다.

## 데이터 위치

- 게임/도전과제: `data/games.json`
- 이미지: `images/<게임이름>-<시간값>.webp`

GitHub에 커밋되므로 다른 기기에서도 동일한 데이터를 볼 수 있습니다.

## 보안 및 운영 주의사항

- 개인 관리자 비밀번호는 다른 서비스에서 사용하지 않는 긴 비밀번호로 설정하세요.
- GitHub 토큰은 반드시 Cloudflare Secret으로 저장하세요. 브라우저 코드에 넣으면 안 됩니다.
- Worker는 `ALLOWED_ORIGINS`에 등록된 브라우저 출처만 허용합니다.
- 저장소가 Public이면 데이터도 Public입니다. 관리자 비밀번호는 쓰기 작업만 보호합니다.
- 변경할 때마다 GitHub 커밋이 생성됩니다.
- 여러 기기에서 동시에 편집하면 마지막 저장이 앞선 변경을 덮어쓸 수 있으므로 한 번에 한 기기에서 수정하는 것을 권장합니다.
- 최초 Worker 배포, 토큰 발급 및 Secret 설정은 소유자 계정에서 직접 해야 합니다.

## 로컬 실행

VS Code Live Server로 실행하세요. `file://`로 직접 열면 브라우저 보안 정책 때문에 API 호출이 제한될 수 있습니다. 로컬 테스트 시 `ALLOWED_ORIGINS`에 Live Server Origin을 추가해야 합니다.
