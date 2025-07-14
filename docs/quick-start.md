# 🚀 빠른 시작 가이드

Career Manager Chrome Extension을 5분 내에 설정하고 실행하는 방법입니다.

## 📋 준비사항

시작하기 전에 다음이 필요합니다:
- Node.js (v18 이상)
- Chrome 브라우저
- Google 계정
- Notion 계정 (선택사항)

## ⚡ 빠른 설정 (5분)

### 1️⃣ 프로젝트 클론 및 설치 (1분)

```bash
# 저장소 클론
git clone <repository-url>
cd carrinder

# 의존성 설치
npm install
```

### 2️⃣ API 키 발급 (3분)

> 💡 **상세 가이드**: [Getting API Keys](getting-keys.md)에서 자세한 설명을 확인하세요.

**Google API 키 (필수)**
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성: `career-manager-extension`
3. API 활성화: Calendar API, Drive API, Sheets API
4. OAuth 2.0 클라이언트 ID 생성 (Chrome 확장 프로그램 유형)
   - 확장 프로그램 ID: 임시로 `abcdefghijklmnopqrstuvwxyzabcdef` 입력
   - **중요**: 영문 소문자 32자로 구성
   - 나중에 실제 ID로 업데이트 가능

**Notion API 키 (선택사항)**
1. [Notion Integrations](https://www.notion.so/my-integrations) 접속
2. 새 통합 생성: `Career Manager`
3. 데이터베이스 생성 및 통합 권한 부여

### 3️⃣ 환경변수 설정 (1분)

```bash
# 대화형 설정 도구 실행
npm run setup
```

또는 수동으로:
```bash
# .env 파일 생성
cp .env.example .env

# 발급받은 키들을 .env 파일에 입력
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NOTION_TOKEN=your-notion-token
NOTION_DATABASE_ID=your-notion-database-id
```

### 4️⃣ 빌드 및 설치 (1분)

```bash
# 개발 버전 빌드
npm run build:dev

# Chrome에서 확장 프로그램 로드
# 1. chrome://extensions/ 이동
# 2. 개발자 모드 활성화
# 3. "압축해제된 확장 프로그램을 로드합니다" 클릭
# 4. build/dist 폴더 선택
```

## 🎯 첫 번째 사용

### 1. Google Calendar 연결
- 확장 프로그램 아이콘 클릭
- "Connect Google Calendar" 버튼 클릭
- 권한 승인

### 2. 이벤트 동기화
- "Sync Now" 버튼 클릭
- 캘린더에서 강의/심사/멘토링 이벤트 자동 추출

### 3. 스프레드시트 연결 (선택사항)
- "Connect Google Drive" 버튼 클릭
- "Sync to Sheets" 버튼 클릭
- 역할별 스프레드시트 자동 생성

## 📊 테스트용 샘플 이벤트

빠른 테스트를 위해 Google Calendar에 다음 이벤트들을 추가해보세요:

```
📅 오늘 14:00-15:00: "AI 기초 강의"
📅 내일 10:00-12:00: "프로젝트 심사 위원회"
📅 다음주 화요일 16:00-17:00: "신입 개발자 멘토링"
```

## 🔧 개발 모드

개발 중인 경우:

```bash
# 파일 변경 감지 모드
npm run watch

# 테스트 실행
npm test

# 코드 품질 검사
npm run lint
```

## 💡 다음 단계

설정이 완료되면 다음 문서들을 참고하세요:

- **[Development Setup](development-setup.md)**: 상세한 개발 환경 설정
- **[Environment Setup](environment-setup.md)**: 환경변수 고급 설정
- **[Getting API Keys](getting-keys.md)**: API 키 발급 상세 가이드
- **[API Reference](api-reference.md)**: API 문서

## 🚨 문제 해결

### 빌드 오류
```bash
npm run clean
npm install
npm run build:dev
```

### 인증 오류
1. Google Cloud Console에서 클라이언트 ID 확인
2. .env 파일의 값 재확인
3. `npm run build:dev` 재실행

### 캘린더 이벤트가 감지되지 않음
- 이벤트 제목에 키워드 포함 확인: "강의", "심사", "멘토링"
- 시간 범위 설정 확인 (기본: 최근 6개월)

---

## 📞 도움이 필요하신가요?

- 📖 **전체 문서**: [Getting API Keys](getting-keys.md)
- 🐛 **버그 리포트**: [GitHub Issues](https://github.com/your-username/carrinder/issues)
- 💬 **질문**: [Discussions](https://github.com/your-username/carrinder/discussions)

**즐거운 개발 되세요! 🎉**