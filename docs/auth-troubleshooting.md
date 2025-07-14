# 인증 문제 해결 가이드

Chrome Extension 인증 문제를 단계별로 해결하는 방법입니다.

## 🔍 오류 진단

### 1. 확장 프로그램 ID 확인
```
chrome://extensions/ → Career Manager → ID 복사
```

### 2. 개발자 도구에서 오류 확인
```javascript
// 팝업 오류 확인
우클릭 → "팝업 검사" → Console 탭

// 백그라운드 스크립트 오류 확인
chrome://extensions/ → "Service Worker" 클릭 → Console 탭
```

## 🚨 일반적인 오류들

### 오류 1: "The OAuth client was not found"
```
Error: The OAuth client was not found
```

**원인:** 확장 프로그램 ID가 Google Cloud Console 설정과 다름

**해결방법:**
1. 확장 프로그램의 실제 ID 확인
2. Google Cloud Console → 사용자 인증 정보 → OAuth 클라이언트 ID 편집
3. 확장 프로그램 ID를 실제 ID로 변경

### 오류 2: "Error: Redirect URI mismatch"
```
Error: redirect_uri_mismatch
```

**원인:** Chrome 확장 프로그램 유형이 아닌 다른 유형으로 OAuth 생성

**해결방법:**
1. Google Cloud Console에서 새 OAuth 클라이언트 ID 생성
2. 애플리케이션 유형을 "Chrome 확장 프로그램"으로 선택
3. 올바른 확장 프로그램 ID 입력

### 오류 3: "API key not valid"
```
Error: API key not valid. Please pass a valid API key.
```

**원인:** API가 활성화되지 않았거나 잘못된 클라이언트 ID

**해결방법:**
1. Google Cloud Console → API 및 서비스 → 라이브러리
2. 다음 API들이 "사용" 상태인지 확인:
   - Google Calendar API
   - Google Drive API
   - Google Sheets API

### 오류 4: "User not authorized"
```
Error: The user does not have permission
```

**원인:** OAuth 동의 화면에서 테스트 사용자 미등록

**해결방법:**
1. Google Cloud Console → OAuth 동의 화면
2. 테스트 사용자에 본인 이메일 추가
3. 필요한 범위(scope) 확인

### 오류 5: "Extension ID mismatch"
```
Error: Extension ID does not match
```

**원인:** 매니페스트의 클라이언트 ID와 실제 설정 불일치

**해결방법:**
1. `.env` 파일의 `GOOGLE_CLIENT_ID` 값 확인
2. `npm run build:dev` 재실행
3. Chrome에서 확장 프로그램 새로고침

## 🔧 단계별 해결 과정

### Step 1: 기본 설정 확인
```bash
# 1. .env 파일 확인
cat .env

# 2. 빌드 재실행
npm run build:dev

# 3. manifest.json에서 클라이언트 ID 확인
cat build/dist/manifest.json | grep client_id
```

### Step 2: Google Cloud Console 설정 확인
1. **프로젝트 선택** 확인
2. **API 활성화** 상태 확인
3. **OAuth 동의 화면** 설정 확인
4. **OAuth 클라이언트 ID** 설정 확인

### Step 3: 확장 프로그램 새로고침
```
chrome://extensions/ → Career Manager → 새로고침 버튼 클릭
```

### Step 4: 인증 테스트
1. 확장 프로그램 아이콘 클릭
2. "Connect Google Calendar" 버튼 클릭
3. 오류 메시지 확인

## 📋 체크리스트

### Google Cloud Console 설정
- [ ] 올바른 프로젝트 선택됨
- [ ] Google Calendar API 활성화됨
- [ ] Google Drive API 활성화됨
- [ ] Google Sheets API 활성화됨
- [ ] OAuth 동의 화면 설정 완료
- [ ] 테스트 사용자 추가됨
- [ ] OAuth 클라이언트 ID 생성됨
- [ ] 애플리케이션 유형이 "Chrome 확장 프로그램"임
- [ ] 확장 프로그램 ID가 실제 ID와 일치함

### 환경 설정
- [ ] `.env` 파일에 올바른 `GOOGLE_CLIENT_ID` 입력됨
- [ ] `npm run build:dev` 실행됨
- [ ] `build/dist/manifest.json`에 클라이언트 ID 주입됨
- [ ] Chrome에서 확장 프로그램 새로고침됨

### 권한 설정
- [ ] manifest.json에 필요한 permissions 포함됨:
  - `identity`
  - `storage` 
  - `activeTab`
  - `tabs`
- [ ] host_permissions에 Google API 도메인 포함됨

## 🆘 여전히 문제가 있다면

### 로그 수집
```javascript
// 백그라운드 스크립트에서 실행
console.log('Extension ID:', chrome.runtime.id);
console.log('Manifest:', chrome.runtime.getManifest());
```

### 수동 인증 테스트
```javascript
// 개발자 도구 Console에서 실행
chrome.identity.getAuthToken({
  interactive: true,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly']
}, (token) => {
  console.log('Token:', token);
  console.log('Error:', chrome.runtime.lastError);
});
```

### 디버깅 정보 확인
1. 확장 프로그램 ID: `chrome.runtime.id`
2. 매니페스트 내용: `chrome.runtime.getManifest()`
3. 네트워크 요청: 개발자 도구 Network 탭

---

이 가이드를 따라도 문제가 해결되지 않으면 다음 정보와 함께 문의하세요:
- 확장 프로그램 ID
- 정확한 오류 메시지
- Google Cloud Console 설정 스크린샷
- 개발자 도구 Console 로그