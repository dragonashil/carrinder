# API 키 및 토큰 발급 가이드

Career Manager Chrome Extension 개발을 위해 필요한 모든 API 키와 토큰을 발급받는 방법을 단계별로 안내합니다.

## 📋 필요한 API 키/토큰 목록

- **Google Client ID** - Google OAuth 2.0 인증용
- **Google Client Secret** - Google OAuth 2.0 인증용
- **Notion Token** - Notion API 연동용
- **Notion Database ID** - Notion 데이터베이스 연동용

---

## 🔑 1. Google Cloud Console 설정

### 1.1 Google Cloud Console 프로젝트 생성

1. **Google Cloud Console 접속**
   - [https://console.cloud.google.com/](https://console.cloud.google.com/)에 접속
   - Google 계정으로 로그인

2. **새 프로젝트 생성**
   - 상단 프로젝트 선택 드롭다운 클릭
   - "새 프로젝트" 클릭
   - 프로젝트 정보 입력:
     - **프로젝트 이름**: `career-manager-extension`
     - **조직**: (선택사항)
     - **위치**: (선택사항)
   - "만들기" 클릭

3. **프로젝트 선택**
   - 생성된 프로젝트가 자동으로 선택됨
   - 상단에 프로젝트 이름이 표시되는지 확인

### 1.2 필요한 API 활성화

1. **API 및 서비스 페이지 이동**
   - 왼쪽 메뉴에서 "API 및 서비스" > "라이브러리" 클릭

2. **Google Calendar API 활성화**
   - 검색창에 "Google Calendar API" 입력
   - "Google Calendar API" 클릭
   - "사용" 버튼 클릭
   - 활성화 완료까지 잠시 대기

3. **Google Drive API 활성화**
   - 검색창에 "Google Drive API" 입력
   - "Google Drive API" 클릭
   - "사용" 버튼 클릭

4. **Google Sheets API 활성화**
   - 검색창에 "Google Sheets API" 입력
   - "Google Sheets API" 클릭
   - "사용" 버튼 클릭

### 1.3 OAuth 동의 화면 설정

1. **OAuth 동의 화면 페이지 이동**
   - 왼쪽 메뉴에서 "API 및 서비스" > "OAuth 동의 화면" 클릭

2. **사용자 유형 선택**
   - **외부**: 모든 Google 사용자가 사용 가능 (권장)
   - **내부**: 조직 내부 사용자만 사용 가능
   - "외부" 선택 후 "만들기" 클릭

3. **앱 정보 입력**
   - **앱 이름**: `Career Manager`
   - **사용자 지원 이메일**: 본인 이메일 주소
   - **앱 로고**: (선택사항) 확장 프로그램 아이콘 업로드
   - **앱 도메인**: (선택사항)
   - **승인된 도메인**: (선택사항)
   - **개발자 연락처 정보**: 본인 이메일 주소
   - "저장 후 계속" 클릭

4. **범위 설정**
   - "범위 추가 또는 삭제" 클릭
   - 다음 범위들을 추가:
     ```
     https://www.googleapis.com/auth/calendar.readonly
     https://www.googleapis.com/auth/drive.file
     https://www.googleapis.com/auth/spreadsheets
     ```
   - 각 범위를 검색하여 선택
   - "업데이트" 클릭
   - "저장 후 계속" 클릭

5. **테스트 사용자 추가 (개발 중)**
   - "테스트 사용자 추가" 클릭
   - 개발 및 테스트에 사용할 이메일 주소 입력
   - "저장 후 계속" 클릭

### 1.4 OAuth 2.0 클라이언트 ID 생성

1. **사용자 인증 정보 페이지 이동**
   - 왼쪽 메뉴에서 "API 및 서비스" > "사용자 인증 정보" 클릭

2. **OAuth 2.0 클라이언트 ID 생성**
   - 상단 "+ 사용자 인증 정보 만들기" 클릭
   - "OAuth 클라이언트 ID" 선택

3. **애플리케이션 유형 설정**
   - **애플리케이션 유형**: "Chrome 확장 프로그램" 선택
   - **이름**: `Career Manager Chrome Extension`

4. **확장 프로그램 ID 설정**
   
   > ⚠️ **중요**: 확장 프로그램을 먼저 출시할 필요 없습니다!
   
   **개발 단계에서 확장 프로그램 ID를 얻는 방법:**
   
   **A. 개발용 임시 ID 사용 (권장)**
   - Chrome에서 개발자 모드로 확장 프로그램을 로드하면 자동으로 ID가 생성됩니다
   - 먼저 임시 ID로 OAuth 설정 후, 나중에 실제 ID로 업데이트
   - **임시 ID**: `abcdefghijklmnopqrstuvwxyzabcdef` (영문 소문자 32자)
   
   **B. 개발 중 실제 ID 확인 방법:**
   1. `npm run build:dev` 실행
   2. Chrome에서 `chrome://extensions/` 이동
   3. 개발자 모드 활성화
   4. "압축해제된 확장 프로그램을 로드합니다" 클릭
   5. `build/dist` 폴더 선택
   6. 로드된 확장 프로그램의 ID 복사 (예: `abcdefghijklmnopqrstuvwxyzabcdef`)
   7. Google Cloud Console에서 OAuth 클라이언트 ID 편집하여 실제 ID로 업데이트
   
   > 📋 **확장 프로그램 ID 규칙**:
   > - 정확히 32자 길이
   > - 영문 소문자만 사용 (a-z)
   > - 숫자나 특수문자 사용 불가

5. **클라이언트 ID 생성**
   - "만들기" 클릭
   - 생성된 클라이언트 ID와 클라이언트 보안 비밀 복사
   - 안전한 곳에 저장

### 1.5 API 키 생성 (선택사항)

1. **API 키 생성**
   - 상단 "+ 사용자 인증 정보 만들기" 클릭
   - "API 키" 선택
   - 생성된 API 키 복사

2. **API 키 제한 설정**
   - 생성된 API 키 옆 편집 아이콘 클릭
   - **애플리케이션 제한사항**: "HTTP 리퍼러(웹사이트)" 선택
   - **웹사이트 제한사항**: `chrome-extension://*` 입력
   - **API 제한사항**: "키 제한" 선택
   - 활성화된 API들만 선택
   - "저장" 클릭

### 1.6 개발 워크플로우 (권장)

Chrome 확장 프로그램 개발 시 권장하는 단계별 워크플로우:

#### 🔄 **Phase 1: 임시 설정으로 개발 시작**
1. **임시 확장 프로그램 ID 사용**
   - OAuth 클라이언트 ID 생성 시 임시 ID 입력: `abcdefghijklmnopqrstuvwxyzabcdef`
   - 영문 소문자 32자 규칙 준수
   - 이 단계에서 바로 개발 시작 가능

2. **개발 환경 설정**
   ```bash
   npm run setup  # 환경변수 설정
   npm run build:dev  # 빌드
   ```

3. **Chrome에서 테스트**
   - `chrome://extensions/`에서 확장 프로그램 로드
   - 기본 기능 테스트 및 개발

#### 🔄 **Phase 2: 실제 ID로 업데이트**
1. **실제 확장 프로그램 ID 확인**
   - Chrome 개발자 모드에서 로드된 확장 프로그램 ID 복사
   - 형태: `abcdefghijklmnopqrstuvwxyzabcdef` (영문 소문자 32자)

2. **OAuth 설정 업데이트**
   - Google Cloud Console > 사용자 인증 정보
   - 생성한 OAuth 클라이언트 ID 편집
   - 확장 프로그램 ID를 실제 ID로 변경

3. **최종 테스트**
   - 인증 플로우 정상 동작 확인
   - API 호출 테스트

#### 🔄 **Phase 3: 출시 준비**
1. **Chrome 웹 스토어 개발자 등록**
   - 개발자 등록비 $5 결제
   - 확장 프로그램 업로드

2. **OAuth 설정 최종 확인**
   - 웹 스토어 리뷰 통과 시 확장 프로그램 ID 변경 가능성 확인
   - 필요시 OAuth 설정 재업데이트

> 💡 **팁**: 대부분의 개발 작업은 Phase 1의 임시 ID만으로도 충분히 진행 가능합니다!

---

## 📝 2. Notion API 설정

### 2.1 Notion 통합 생성

1. **Notion 개발자 페이지 접속**
   - [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)에 접속
   - Notion 계정으로 로그인

2. **새 통합 생성**
   - "새 통합" 버튼 클릭
   - 통합 정보 입력:
     - **이름**: `Career Manager`
     - **로고**: (선택사항) 확장 프로그램 아이콘 업로드
     - **연결된 워크스페이스**: 사용할 워크스페이스 선택

3. **기능 설정**
   - **콘텐츠 기능**:
     - ✅ 읽기 콘텐츠
     - ✅ 업데이트 콘텐츠
     - ✅ 콘텐츠 삽입
   - **댓글 기능**: (선택사항)
   - **사용자 정보**: (선택사항)

4. **통합 생성**
   - "제출" 클릭
   - 생성된 **Internal Integration Token** 복사
   - 형태: `secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### 2.2 Notion 데이터베이스 생성

1. **새 페이지 생성**
   - Notion 워크스페이스에서 "새 페이지" 클릭
   - 페이지 제목: `Career Events Database`

2. **데이터베이스 추가**
   - 페이지 내에서 `/database` 타이핑
   - "Table - Full page" 선택
   - 데이터베이스 이름: `Career Events`

3. **데이터베이스 속성 설정**
   - 기본 "Name" 속성을 "Title"로 변경
   - 다음 속성들을 추가:

   | 속성 이름 | 속성 타입 | 설명 |
   |-----------|-----------|------|
   | **Title** | 제목 | 이벤트 제목 |
   | **Date** | 날짜 | 이벤트 날짜 |
   | **Start Time** | 날짜 | 시작 시간 |
   | **End Time** | 날짜 | 종료 시간 |
   | **Type** | 선택 | 이벤트 유형 |
   | **Role** | 선택 | 역할 |
   | **Subcategory** | 선택 | 세부 카테고리 |
   | **Location** | 텍스트 | 위치 |
   | **Description** | 텍스트 | 설명 |
   | **Source** | 텍스트 | 출처 |
   | **Created At** | 날짜 | 생성일 |

4. **Type 속성 옵션 설정**
   - Type 속성 클릭 > "옵션 편집"
   - 다음 옵션들 추가:
     - `Lecture` (파란색)
     - `Evaluation` (주황색)
     - `Mentoring` (초록색)
     - `Other` (회색)

5. **Role 속성 옵션 설정**
   - Role 속성 클릭 > "옵션 편집"
   - 다음 옵션들 추가:
     - `Instructor` (파란색)
     - `Judge` (주황색)
     - `Mentor` (초록색)
     - `Other` (회색)

### 2.3 데이터베이스 ID 가져오기

1. **데이터베이스 URL 복사**
   - 데이터베이스 페이지 상단 "공유" 클릭
   - "링크 복사" 클릭
   - URL 형태: `https://www.notion.so/workspace-name/database-name-32자리ID?v=view-id`

2. **데이터베이스 ID 추출**
   - URL에서 32자리 ID 부분 복사
   - 하이픈(-) 제거
   - 형태: `12345678123456781234567812345678`

### 2.4 통합 권한 부여

1. **데이터베이스 공유 설정**
   - 데이터베이스 페이지에서 "공유" 클릭
   - "사용자, 이메일, 그룹 또는 통합 초대" 클릭
   - 생성한 통합 이름 입력 (예: `Career Manager`)
   - 통합 선택 후 "초대" 클릭

2. **권한 확인**
   - 공유 설정에서 통합이 "편집 가능" 권한을 가지고 있는지 확인
   - 필요시 권한 수정

---

## 🔧 3. 환경변수 설정

### 3.1 .env 파일 생성

1. **프로젝트 루트 디렉토리에서 .env 파일 생성**
   ```bash
   # 자동 설정 도구 사용
   npm run setup
   
   # 또는 수동으로 .env 파일 생성
   cp .env.example .env
   ```

2. **발급받은 키들을 .env 파일에 입력**
   ```env
   # Google OAuth 2.0 설정
   GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret-here
   
   # Notion API 설정
   NOTION_TOKEN=secret_AbCdEfGhIjKlMnOpQrStUvWxYz123456789012345678901234567890
   NOTION_DATABASE_ID=12345678123456781234567812345678
   
   # 개발 환경 설정
   NODE_ENV=development
   DEBUG=true
   
   # Chrome Extension 설정
   EXTENSION_ID=abcdefghijklmnopqrstuvwxyz123456
   ```

### 3.2 설정 확인

1. **빌드 테스트**
   ```bash
   npm run build:dev
   ```

2. **manifest.json 확인**
   - `build/dist/manifest.json` 파일 열기
   - `oauth2.client_id` 값이 올바르게 설정되었는지 확인

---

## 🚨 4. 문제 해결

### 4.1 Google Cloud Console 관련 오류

#### "API가 활성화되지 않음" 오류
```bash
Error: Google Calendar API has not been used in project
```
**해결 방법:**
1. Google Cloud Console > API 및 서비스 > 라이브러리
2. 해당 API 검색 후 "사용" 버튼 클릭
3. 활성화 완료까지 2-3분 대기

#### "할당량 초과" 오류
```bash
Error: Quota exceeded for quota metric 'calendar'
```
**해결 방법:**
1. Google Cloud Console > API 및 서비스 > 할당량
2. 해당 API 할당량 확인
3. 필요시 할당량 증가 요청

#### "잘못된 클라이언트 ID" 오류
```bash
Error: The OAuth client was not found
```
**해결 방법:**
1. .env 파일의 GOOGLE_CLIENT_ID 값 확인
2. Google Cloud Console에서 올바른 클라이언트 ID 복사
3. manifest.json에서 클라이언트 ID 업데이트 확인

### 4.2 Notion API 관련 오류

#### "권한 없음" 오류
```bash
Error: object_not_found
```
**해결 방법:**
1. Notion 데이터베이스 공유 설정 확인
2. 통합이 올바른 권한을 가지고 있는지 확인
3. 데이터베이스 ID가 올바른지 확인

#### "잘못된 토큰" 오류
```bash
Error: Unauthorized
```
**해결 방법:**
1. Notion 통합 페이지에서 토큰 재생성
2. .env 파일의 NOTION_TOKEN 값 업데이트
3. 토큰이 `secret_`로 시작하는지 확인

#### "데이터베이스를 찾을 수 없음" 오류
```bash
Error: Could not find database
```
**해결 방법:**
1. 데이터베이스 URL에서 ID 다시 추출
2. 하이픈(-) 제거했는지 확인
3. 데이터베이스가 삭제되지 않았는지 확인

### 4.3 Chrome Extension 관련 오류

#### "매니페스트 오류" 오류
```bash
Error: Required value 'oauth2.client_id' is missing
```
**해결 방법:**
1. `npm run build:dev` 다시 실행
2. `build/dist/manifest.json` 파일 확인
3. 빌드 프로세스에서 환경변수 주입 확인

#### "권한 오류" 오류
```bash
Error: Extension does not have permission
```
**해결 방법:**
1. manifest.json의 permissions 섹션 확인
2. host_permissions 설정 확인
3. Chrome 확장 프로그램 권한 재설정

---

## ❓ 자주 묻는 질문 (FAQ)

### Q1. 확장 프로그램을 먼저 출시해야 OAuth 클라이언트 ID를 만들 수 있나요?

**A: 아니요! 출시 전에도 OAuth 설정이 가능합니다.**

- **개발 단계**: 임시 ID (`abcdefghijklmnopqrstuvwxyzabcdef`)로 OAuth 설정
- **테스트 단계**: Chrome 개발자 모드로 로드 후 실제 ID 확인하여 업데이트
- **출시 단계**: 웹 스토어 리뷰 후 필요시 최종 ID로 재업데이트

### Q2. 임시 ID로 OAuth를 설정하면 나중에 문제가 생기나요?

**A: 아니요! 언제든지 업데이트 가능합니다.**

- OAuth 클라이언트 ID는 언제든지 편집 가능
- 확장 프로그램 ID만 업데이트하면 됨
- 다른 설정들은 유지됨

### Q3. 확장 프로그램 ID는 어떻게 생성되나요?

**A: Chrome이 자동으로 생성합니다.**

- 확장 프로그램을 Chrome에 로드할 때 자동 생성
- **정확히 32자 영문 소문자 조합** (a-z만 사용)
- 숫자나 특수문자 포함 불가
- 매번 같은 폴더를 로드하면 같은 ID 유지

> ⚠️ **주의**: OAuth 설정 시 반드시 영문 소문자 32자 규칙을 지켜야 합니다!

### Q4. 개발 중인 확장 프로그램의 ID를 확인하는 방법은?

**A: Chrome 확장 프로그램 페이지에서 확인 가능합니다.**

```bash
# 1. 빌드
npm run build:dev

# 2. Chrome에서 확인
chrome://extensions/
→ 개발자 모드 활성화
→ 확장 프로그램 로드
→ ID 확인 (확장 프로그램 카드 하단에 표시)
```

### Q5. 웹 스토어 출시 후 ID가 변경되나요?

**A: 대부분의 경우 변경되지 않습니다.**

- 개발자 모드의 ID와 웹 스토어 ID는 보통 다름
- 하지만 OAuth 설정은 간단히 업데이트 가능
- 출시 전에 최종 확인 권장

### Q6. 여러 개발자가 함께 작업할 때는 어떻게 하나요?

**A: 각자 다른 확장 프로그램 ID를 가질 수 있습니다.**

- 각 개발자마다 다른 ID 생성됨
- 개발용 OAuth 클라이언트 ID 별도 생성 권장
- 또는 하나의 OAuth 설정에 여러 ID 추가 가능

### Q7. 테스트 사용자 설정이 필요한가요?

**A: 개발 단계에서는 필요합니다.**

- OAuth 동의 화면에서 테스트 사용자 추가
- 개발자 본인과 테스터 이메일 등록
- 웹 스토어 출시 후에는 모든 사용자 접근 가능

### Q8. 확장 프로그램 ID가 영문 소문자 32자가 아니면 어떻게 되나요?

**A: OAuth 인증이 실패합니다.**

- Google Cloud Console에서 "잘못된 형식" 오류 발생
- Chrome 확장 프로그램에서 인증 팝업이 열리지 않음
- 반드시 `abcdefghijklmnopqrstuvwxyzabcdef` 형태로 입력 필요

**올바른 형식 예시:**
- ✅ `abcdefghijklmnopqrstuvwxyzabcdef` (영문 소문자 32자)
- ❌ `abcdefghijklmnopqrstuvwxyz123456` (숫자 포함)
- ❌ `ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEF` (대문자 포함)
- ❌ `abcdefghijklmnopqrstuvwxyz-abcdef` (하이픈 포함)

---

## 📚 5. 추가 참고 자료

### 5.1 공식 문서
- [Google Cloud Console 문서](https://cloud.google.com/docs/authentication)
- [Google Calendar API 문서](https://developers.google.com/calendar/api)
- [Google Drive API 문서](https://developers.google.com/drive/api)
- [Notion API 문서](https://developers.notion.com/)
- [Chrome Extension 개발 가이드](https://developer.chrome.com/docs/extensions/)

### 5.2 유용한 도구
- [JWT 디버거](https://jwt.io/) - 토큰 디버깅
- [Postman](https://www.postman.com/) - API 테스트
- [Chrome 개발자 도구](https://developer.chrome.com/docs/devtools/) - 확장 프로그램 디버깅

### 5.3 보안 주의사항
- API 키와 토큰을 절대 코드에 하드코딩하지 마세요
- .env 파일을 Git 저장소에 커밋하지 마세요
- 프로덕션 환경에서는 환경변수를 안전하게 관리하세요
- 정기적으로 API 키를 재생성하세요

---

## ✅ 설정 완료 체크리스트

- [ ] Google Cloud Console 프로젝트 생성
- [ ] Google Calendar API 활성화
- [ ] Google Drive API 활성화
- [ ] Google Sheets API 활성화
- [ ] OAuth 동의 화면 설정
- [ ] OAuth 2.0 클라이언트 ID 생성
- [ ] Notion 통합 생성
- [ ] Notion 데이터베이스 생성
- [ ] 데이터베이스 권한 부여
- [ ] .env 파일 생성 및 설정
- [ ] 빌드 테스트 성공
- [ ] Chrome 확장 프로그램 로드 테스트

모든 단계를 완료했다면 `npm run build:dev` 명령어로 빌드하고 Chrome에서 확장 프로그램을 테스트해보세요!

---

**문제가 발생하면:**
1. 이 문서의 문제 해결 섹션 참고
2. 공식 문서 확인
3. GitHub Issues에 문제 상황 보고