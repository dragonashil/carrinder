# Environment Setup Guide

Career Manager Chrome Extension을 개발하고 배포하기 위한 환경 설정 가이드입니다.

## 1. 환경 변수 설정

### 1.1 .env 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 필요한 API 키들을 설정합니다.

```bash
# .env 파일을 .env.example을 참고하여 생성
cp .env.example .env
```

### 1.2 필수 환경 변수

#### Google OAuth 2.0 설정
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

#### Notion API 설정
```env
NOTION_TOKEN=your-notion-integration-token-here
NOTION_DATABASE_ID=your-notion-database-id-here
```

#### 개발 환경 설정
```env
NODE_ENV=development
DEBUG=true
```

## 2. Google Cloud Console 설정

### 2.1 프로젝트 생성 및 API 활성화

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 다음 API들을 활성화:
   - Google Calendar API
   - Google Drive API
   - Google Sheets API

### 2.2 OAuth 2.0 인증 정보 생성

1. **사용자 인증 정보** 페이지로 이동
2. **사용자 인증 정보 만들기** > **OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **Chrome 확장 프로그램** 선택
4. 확장 프로그램 ID 입력 (개발 중에는 임시 ID 사용 가능)
5. 생성된 클라이언트 ID와 클라이언트 보안 비밀을 `.env` 파일에 추가

### 2.3 OAuth 동의 화면 설정

1. **OAuth 동의 화면** 메뉴로 이동
2. 사용자 유형: **외부** 선택 (개발 중에는 **내부** 가능)
3. 필수 정보 입력:
   - 앱 이름: Career Manager
   - 사용자 지원 이메일
   - 개발자 연락처 정보
4. 범위 추가:
   ```
   https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/spreadsheets
   ```

## 3. Notion 설정

### 3.1 Notion 통합 생성

1. [Notion Developers](https://www.notion.so/my-integrations)에 접속
2. **새 통합** 클릭
3. 통합 정보 입력:
   - 이름: Career Manager
   - 워크스페이스 선택
   - 기능: 읽기, 쓰기, 삽입 권한 부여
4. 생성된 토큰을 `.env` 파일에 추가

### 3.2 Notion 데이터베이스 생성

1. Notion에서 새 페이지 생성
2. 데이터베이스 추가 (Table 형태)
3. 다음 속성들 생성:
   - **Title** (제목) - 제목 타입
   - **Date** (날짜) - 날짜 타입
   - **Start Time** (시작 시간) - 날짜 타입
   - **End Time** (종료 시간) - 날짜 타입
   - **Type** (유형) - 선택 타입 (Lecture, Evaluation, Mentoring)
   - **Role** (역할) - 선택 타입 (Instructor, Judge, Mentor)
   - **Location** (위치) - 텍스트 타입
   - **Description** (설명) - 텍스트 타입
   - **Source** (출처) - 텍스트 타입

4. 데이터베이스 ID 가져오기:
   - 데이터베이스 페이지 URL에서 ID 추출
   - 형태: `https://www.notion.so/database-id-here`
   - 데이터베이스 ID를 `.env` 파일에 추가

5. 통합 권한 부여:
   - 데이터베이스 페이지에서 **공유** 클릭
   - 생성한 통합 선택하여 액세스 권한 부여

## 4. 빌드 및 배포

### 4.1 개발 빌드

```bash
# 개발 환경 빌드
npm run build:dev

# 또는 파일 변경 감지 모드
npm run watch
```

### 4.2 프로덕션 빌드

```bash
# 프로덕션 환경 빌드
npm run build:prod
```

### 4.3 Chrome 확장 프로그램 로드

1. Chrome에서 `chrome://extensions/` 접속
2. **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. `build/dist` 폴더 선택

## 5. 환경 변수 보안

### 5.1 .env 파일 보안

```bash
# .env 파일을 Git에서 제외
echo ".env" >> .gitignore
```

### 5.2 프로덕션 환경 변수

프로덕션 배포 시에는 다음 방법들을 사용:

- **GitHub Actions**: Repository Secrets 사용
- **Vercel/Netlify**: 환경 변수 설정 패널 사용
- **Docker**: 환경 변수 또는 secrets 사용

## 6. 문제 해결

### 6.1 일반적인 오류

#### "Client ID not found" 오류
- `.env` 파일에 `GOOGLE_CLIENT_ID`가 올바르게 설정되었는지 확인
- manifest.json에서 클라이언트 ID가 올바르게 치환되었는지 확인

#### "Invalid redirect URI" 오류
- Google Cloud Console에서 OAuth 클라이언트 ID 설정 확인
- 확장 프로그램 ID가 올바르게 설정되었는지 확인

#### "Database not found" 오류
- Notion 데이터베이스 ID가 올바른지 확인
- 통합에 데이터베이스 액세스 권한이 부여되었는지 확인

### 6.2 디버깅

```bash
# 디버그 모드 활성화
DEBUG=true npm run build:dev
```

디버그 모드에서는 콘솔에 자세한 로그가 출력됩니다.

## 7. 배포 준비

### 7.1 Chrome 웹 스토어 배포

1. [Chrome 웹 스토어 개발자 대시보드](https://chrome.google.com/webstore/devconsole/)에 접속
2. 새 항목 추가
3. 확장 프로그램 ZIP 파일 업로드
4. 스토어 목록 정보 입력
5. 검토 제출

### 7.2 환경 변수 최종 확인

배포 전에 다음 사항들을 확인:

- [ ] 모든 API 키가 올바르게 설정됨
- [ ] 프로덕션 환경에서 DEBUG=false로 설정
- [ ] OAuth 리디렉션 URL이 올바르게 설정됨
- [ ] Notion 데이터베이스 권한이 올바르게 설정됨

---

## 참고 자료

- [Google Cloud Console 문서](https://cloud.google.com/docs)
- [Notion API 문서](https://developers.notion.com/)
- [Chrome 확장 프로그램 개발 가이드](https://developer.chrome.com/docs/extensions/)
- [OAuth 2.0 가이드](https://developers.google.com/identity/protocols/oauth2)