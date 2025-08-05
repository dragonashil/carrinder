# Carrinder Admin 개발 계획

## 1. 프로젝트 개요
Carrinder Chrome Extension의 회원 관리 및 결제 정보를 관리하는 관리자 대시보드 개발

### 기술 스택
- **Frontend**: React + TypeScript + Ant Design
- **Backend**: Firebase (Auth, Firestore, Functions, Hosting)
- **Payment**: Toss Payments API
- **Monitoring**: Firebase Analytics

## 2. 개발 계획

### Phase 1: Firebase 프로젝트 설정 (1주차)
- [ ] Firebase 프로젝트 생성
- [ ] Firebase Auth 설정 (Google OAuth)
- [ ] Firestore 데이터베이스 구조 설계
- [ ] Firebase Functions 환경 설정
- [ ] 환경 변수 설정 (개발/스테이징/프로덕션)

### Phase 2: 데이터베이스 설계 (1주차)
- [ ] Users 컬렉션 설계
  ```
  users/{userId}
  ├── email: string
  ├── name: string
  ├── googleId: string
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  └── subscription: {
      ├── plan: 'free' | 'monthly' | 'yearly'
      ├── status: 'active' | 'cancelled' | 'expired'
      ├── startDate: timestamp
      ├── endDate: timestamp
      └── paymentMethod: string
  }
  ```

- [ ] Payments 컬렉션 설계
  ```
  payments/{paymentId}
  ├── userId: string
  ├── orderId: string
  ├── amount: number
  ├── currency: string
  ├── status: 'pending' | 'completed' | 'failed'
  ├── paymentKey: string
  ├── method: string
  ├── createdAt: timestamp
  └── metadata: object
  ```

- [ ] AdminUsers 컬렉션 설계
- [ ] Firestore Security Rules 작성

### Phase 3: API 설계 (2주차)

#### Authentication APIs
```typescript
// 회원가입
POST /api/auth/register
{
  email: string,
  name: string,
  googleIdToken: string
}

// 로그인
POST /api/auth/login
{
  googleIdToken: string
}

// 토큰 갱신
POST /api/auth/refresh
{
  refreshToken: string
}

// 사용자 정보 조회
GET /api/auth/me
Headers: Authorization: Bearer {token}
```

#### Subscription APIs
```typescript
// 구독 상태 조회
GET /api/subscription/status
Headers: Authorization: Bearer {token}

// 구독 플랜 변경
PUT /api/subscription/plan
{
  plan: 'monthly' | 'yearly'
}

// 구독 취소
DELETE /api/subscription/cancel
```

#### Payment APIs
```typescript
// 결제 세션 생성
POST /api/payment/create-session
{
  plan: 'monthly' | 'yearly',
  returnUrl: string
}

// 결제 검증
POST /api/payment/verify
{
  paymentKey: string,
  orderId: string,
  amount: number
}

// 결제 내역 조회
GET /api/payment/history
```

#### Admin APIs
```typescript
// 사용자 목록 조회
GET /api/admin/users?page=1&limit=20

// 특정 사용자 정보 조회
GET /api/admin/users/{userId}

// 사용자 구독 수정
PUT /api/admin/users/{userId}/subscription
{
  plan: string,
  endDate: timestamp
}

// 대시보드 통계
GET /api/admin/dashboard/stats
```

### Phase 4: Admin Dashboard 개발 (3-4주차)

#### 페이지 구조
```
/admin
├── /login          # 관리자 로그인
├── /dashboard      # 대시보드 (통계)
├── /users          # 회원 관리
│   ├── /list       # 회원 목록
│   └── /{userId}   # 회원 상세
├── /payments       # 결제 관리
│   ├── /list       # 결제 내역
│   └── /{paymentId} # 결제 상세
├── /settings       # 설정
└── /logs           # 활동 로그
```

#### 주요 기능
- [ ] 관리자 인증 시스템
- [ ] 회원 검색/필터링
- [ ] 회원 정보 수정
- [ ] 구독 플랜 수동 변경
- [ ] 결제 내역 조회
- [ ] 환불 처리
- [ ] 통계 대시보드
  - 전체 회원수
  - 유료 회원수
  - 월별 매출
  - 이탈률

### Phase 5: Extension 연동 (5주차)

#### Chrome Extension 수정사항
```javascript
// background.js에 추가
const syncWithFirebase = async () => {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  const token = await user.getIdToken();
  chrome.storage.local.set({ 
    firebaseToken: token,
    userId: user.uid 
  });
};

// 실시간 구독 상태 리스너
firebase.firestore()
  .collection('users')
  .doc(userId)
  .onSnapshot((doc) => {
    const subscription = doc.data().subscription;
    chrome.storage.sync.set({ subscription });
  });
```

### Phase 6: 테스트 및 배포 (6주차)

#### 테스트 계획
- [ ] Unit Tests (Jest)
- [ ] Integration Tests
- [ ] E2E Tests (Cypress)
- [ ] 보안 테스트
- [ ] 부하 테스트

#### 배포 계획
- [ ] Firebase Hosting 설정
- [ ] GitHub Actions CI/CD 파이프라인
- [ ] 환경별 배포 전략
  - Development: dev.admin.carrinder.com
  - Staging: staging.admin.carrinder.com
  - Production: admin.carrinder.com
- [ ] SSL 인증서 설정
- [ ] CDN 설정
- [ ] 모니터링 설정 (Firebase Performance)

## 3. 보안 고려사항

### API 보안
- [ ] Firebase Auth로 모든 API 보호
- [ ] Admin 권한 체크 미들웨어
- [ ] Rate Limiting
- [ ] CORS 설정
- [ ] Input Validation

### 데이터 보안
- [ ] Firestore Security Rules
- [ ] 민감한 정보 암호화
- [ ] PII 데이터 최소화
- [ ] 감사 로그

## 4. 모니터링 및 운영

### 모니터링
- [ ] Firebase Analytics 설정
- [ ] Error Reporting
- [ ] Performance Monitoring
- [ ] Uptime Monitoring

### 백업 및 복구
- [ ] Firestore 자동 백업
- [ ] 복구 절차 문서화
- [ ] 재해 복구 계획

## 5. 문서화

- [ ] API 문서 (Swagger/OpenAPI)
- [ ] 관리자 사용 가이드
- [ ] 개발자 문서
- [ ] 운영 매뉴얼

## 6. 예상 일정

- **1-2주차**: Firebase 설정 및 데이터베이스 설계
- **3-4주차**: API 개발 및 테스트
- **5-6주차**: Admin Dashboard UI 개발
- **7주차**: Extension 연동 및 통합 테스트
- **8주차**: 배포 및 운영 준비

## 7. 리스크 관리

### 기술적 리스크
- Firebase 할당량 초과 → 사용량 모니터링 및 알림 설정
- 결제 시스템 장애 → Webhook 재시도 로직
- 확장 프로그램 동기화 지연 → 캐싱 전략

### 운영 리스크
- 관리자 권한 남용 → 감사 로그 및 2FA
- 데이터 유출 → 암호화 및 접근 제어
- 서비스 중단 → 장애 대응 프로세스

## 8. 추가 고려사항

- [ ] 다국어 지원 (한국어/영어)
- [ ] 대량 이메일 발송 시스템
- [ ] 쿠폰/프로모션 시스템
- [ ] A/B 테스트 인프라
- [ ] 고객 지원 티켓 시스템