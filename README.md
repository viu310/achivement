# Achievement Archive

게임별 도전과제 달성 현황을 기록하는 정적 웹사이트입니다.

## 실행하기
`index.html` 파일을 브라우저에서 열면 사용할 수 있습니다. VS Code에서는 Live Server 확장 프로그램으로 실행하는 것을 권장합니다.

## 주요 기능
- 게임 추가 / 수정 / 삭제
- 플랫폼 및 이미지 URL, 메모 기록
- 게임별 도전과제 추가 / 수정 / 삭제
- 달성 체크 및 달성 날짜 자동 기록
- 게임별 / 전체 달성률 자동 계산
- 게임 검색, 필터, 정렬
- LocalStorage를 이용한 브라우저 데이터 저장
- JSON 데이터 백업 및 복원

## GitHub Pages 배포
1. GitHub에서 새 Public 저장소를 만듭니다. 예: `achievement-archive`
2. 이 프로젝트의 `index.html`, `css`, `js`, `README.md`를 저장소 최상위(root)에 업로드합니다.
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Build and deployment**에서 Source를 `Deploy from a branch`로 선택합니다.
5. Branch를 `main`, 폴더를 `/(root)`로 선택하고 Save를 누릅니다.
6. 배포가 완료되면 `https://깃허브아이디.github.io/achievement-archive/`에서 접속합니다.

## 데이터 관련 주의
도전과제 데이터는 해당 브라우저의 LocalStorage에 저장됩니다. 같은 브라우저에서는 새로고침 후에도 유지되지만, 다른 기기나 브라우저와 자동 동기화되지는 않습니다. 브라우저 데이터를 지우기 전에 상단의 ↓ 버튼으로 JSON 백업을 저장하세요. 다른 기기에서는 ↑ 버튼으로 복원할 수 있습니다.

## 기술
HTML / CSS / Vanilla JavaScript (서버 및 빌드 과정 불필요)
